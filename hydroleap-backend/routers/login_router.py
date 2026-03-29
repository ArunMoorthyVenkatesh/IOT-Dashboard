from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from utils.dynamo_client import get_table, ensure_table
from boto3.dynamodb.conditions import Attr
import jwt
import os
import uuid
from datetime import datetime, timedelta, timezone

SECRET = os.environ.get("JWT_SECRET", "dev_secret_fallback")

router = APIRouter()

ensure_table("UserSessions", "session_id")
sessions_table = get_table("UserSessions")

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str  # should be "user" or "admin"

@router.post("/login")
def login(data: LoginRequest):
    email = data.email.strip().lower()
    password = data.password
    role = data.role.strip().lower()

    # Select the right table
    if role == "admin":
        table = get_table("ApprovedAdmin")
        id_field = "admin_id"
    elif role == "user":
        table = get_table("ApprovedUser")
        id_field = "user_id"
    else:
        raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'.")

    # Search for the email (case-insensitive)
    response = table.scan(FilterExpression=Attr("email").eq(email))
    items = response.get("Items", [])

    if not items:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user = items[0]
    # Password check (plaintext for demo! Hash in production!)
    if user.get("password") != password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Prepare response (exclude password)
    profile = {k: v for k, v in user.items() if k != "password"}

    # Create a session record
    session_id = str(uuid.uuid4())
    sessions_table.put_item(Item={
        "session_id":  session_id,
        "user_email":  email,
        "role":        role,
        "device":      "",          # filled in by frontend via /user/sessions/update-device
        "created_at":  datetime.utcnow().isoformat(),
        "is_active":   True,
    })

    # Generate JWT token (session_id embedded so backend can identify the session)
    payload = {
        "email":      email,
        "role":       role,
        "session_id": session_id,
        "exp":        datetime.now(timezone.utc) + timedelta(hours=24)
    }
    token = jwt.encode(payload, SECRET, algorithm="HS256")

    return {
        "message":    "Login successful.",
        "profile":    profile,
        "role":       role,
        "token":      token,
        "session_id": session_id,
    }
