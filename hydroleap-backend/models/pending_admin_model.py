# hydroleap-backend/models/pending_admin_model.py
from pydantic import BaseModel, EmailStr

class PendingAdmin(BaseModel):
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
