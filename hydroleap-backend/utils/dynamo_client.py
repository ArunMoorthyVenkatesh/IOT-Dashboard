import boto3
import os
from dotenv import load_dotenv
from botocore.exceptions import ClientError

load_dotenv()

dynamodb = boto3.resource(
    "dynamodb",
    region_name=os.getenv("AWS_REGION") or os.getenv("DYNAMO_REGION", "us-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID") or None,
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY") or None,
)

def get_table(table_name: str):
    return dynamodb.Table(table_name)

def _build_key_schema(partition_key, sort_key=None):
    schema = [{"AttributeName": partition_key, "KeyType": "HASH"}]
    if sort_key:
        schema.append({"AttributeName": sort_key, "KeyType": "RANGE"})
    return schema


def _create_table(client, table_name, partition_key, partition_key_type, sort_key, sort_key_type):
    key_schema = _build_key_schema(partition_key, sort_key)
    attr_defs  = [{"AttributeName": partition_key, "AttributeType": partition_key_type}]
    if sort_key:
        attr_defs.append({"AttributeName": sort_key, "AttributeType": sort_key_type})
    client.create_table(
        TableName=table_name,
        KeySchema=key_schema,
        AttributeDefinitions=attr_defs,
        BillingMode="PAY_PER_REQUEST",
    )
    client.get_waiter("table_exists").wait(TableName=table_name)


def ensure_table(
    table_name: str,
    partition_key: str,
    partition_key_type: str = "S",
    sort_key: str = None,
    sort_key_type: str = "S",
):
    """Create the DynamoDB table if it does not exist, or recreate it if the key schema has changed."""
    client = dynamodb.meta.client
    try:
        desc = client.describe_table(TableName=table_name)
        existing_schema = {e["AttributeName"] for e in desc["Table"]["KeySchema"]}
        desired_schema  = {partition_key} | ({sort_key} if sort_key else set())
        if existing_schema != desired_schema:
            print(f"[ensure_table] Schema mismatch for '{table_name}': "
                  f"existing={existing_schema}, desired={desired_schema}. Recreating table.")
            client.delete_table(TableName=table_name)
            client.get_waiter("table_not_exists").wait(TableName=table_name)
            _create_table(client, table_name, partition_key, partition_key_type, sort_key, sort_key_type)
            print(f"[ensure_table] '{table_name}' recreated with correct schema.")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            _create_table(client, table_name, partition_key, partition_key_type, sort_key, sort_key_type)
        else:
            raise
