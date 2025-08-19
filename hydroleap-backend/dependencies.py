# hydroleap-backend/dependencies.py
from fastapi import Header, HTTPException
from typing import Optional

def get_current_user_email(x_user_email: Optional[str] = Header(None)):
    if not x_user_email:
        raise HTTPException(status_code=401, detail="Missing email header")
    return x_user_email
