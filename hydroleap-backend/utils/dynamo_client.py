import boto3
import os
from dotenv import load_dotenv
from botocore.exceptions import ClientError

load_dotenv()

dynamodb = boto3.resource(
    "dynamodb",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

def get_table(table_name: str):
    return dynamodb.Table(table_name)

def ensure_table(table_name: str, partition_key: str, partition_key_type: str = "S"):
    """Create the DynamoDB table if it does not already exist."""
    client = dynamodb.meta.client
    try:
        client.describe_table(TableName=table_name)
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            client.create_table(
                TableName=table_name,
                KeySchema=[{"AttributeName": partition_key, "KeyType": "HASH"}],
                AttributeDefinitions=[{"AttributeName": partition_key, "AttributeType": partition_key_type}],
                BillingMode="PAY_PER_REQUEST",
            )
            dynamodb.meta.client.get_waiter("table_exists").wait(TableName=table_name)
        else:
            raise
