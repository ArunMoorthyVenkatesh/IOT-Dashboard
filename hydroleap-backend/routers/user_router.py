# hydroleap-backend/routers/user_router.py
from fastapi import APIRouter, Body, Depends, HTTPException, status, Header
from models.user_model import User
from utils.dynamo_client import get_table, ensure_table
from utils.auth import decode_jwt
from boto3.dynamodb.conditions import Attr
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

router = APIRouter()

def _require_token(authorization: Optional[str]) -> str:
    """Extract and return the Bearer token, raising 401 for any auth issue."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid.")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token is empty.")
    return token

users_table = get_table("ApprovedUser")
pending_table = get_table("PendingUsers")
admins_table = get_table("ApprovedAdmin")

ensure_table("PendingProfileUpdates", "request_id")
pending_profile_updates_table = get_table("PendingProfileUpdates")
ensure_table("UserNotifications", "notification_id")
notifications_table = get_table("UserNotifications")
ensure_table("UserSessions", "session_id")
sessions_table = get_table("UserSessions")

# 1. REGISTER ROUTE (adds to pending table)
@router.post("/register")
def register_user(user: User):
    user.user_id = str(uuid.uuid4())
    pending_table.put_item(Item=user.dict())
    return {"message": "User registration submitted for approval", "user_id": user.user_id}

# 2. GET ALL APPROVED USERS (scoped to caller's company)
@router.get("/users")
def get_all_users(Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    payload = decode_jwt(token)
    caller_email = payload.get("email", "")
    caller = admins_table.scan(FilterExpression=Attr("email").eq(caller_email)).get("Items", [])
    if not caller:
        raise HTTPException(status_code=401, detail="Admin not found.")
    caller_company = (caller[0].get("company_name") or "").strip().lower()
    is_super = caller_company == "hydroleap"

    items = users_table.scan().get("Items", [])
    if not is_super:
        items = [u for u in items if (u.get("company_name") or u.get("company") or "").strip().lower() == caller_company]
    return {"users": items}

# 3. GET LOGGED-IN USER PROFILE
@router.get("/user/me")
def get_my_profile(Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="No email in token.")

        response = users_table.scan(FilterExpression=Attr("email").eq(email))
        items = response.get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="User not found.")
        return items[0]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token error: {str(e)}")


# 4. UPDATE LOGGED-IN USER PROFILE (editable fields only)
class UserProfileUpdate(BaseModel):
    name:   Optional[str] = None
    phone:  Optional[str] = None
    dob:    Optional[str] = None
    gender: Optional[str] = None

# 4a. REQUEST PROFILE UPDATE (goes to admin for approval)
@router.post("/user/request-profile-update")
def request_profile_update(updates: UserProfileUpdate, Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="No email in token.")

        response = users_table.scan(FilterExpression=Attr("email").eq(email))
        items = response.get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="User not found.")
        user = items[0]

        new_fields = {k: v for k, v in updates.dict().items() if v is not None}
        if not new_fields:
            raise HTTPException(status_code=400, detail="No fields to update.")

        current_fields = {k: user.get(k, "") for k in new_fields}

        request_id = str(uuid.uuid4())
        pending_profile_updates_table.put_item(Item={
            "request_id":       request_id,
            "user_id":          user.get("user_id", ""),
            "email":            email,
            "display_name":     user.get("name", ""),
            "company_name":     user.get("company_name", ""),
            "account_type":     "user",
            "current_fields":   current_fields,
            "requested_fields": new_fields,
            "requested_at":     datetime.utcnow().isoformat(),
        })
        return {"message": "Profile update submitted for admin approval.", "request_id": request_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")


@router.patch("/user/me")
def update_my_profile(updates: UserProfileUpdate, Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="No email in token.")

        # Find the user record to get their primary key (user_id)
        response = users_table.scan(FilterExpression=Attr("email").eq(email))
        items = response.get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="User not found.")
        user = items[0]
        user_id = user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=500, detail="User record has no user_id.")

        # Build update expression for only the fields provided
        fields = {k: v for k, v in updates.dict().items() if v is not None}
        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update.")

        expr_parts = [f"#{k} = :{k}" for k in fields]
        update_expr = "SET " + ", ".join(expr_parts)
        expr_names  = {f"#{k}": k for k in fields}
        expr_values = {f":{k}": v for k, v in fields.items()}

        result = users_table.update_item(
            Key={"user_id": user_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
            ReturnValues="ALL_NEW",
        )
        return result.get("Attributes", {})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


# 5. GET STARRED PROJECTS
@router.get("/user/starred")
def get_starred(Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        response = users_table.scan(FilterExpression=Attr("email").eq(email))
        items = response.get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="User not found.")
        return {"starred": items[0].get("starred_projects", [])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 6. TOGGLE A STARRED PROJECT
class StarToggleRequest(BaseModel):
    project_id: str

@router.post("/user/starred/toggle")
def toggle_starred(body: StarToggleRequest, Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        response = users_table.scan(FilterExpression=Attr("email").eq(email))
        items = response.get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="User not found.")
        user = items[0]
        user_id = user.get("user_id")
        current = list(user.get("starred_projects", []))
        if body.project_id in current:
            current.remove(body.project_id)
        else:
            current.append(body.project_id)
        users_table.update_item(
            Key={"user_id": user_id},
            UpdateExpression="SET starred_projects = :s",
            ExpressionAttributeValues={":s": current},
        )
        return {"starred": current}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 7. CHANGE PASSWORD (authenticated, current password required)
class ChangePasswordBody(BaseModel):
    current_password: str
    new_password:     str
    confirm_password: str

@router.post("/user/change-password")
def change_password(body: ChangePasswordBody, Authorization: Optional[str] = Header(None)):
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

        items = users_table.scan(FilterExpression=Attr("email").eq(email)).get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="User not found.")

        user = items[0]
        if user.get("password") != body.current_password:
            raise HTTPException(status_code=400, detail="Current password is incorrect.")

        users_table.update_item(
            Key={"user_id": user["user_id"]},
            UpdateExpression="SET #pwd = :p",
            ExpressionAttributeNames={"#pwd": "password"},
            ExpressionAttributeValues={":p": body.new_password},
        )
        return {"message": "Password updated successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 8. GET USER NOTIFICATIONS (unread only)
@router.get("/user/notifications")
def get_notifications(Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="No email in token.")
        items = notifications_table.scan(
            FilterExpression=Attr("user_email").eq(email) & Attr("read").eq(False)
        ).get("Items", [])
        return {"notifications": items}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 8. MARK ALL USER NOTIFICATIONS AS READ
@router.post("/user/notifications/mark-read")
def mark_notifications_read(Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="No email in token.")
        items = notifications_table.scan(
            FilterExpression=Attr("user_email").eq(email) & Attr("read").eq(False)
        ).get("Items", [])
        for item in items:
            notifications_table.update_item(
                Key={"notification_id": item["notification_id"]},
                UpdateExpression="SET #r = :t",
                ExpressionAttributeNames={"#r": "read"},
                ExpressionAttributeValues={":t": True},
            )
        return {"marked": len(items)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 10. GET ACTIVE SESSIONS
@router.get("/user/sessions/active")
def get_active_sessions(Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        current_session_id = payload.get("session_id")
        if not email:
            raise HTTPException(status_code=401, detail="No email in token.")
        items = sessions_table.scan(
            FilterExpression=Attr("user_email").eq(email) & Attr("is_active").eq(True)
        ).get("Items", [])
        # Mark which one is the current session
        for item in items:
            item["is_current"] = item.get("session_id") == current_session_id
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return {"sessions": items, "current_session_id": current_session_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 11. REVOKE ALL OTHER SESSIONS
@router.post("/user/sessions/revoke-others")
def revoke_other_sessions(Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        email = payload.get("email")
        current_session_id = payload.get("session_id")
        if not email:
            raise HTTPException(status_code=401, detail="No email in token.")
        items = sessions_table.scan(
            FilterExpression=Attr("user_email").eq(email) & Attr("is_active").eq(True)
        ).get("Items", [])
        revoked = 0
        for item in items:
            if item.get("session_id") != current_session_id:
                sessions_table.update_item(
                    Key={"session_id": item["session_id"]},
                    UpdateExpression="SET is_active = :f",
                    ExpressionAttributeValues={":f": False},
                )
                revoked += 1
        return {"revoked": revoked}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 12. LOGOUT (mark session inactive)
@router.post("/user/logout")
def logout_session(Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        session_id = payload.get("session_id")
        if session_id:
            sessions_table.update_item(
                Key={"session_id": session_id},
                UpdateExpression="SET is_active = :f",
                ExpressionAttributeValues={":f": False},
            )
        return {"message": "Session ended."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 13. UPDATE DEVICE INFO FOR SESSION
@router.post("/user/sessions/update-device")
def update_session_device(data: dict = Body(...), Authorization: Optional[str] = Header(None)):
    token = _require_token(Authorization)
    try:
        payload = decode_jwt(token)
        session_id = payload.get("session_id")
        device = data.get("device", "")
        if session_id and device:
            sessions_table.update_item(
                Key={"session_id": session_id},
                UpdateExpression="SET device = :d",
                ExpressionAttributeValues={":d": device},
            )
        return {"message": "Device updated."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
