from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import register_router, otp_router, check_router, login_router
from routers import admin_routers, user_router, history_router, password_router

app = FastAPI(title="Hydroleap API", version="1.0.0")

origins = [
    "http://localhost:3000",
    "http://localhost:4000",
    "https://iot-hydroleap.com",
    "http://iot-hydroleap-bucket.s3-website-us-east-1.amazonaws.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(register_router.router, prefix="/api",      tags=["register"])
app.include_router(otp_router.router,      prefix="/api",      tags=["otp"])
app.include_router(check_router.router,    prefix="/api",      tags=["check"])
app.include_router(login_router.router,    prefix="/api",      tags=["login"])
app.include_router(admin_routers.router,   prefix="/api",      tags=["admin"])
app.include_router(user_router.router,     prefix="/api",      tags=["user"])
app.include_router(history_router.router,  prefix="/api/history", tags=["history"])
app.include_router(password_router.router, prefix="/api/auth", tags=["auth"])

@app.get("/")
def root():
    return {"status": "ok"}
