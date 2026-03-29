from fastapi import APIRouter, HTTPException, Header, Body, BackgroundTasks
from models.admin_model import Admin
from models.pending_user_model import PendingUser
from models.user_model import User
from utils.dynamo_client import get_table, ensure_table
from utils.auth import decode_jwt
from utils.email_utils import send_approval_email, send_rejection_email
from boto3.dynamodb.conditions import Key, Attr
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()

def _require_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid.")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token is empty.")
    return token

# === DynamoDB tables ===
admins_table = get_table("ApprovedAdmin")
pending_admins_table = get_table("PendingAdmins")
pending_users_table = get_table("PendingUsers")
approved_users_table = get_table("ApprovedUser")
projects_table = get_table("Projects")
company_project_access_table = get_table("CompanyProjectAccess")
ensure_table("PendingProfileUpdates", "request_id")
pending_profile_updates_table = get_table("PendingProfileUpdates")
ensure_table("UserNotifications", "notification_id")
notifications_table = get_table("UserNotifications")

# ---------------------------
# Admin Registration & Profile
# ---------------------------

@router.post("/register")
def register_admin(admin: Admin):
    admin.admin_id = str(uuid.uuid4())
    pending_admins_table.put_item(Item=admin.dict())
    return {"message": "Admin registered", "admin_id": admin.admin_id}

@router.get("/admins")
def get_all_admins(Authorization: Optional[str] = Header(None), status: str = None):
    """Return approved admins scoped to the caller's company (Hydroleap sees all)."""
    token = _require_token(Authorization)
    payload = decode_jwt(token)
    caller_email = payload.get("email", "")
    caller = admins_table.scan(FilterExpression=Attr("email").eq(caller_email)).get("Items", [])
    if not caller:
        raise HTTPException(status_code=401, detail="Admin not found.")
    caller_company = (caller[0].get("company_name") or "").strip().lower()
    is_super = caller_company == "hydroleap"

    scan_kwargs = {}
    if status:
        status = status.lower()
        if status not in ("active", "inactive"):
            raise HTTPException(status_code=400, detail="Invalid status filter.")
        scan_kwargs["FilterExpression"] = Attr("status").eq(status)

    items = admins_table.scan(**scan_kwargs).get("Items", [])
    if not is_super:
        items = [a for a in items if (a.get("company_name") or "").strip().lower() == caller_company]
    return {"admins": items}


@router.get("/admin/me")
@router.get("/admin/profile")
def get_admin_me(Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="No email in token.")
        from boto3.dynamodb.conditions import Attr
        response = admins_table.scan(FilterExpression=Attr("email").eq(email))
        items = response.get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="Admin not found.")
        return items[0]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token error: {str(e)}")

# Admin change password
class AdminChangePasswordBody(BaseModel):
    current_password: str
    new_password:     str
    confirm_password: str

@router.post("/admin/change-password")
def admin_change_password(body: AdminChangePasswordBody, Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="No email in token.")

        if body.new_password != body.confirm_password:
            raise HTTPException(status_code=400, detail="New passwords do not match.")
        if len(body.new_password) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")

        items = admins_table.scan(FilterExpression=Attr("email").eq(email)).get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="Admin not found.")
        admin = items[0]
        if admin.get("password") != body.current_password:
            raise HTTPException(status_code=400, detail="Current password is incorrect.")

        admins_table.update_item(
            Key={"admin_id": admin["admin_id"]},
            UpdateExpression="SET #pwd = :p",
            ExpressionAttributeNames={"#pwd": "password"},
            ExpressionAttributeValues={":p": body.new_password},
        )
        return {"message": "Password updated successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Admin profile update request (goes to super-admin for approval)
class AdminProfileUpdate(BaseModel):
    name:   Optional[str] = None
    phone:  Optional[str] = None
    dob:    Optional[str] = None
    gender: Optional[str] = None

@router.post("/admin/request-profile-update")
def request_admin_profile_update(updates: AdminProfileUpdate, Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="No email in token.")

        response = admins_table.scan(FilterExpression=Attr("email").eq(email))
        items = response.get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="Admin not found.")
        admin = items[0]

        new_fields = {k: v for k, v in updates.dict().items() if v is not None}
        if not new_fields:
            raise HTTPException(status_code=400, detail="No fields to update.")

        current_fields = {k: admin.get(k, "") for k in new_fields}

        request_id = str(uuid.uuid4())
        pending_profile_updates_table.put_item(Item={
            "request_id":       request_id,
            "user_id":          admin.get("admin_id", ""),
            "email":            email,
            "display_name":     admin.get("name", ""),
            "company_name":     admin.get("company_name", ""),
            "account_type":     "admin",
            "current_fields":   current_fields,
            "requested_fields": new_fields,
            "requested_at":     datetime.utcnow().isoformat(),
        })
        return {"message": "Profile update submitted for approval.", "request_id": request_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")


# ---------------------------
# Profile Update Approvals
# ---------------------------

@router.get("/admin/pending-profile-updates")
def get_pending_profile_updates(Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="No email in token.")

        response = admins_table.scan(FilterExpression=Attr("email").eq(email))
        items = response.get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="Admin not found.")
        admin = items[0]
        admin_company = (admin.get("company_name") or "").lower()

        all_updates = pending_profile_updates_table.scan().get("Items", [])

        # Hydroleap (super) admins see all; others see only their company
        if admin_company == "hydroleap":
            return all_updates
        return [u for u in all_updates if (u.get("company_name") or "").lower() == admin_company]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")


