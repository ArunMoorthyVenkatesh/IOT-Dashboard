from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers import register_router, otp_router, check_router, login_router
from routers import admin_routers, user_router, history_router, password_router

app = FastAPI(title="Hydroleap API", version="1.0.0")

import os

origins = [
    "http://localhost:3000",
    "http://localhost:4000",
    "https://iot-hydroleap.com",
    "http://iot-hydroleap-bucket.s3-website-us-east-1.amazonaws.com",
]

# Allow extra origin from env (e.g. Netlify/Vercel URL set at deploy time)
_extra_origin = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
if _extra_origin and _extra_origin not in origins:
    origins.append(_extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers=headers,
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

# Lambda handler (used by AWS Lambda + API Gateway)
from mangum import Mangum
handler = Mangum(app, lifespan="off")
