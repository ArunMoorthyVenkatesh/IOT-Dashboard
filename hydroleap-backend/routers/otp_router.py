# hydroleap-backend/routers/otp_router.py
from fastapi import APIRouter, HTTPException
from utils.otp_utils import generate_otp, store_otp, verify_otp
from utils.email_utils import send_otp_email
from pydantic import BaseModel, EmailStr

router = APIRouter()

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

@router.post("/otp/send")
def send_otp(data: OTPRequest):
    otp = generate_otp()
    store_otp(data.email.lower(), otp)
    send_otp_email(data.email, otp)
    return {"message": "OTP sent"}

@router.post("/otp/verify")
def verify_otp_route(data: OTPVerifyRequest):
    if verify_otp(data.email.lower(), data.otp):
        return {"message": "OTP verified"}
    raise HTTPException(status_code=400, detail="Invalid OTP")
