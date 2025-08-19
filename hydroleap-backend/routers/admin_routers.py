from fastapi import APIRouter, HTTPException, Header, Body, BackgroundTasks
from models.admin_model import Admin
from models.pending_user_model import PendingUser
from models.user_model import User
from utils.dynamo_client import get_table
from utils.auth import decode_jwt
from utils.email_utils import send_approval_email, send_rejection_email
from boto3.dynamodb.conditions import Key
from datetime import datetime
import uuid

router = APIRouter()

# === DynamoDB tables ===
admins_table = get_table("ApprovedAdmin")           # Final approved admins
pending_admins_table = get_table("PendingAdmins")   # Pending admins
pending_users_table = get_table("PendingUsers")     # Pending user registrations
approved_users_table = get_table("ApprovedUser")    # Approved users
projects_table = get_table("Projects")              # Projects table
company_project_access_table = get_table("CompanyProjectAccess")  # Company-project access

# ---------------------------
# Admin Registration & Profile
# ---------------------------

@router.post("/register")
def register_admin(admin: Admin):
    admin.admin_id = str(uuid.uuid4())
    pending_admins_table.put_item(Item=admin.dict())
    return {"message": "Admin registered", "admin_id": admin.admin_id}

@router.get("/admins")
def get_all_admins():
    response = admins_table.scan()
    return {"admins": response.get("Items", [])}

@router.get("/admin/me")
def get_admin_me(Authorization: str = Header(...)):
    if not Authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header.")
    token = Authorization.split(" ")[1]
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="No email in token.")
        response = admins_table.get_item(Key={"email": email})
        admin = response.get("Item")
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found.")
        return admin
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token error: {str(e)}")

# ---------------------------
# User Pending Approvals
# ---------------------------

@router.get("/admin/pending-users")
def get_all_pending_users():
    """Return all pending users in the PendingUsers table."""
    response = pending_users_table.scan()
    return response.get("Items", [])

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
def get_all_pending_admins():
    """Return all pending admins in the PendingAdmins table."""
    response = pending_admins_table.scan()
    return response.get("Items", [])

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
def list_projects():
    """Return all projects in the Projects table."""
    response = projects_table.scan()
    return {"projects": response.get("Items", [])}

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

