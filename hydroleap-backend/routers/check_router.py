# routers/check_email_router.py
from fastapi import APIRouter
from utils.dynamo_client import get_table
from boto3.dynamodb.conditions import Attr

router = APIRouter()

@router.get("/check/check-email/{email}")
def check_email(email: str):
    table = get_table("PendingUsers")
    response = table.scan(
        FilterExpression=Attr("email").eq(email.lower())
    )
    return {"exists": bool(response.get("Items"))}
