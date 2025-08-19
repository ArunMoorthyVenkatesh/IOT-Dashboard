from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db.dynamo_client import get_table
from boto3.dynamodb.conditions import Attr

router = APIRouter()

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

    return {
        "message": "Login successful.",
        "profile": profile,
        "role": role
    }
