import smtplib
from email.mime.text import MIMEText
from os import getenv
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

EMAIL_USER = getenv("EMAIL_USER")
EMAIL_PASS = getenv("EMAIL_PASS")

def send_email(to_email: str, subject: str, body: str):
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = EMAIL_USER
    msg["To"] = to_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
        print(f"✅ Email sent to {to_email}")
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")

def send_otp_email(to_email: str, otp: str):
    subject = "OTP Verification - Hydroleap"
    body = f"Your OTP for verification is: {otp}\n\nThis OTP is valid for a short period. Do not share it with anyone."
    send_email(to_email, subject, body)

def send_registration_success_email(to_email: str, name: str):
    subject = "Registration Received - Pending Approval"
    body = f"""Hi {name},

Thank you for registering on the Hydroleap platform.

Your request is currently under review. You will receive another email once your registration is approved by an admin.

Regards,  
Hydroleap Team"""
    send_email(to_email, subject, body)

def send_pending_duplicate_email(to_email: str, name: str):
    subject = "Registration Pending - Email Already In Use"
    body = f"""Hi {name},

Our records show that a registration with this email address is already pending approval on Hydroleap.

Please wait for an admin to review your request. You will receive another email when your registration is approved.

If you did not initiate this registration or need help, please contact support.

Regards,  
Hydroleap Team
"""
    send_email(to_email, subject, body)

def send_approved_duplicate_email(to_email: str, name: str):
    subject = "Registration Blocked - Email Already Registered"
    body = f"""Hi {name},

Our records show that this email is already fully registered on Hydroleap.

If you forgot your password, please use the password reset option on the login page.

If you did not create this account or believe this is an error, please contact support for assistance.

Regards,  
Hydroleap Team
"""
    send_email(to_email, subject, body)

def send_approval_email(to_email: str, name: str):
    subject = "Hydroleap Registration Approved"
    body = f"""Hi {name},

Congratulations! Your registration has been approved.
You can now log in and access your Hydroleap account.

Regards,  
Hydroleap Team"""
    send_email(to_email, subject, body)

def send_rejection_email(to_email: str, name: str):
    subject = "Hydroleap Registration Update"
    body = f"""Hi {name},

We regret to inform you that your registration was not approved at this time.
If you believe this is a mistake or need more information, please contact support.

Regards,  
Hydroleap Team"""
    send_email(to_email, subject, body)

