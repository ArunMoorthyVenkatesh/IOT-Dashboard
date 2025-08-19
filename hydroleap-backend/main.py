# hydroleap-backend/main.py

from dotenv import load_dotenv
load_dotenv()

import os
import boto3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import register_router, otp_router, check_router, login_router
from routers import admin_routers
from routers import user_router
from routers import history_router

# Debug: print AWS identity to confirm credentials in use
try:
    print("Current boto3 identity:", boto3.client("sts").get_caller_identity())
except Exception as e:
    print("Could not fetch AWS identity:", e)

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost:4000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers, using correct prefixes!
app.include_router(register_router.router, prefix="/api", tags=["register"])
app.include_router(otp_router.router, prefix="/api", tags=["otp"])
app.include_router(check_router.router, prefix="/api", tags=["check"])
app.include_router(login_router.router, prefix="/api", tags=["login"])
app.include_router(admin_routers.router, prefix="/api", tags=["admin"])
app.include_router(user_router.router, prefix="/api", tags=["user"])  
app.include_router(history_router.router, prefix="/api/history", tags=["history"])

@app.get("/")
def root():
    return {"status": "ok"}
