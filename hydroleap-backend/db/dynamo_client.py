import boto3
from os import getenv

dynamodb = boto3.resource(
    'dynamodb',
    region_name=getenv("AWS_REGION"),
    aws_access_key_id=getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=getenv("AWS_SECRET_ACCESS_KEY"),
)

def get_table(name):
    return dynamodb.Table(name)
