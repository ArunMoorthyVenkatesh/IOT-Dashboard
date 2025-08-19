# hydroleap-backend/models/pending_user_model.py
from pydantic import BaseModel, EmailStr

class PendingUser(BaseModel):
    firstName: str
    middleName: str = ""
    lastName: str
    dob: str
    phone: str
    gender: str
    email: EmailStr
    password: str
    confirmPassword: str
    companyName: str 
    otp: str
