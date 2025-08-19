# hydroleap-backend/models/admin_model.py
from pydantic import BaseModel, EmailStr

class Admin(BaseModel):
    admin_id: str
    name: str
    dob: str
    phone: str
    gender: str
    email: EmailStr
    password: str
    role: str = "admin"
    company_name: str
    status: str
    created_at: str
