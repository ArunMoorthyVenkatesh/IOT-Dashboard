from fastapi import APIRouter, HTTPException
from utils.dynamo_client import get_table
from utils.email_utils import (
    send_registration_success_email,
    send_pending_duplicate_email,
    send_approved_duplicate_email,
)
from boto3.dynamodb.conditions import Attr
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/register")
def register(data: dict):
    role = str(data.get("role", "user")).strip().lower()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()
    confirmPassword = str(data.get("confirmPassword", "")).strip()

    print(f"[REGISTER] role={role}, email={email}")

    if password != confirmPassword:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    name = f"{data.get('firstName','').strip()} {data.get('middleName','').strip()} {data.get('lastName','').strip()}".replace("  ", " ").strip()

    item = {
        "name": name,
        "dob": str(data.get("dob", "")).strip(),
        "phone": str(data.get("phone", "")).strip(),
        "gender": str(data.get("gender", "")).strip(),
        "email": email,
        "password": password,   # ⚠️ Always hash in production
        "role": role,
        "company_name": str(data.get("companyName", "")).strip(),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }

    # ===== DUPLICATE CHECK (pending + approved) =====
    pending_users_table = get_table("PendingUsers")
    pending_admins_table = get_table("PendingAdmins")
    approved_users_table = get_table("ApprovedUser")
    approved_admins_table = get_table("ApprovedAdmin")

    user_exists = pending_users_table.scan(FilterExpression=Attr("email").eq(email)).get("Items", [])
    admin_exists = pending_admins_table.scan(FilterExpression=Attr("email").eq(email)).get("Items", [])
    approved_user_exists = approved_users_table.scan(FilterExpression=Attr("email").eq(email)).get("Items", [])
    approved_admin_exists = approved_admins_table.scan(FilterExpression=Attr("email").eq(email)).get("Items", [])

    # ---- Pending duplicate
    if user_exists or admin_exists:
        send_pending_duplicate_email(email, data.get("firstName"))
        raise HTTPException(
            status_code=400,
            detail="Sorry, can't register. Email is already pending approval."
        )
    # ---- Approved duplicate
    elif approved_user_exists or approved_admin_exists:
        send_approved_duplicate_email(email, data.get("firstName"))
        raise HTTPException(
            status_code=400,
            detail="Sorry, can't register. Email is already registered."
        )

    # ===== Continue with normal registration =====
    if role == "admin":
        table = pending_admins_table
        id_field = "admin_id"
    else:
        table = pending_users_table
        id_field = "user_id"

    item[id_field] = str(uuid.uuid4())
    table.put_item(Item=item)

    send_registration_success_email(email, name)
    print(f"[SUCCESS] Registered {role}: {email} ({item[id_field]})")

    return {
        "message": f"{role.title()} registered successfully. Awaiting admin approval.",
        id_field: item[id_field],
        "status": "pending"
    }
