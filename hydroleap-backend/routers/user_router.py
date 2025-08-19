# hydroleap-backend/routers/user_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Header
from models.user_model import User
from utils.dynamo_client import get_table
from utils.auth import decode_jwt
from boto3.dynamodb.conditions import Attr
import uuid

router = APIRouter()

users_table = get_table("ApprovedUser")       # ✅ Final approved users table
pending_table = get_table("PendingUsers")     # ✅ Pending user registrations

# 1. REGISTER ROUTE (adds to pending table)
@router.post("/register")
def register_user(user: User):
    user.user_id = str(uuid.uuid4())
    pending_table.put_item(Item=user.dict())
    return {"message": "User registration submitted for approval", "user_id": user.user_id}

# 2. GET ALL APPROVED USERS
@router.get("/users")
def get_all_users():
    response = users_table.scan()
    return {"users": response.get("Items", [])}

# 3. GET LOGGED-IN USER PROFILE
@router.get("/user/me")
def get_my_profile(Authorization: str = Header(...)):
    if not Authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header.")
    token = Authorization.split(" ")[1]
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
