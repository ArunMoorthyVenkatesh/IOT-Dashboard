# utils/auth.py
import os
from fastapi import Header, HTTPException
import jwt

SECRET = os.environ.get("JWT_SECRET", "dev_secret_fallback")

def decode_jwt(token: str):
    """Decode JWT token and return the payload."""
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid or missing token: {str(e)}")

def get_current_user_email(authorization: str = Header(...)):
    """Extract email from JWT Bearer token in the Authorization header."""
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise Exception("Invalid auth scheme")
        payload = decode_jwt(token)
        return payload["email"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing token")
