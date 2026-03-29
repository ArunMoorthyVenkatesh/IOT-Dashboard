from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Literal
from boto3.dynamodb.conditions import Attr
from utils.dynamo_client import get_table
from utils.otp_utils import generate_otp, store_otp, verify_otp
from utils.email_utils import send_otp_email  # reuse your existing OTP email sender

# Removed inner "/auth" prefix
router = APIRouter(tags=["auth"])

class SendResetOtpBody(BaseModel):
    email: EmailStr
    role: Literal["user", "admin"]

class ResetPasswordBody(BaseModel):
    email: EmailStr
    role: Literal["user", "admin"]
    otp: str
    new_password: str
    confirm_password: str

def _get_table_and_id(role: str):
    if role == "admin":
        return get_table("ApprovedAdmin"), "admin_id"
    return get_table("ApprovedUser"), "user_id"

@router.post("/forgot-password/send-otp")
def send_reset_otp(body: SendResetOtpBody):
    email = body.email.strip().lower()
    table, _ = _get_table_and_id(body.role)
    _ = table.scan(FilterExpression=Attr("email").eq(email)).get("Items", [])
    otp = generate_otp()
    store_otp(email, otp)
    send_otp_email(email, otp)
    return {"message": "If the account exists, a reset code has been sent."}

@router.post("/forgot-password/reset")
def reset_password(body: ResetPasswordBody):
    email = body.email.strip().lower()

    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    if not verify_otp(email, body.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    table, id_field = _get_table_and_id(body.role)
    items = table.scan(FilterExpression=Attr("email").eq(email)).get("Items", [])
    if not items:
        return {"message": "Password updated if account exists."}

    user = items[0]
    key = {id_field: user[id_field]}
    table.update_item(
        Key=key,
        UpdateExpression="SET #pwd = :p",
        ExpressionAttributeNames={"#pwd": "password"},
        ExpressionAttributeValues={":p": body.new_password},
    )
    return {"message": "Password updated successfully."}
