# hydroleap-backend/routers/otp_router.py
from fastapi import APIRouter, HTTPException
from utils.otp_utils import generate_otp, store_otp, verify_otp
from utils.email_utils import send_otp_email
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/otp", tags=["otp"])  # ← add prefix

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

@router.post("/send")   # ← shorten path
def send_otp_route(data: OTPRequest):
    otp = generate_otp()
    store_otp(data.email.lower(), otp)
    send_otp_email(data.email, otp)
    return {"message": "OTP sent"}

@router.post("/verify")  # ← shorten path
def verify_otp_route(data: OTPVerifyRequest):
    if verify_otp(data.email.lower(), data.otp):
        return {"message": "OTP verified"}
    raise HTTPException(status_code=400, detail="Invalid OTP")