@router.post("/admin/handle-profile-update")
def handle_profile_update(background_tasks: BackgroundTasks, data: dict = Body(...)):
    request_id = data.get("id")
    action = data.get("action")

    if not request_id or action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Missing or invalid parameters.")

    resp = pending_profile_updates_table.get_item(Key={"request_id": request_id})
    record = resp.get("Item")
    if not record:
        raise HTTPException(status_code=404, detail="Pending profile update not found.")

    account_type = record.get("account_type", "user")
    target_id    = record.get("user_id")
    target_email = record.get("email")
    target_name  = record.get("display_name", "User")

    if action == "approve":
        fields = record.get("requested_fields", {})
        if fields and target_id:
            table = approved_users_table if account_type == "user" else admins_table
            id_key = "user_id" if account_type == "user" else "admin_id"
            expr_parts  = [f"#{k} = :{k}" for k in fields]
            update_expr = "SET " + ", ".join(expr_parts)
            expr_names  = {f"#{k}": k for k in fields}
            expr_values = {f":{k}": v for k, v in fields.items()}
            table.update_item(
                Key={id_key: target_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_values,
            )
        pending_profile_updates_table.delete_item(Key={"request_id": request_id})
        if account_type == "user" and target_email:
            notifications_table.put_item(Item={
                "notification_id": str(uuid.uuid4()),
                "user_email":      target_email,
                "type":            "profile_approved",
                "message":         "Your profile update request has been approved.",
                "created_at":      datetime.utcnow().isoformat(),
                "read":            False,
            })
        if target_email:
            background_tasks.add_task(send_approval_email, target_email, target_name)
        return {"message": "Profile update approved and applied."}

    elif action == "reject":
        pending_profile_updates_table.delete_item(Key={"request_id": request_id})
        if target_email:
            background_tasks.add_task(send_rejection_email, target_email, target_name)
        return {"message": "Profile update rejected."}


# ---------------------------
# User Pending Approvals
# ---------------------------

@router.get("/admin/pending-users")
def get_all_pending_users(Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    payload = decode_jwt(token)
    caller_email = payload.get("email", "")
    caller = admins_table.scan(FilterExpression=Attr("email").eq(caller_email)).get("Items", [])
    if not caller:
        raise HTTPException(status_code=401, detail="Admin not found.")
    caller_company = (caller[0].get("company_name") or "").strip().lower()
    is_super = caller_company == "hydroleap"

    response = pending_users_table.scan()
    items = response.get("Items", [])
    if is_super:
        return items
    return [u for u in items if (u.get("company_name") or u.get("company") or "").strip().lower() == caller_company]

@router.post("/admin/handle-user-request")
def handle_user_request(
    background_tasks: BackgroundTasks, 
    data: dict = Body(...)
):
    user_id = data.get("id")
    action = data.get("action")

    if not user_id or action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Missing or invalid parameters.")

    # Get pending user
    resp = pending_users_table.get_item(Key={"user_id": user_id})
    user = resp.get("Item")
    if not user:
        raise HTTPException(status_code=404, detail="Pending user not found.")

    user_email = user.get("email")
    user_full_name = (
        f"{user.get('firstName', '')} {user.get('middleName', '')} {user.get('lastName', '')}".strip()
        if "firstName" in user else user.get("name", "User")
    )

    if action == "approve":
        # Copy all fields and set status to active
        user_approved = dict(user)
        user_approved["status"] = "active"
        approved_users_table.put_item(Item=user_approved)
        pending_users_table.delete_item(Key={"user_id": user_id})

        if user_email:
            background_tasks.add_task(send_approval_email, user_email, user_full_name)

        return {"message": "User approved and added to active users."}

    elif action == "reject":
        pending_users_table.delete_item(Key={"user_id": user_id})

        if user_email:
            background_tasks.add_task(send_rejection_email, user_email, user_full_name)

        return {"message": "User rejected and removed from pending list."}

# ---------------------------
# Admin Pending Approvals
# ---------------------------

@router.get("/admin/pending-admins")
def get_all_pending_admins(Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    payload = decode_jwt(token)
    caller_email = payload.get("email", "")
    caller = admins_table.scan(FilterExpression=Attr("email").eq(caller_email)).get("Items", [])
    if not caller:
        raise HTTPException(status_code=401, detail="Admin not found.")
    caller_company = (caller[0].get("company_name") or "").strip().lower()
    is_super = caller_company == "hydroleap"

    response = pending_admins_table.scan()
    items = response.get("Items", [])
    if is_super:
        return items
    return [a for a in items if (a.get("company_name") or a.get("company") or "").strip().lower() == caller_company]

@router.post("/admin/handle-admin-request")
def handle_admin_request(
    background_tasks: BackgroundTasks,
    data: dict = Body(...)
):
    admin_id = data.get("id")
    action = data.get("action")

    if not admin_id or action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Missing or invalid parameters.")

    resp = pending_admins_table.get_item(Key={"admin_id": admin_id})
    admin = resp.get("Item")
    if not admin:
        raise HTTPException(status_code=404, detail="Pending admin not found.")

    admin_email = admin.get("email")
    admin_full_name = (
        f"{admin.get('firstName', '')} {admin.get('middleName', '')} {admin.get('lastName', '')}".strip()
        if "firstName" in admin else admin.get("name", "Admin")
    )

    if action == "approve":
        # Copy all fields and set status to active
        admin_approved = dict(admin)
        admin_approved["status"] = "active"
        admins_table.put_item(Item=admin_approved)
        pending_admins_table.delete_item(Key={"admin_id": admin_id})

        if admin_email:
            background_tasks.add_task(send_approval_email, admin_email, admin_full_name)

        return {"message": "Admin approved and added to active admins."}

    elif action == "reject":
        pending_admins_table.delete_item(Key={"admin_id": admin_id})

        if admin_email:
            background_tasks.add_task(send_rejection_email, admin_email, admin_full_name)

        return {"message": "Admin rejected and removed from pending list."}

# ---------------------------
# Projects
# ---------------------------

@router.get("/projects")
def list_projects(Authorization: Optional[str] = Header(None)):
    """Return projects scoped to the caller's company (Hydroleap sees all).
    Regular users are authenticated but receive all projects — the frontend
    already filters the list down to only their assigned project IDs.
    """
    token = _require_token(Authorization)
    payload = decode_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token.")
    caller_email = payload.get("email", "")

    all_projects = projects_table.scan().get("Items", [])

    # Try admin first
    caller_admin = admins_table.scan(FilterExpression=Attr("email").eq(caller_email)).get("Items", [])
    if caller_admin:
        caller_company = (caller_admin[0].get("company_name") or "").strip().lower()
        if caller_company == "hydroleap":
            return {"projects": all_projects}
        company_project_ids = {
            item["projectId"]
            for item in company_project_access_table.scan().get("Items", [])
            if (item.get("company") or "").strip().lower() == caller_company
        }
        return {"projects": [p for p in all_projects if p.get("projectId") in company_project_ids]}

    # Fall through to regular users — frontend filters by their own access IDs
    caller_user = approved_users_table.scan(FilterExpression=Attr("email").eq(caller_email)).get("Items", [])
    if caller_user:
        return {"projects": all_projects}

    raise HTTPException(status_code=401, detail="Caller not found.")

# ---------------------------
# Company Project Access
# ---------------------------

@router.get("/companies")
def get_companies():
    """
    Return all unique company names found in admins and users tables.
    """
    companies = set()
    for tbl in [admins_table, approved_users_table]:
        response = tbl.scan()
        for item in response.get("Items", []):
            company = item.get("company") or item.get("company_name") or item.get("companyName")
            if company:
                companies.add(company)
    return {"companies": sorted([c for c in companies if c.lower() != "hydroleap"])}

@router.get("/company-accesses")
def list_company_project_accesses(company: str = None):
    """
    Return all company-project accesses in the CompanyProjectAccess table.
    If company is provided, only return entries for that company.
    """
    if company:
        response = company_project_access_table.query(
            KeyConditionExpression=Key("company").eq(company)
        )
        return {"company_accesses": response.get("Items", [])}
    else:
        response = company_project_access_table.scan()
        return {"company_accesses": response.get("Items", [])}

@router.post("/company-accesses/assign")
def assign_projects_to_company(data: dict = Body(...)):
    """
    Assign a list of projects to a company (replace all previous assignments).
    """
    company = data.get("company")
    project_ids = data.get("projectIds", [])
    if not company:
        raise HTTPException(status_code=400, detail="Missing company")
    # Remove previous assignments for this company
    existing = company_project_access_table.query(
        KeyConditionExpression=Key("company").eq(company)
    ).get("Items", [])
    for item in existing:
        company_project_access_table.delete_item(
            Key={"company": company, "projectId": item["projectId"]}
        )
    for pid in project_ids:
        company_project_access_table.put_item(
            Item={
                "company": company,
                "projectId": pid,
                "accessGrantedAt": datetime.utcnow().isoformat()
            }
        )
    return {"message": "Assignments updated"}

@router.post("/company-accesses/remove")
def remove_company_project_assignments(data: dict = Body(...)):
    """
    Remove selected projects from a company assignment.
    Expects: { "company": "CDS Agencies", "projectIds": ["P1002", "P1003"] }
    """
    company = data.get("company")
    project_ids = data.get("projectIds")
    if not company or not project_ids or not isinstance(project_ids, list):
        raise HTTPException(status_code=400, detail="Missing or invalid parameters.")

    deleted = 0
    for pid in project_ids:
        response = company_project_access_table.delete_item(
            Key={"company": company, "projectId": pid}
        )
        if response.get("ResponseMetadata", {}).get("HTTPStatusCode", 200) == 200:
            deleted += 1

    return {"message": f"{deleted} assignments removed."}

# --- User Project Access ---

user_project_access_table = get_table("UserProjectAccess")

@router.get("/user-accesses")
def list_user_project_accesses(email: str = None):
    """
    Return all user-project accesses in the UserProjectAccess table.
    If email is provided, only return entries for that user.
    """
    if email:
        response = user_project_access_table.query(
            KeyConditionExpression=Key("email").eq(email)
        )
        return {"user_accesses": response.get("Items", [])}
    else:
        response = user_project_access_table.scan()
        return {"user_accesses": response.get("Items", [])}
@router.post("/user-accesses/remove")
def remove_user_project_assignment(data: dict = Body(...)):
    """
    Remove a project assignment from a user.
    Expects: { "email": "sample03@gmail.com", "projectId": "P1001" }
    """
    email = data.get("email")
    projectId = data.get("projectId")
    if not email or not projectId:
        raise HTTPException(status_code=400, detail="Missing email or projectId.")

    resp = user_project_access_table.delete_item(
        Key={"email": email, "projectId": projectId}
    )
    if resp.get("ResponseMetadata", {}).get("HTTPStatusCode", 200) == 200:
        return {"message": f"Assignment removed for {email} - {projectId}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to remove access.")
    
@router.post("/user-accesses/assign")
def assign_user_project_access(data: dict = Body(...)):
    """
    Assigns (replaces) a user's project access.
    Expects: { "email": "...", "projectIds": ["P1001", "P1002"] }
    """
    email = data.get("email")
    project_ids = data.get("projectIds")
    if not email or not isinstance(project_ids, list):
        raise HTTPException(status_code=400, detail="Missing or invalid parameters.")

    # Remove previous assignments for the user
    existing = user_project_access_table.query(
        KeyConditionExpression=Key("email").eq(email)
    ).get("Items", [])
    for item in existing:
        user_project_access_table.delete_item(Key={"email": email, "projectId": item["projectId"]})

    # Add new assignments
    for pid in project_ids:
        user_project_access_table.put_item(
            Item={
                "email": email,
                "projectId": pid,
                "accessGrantedAt": datetime.utcnow().isoformat()
            }
        )
    return {"message": "User project assignments updated"}

