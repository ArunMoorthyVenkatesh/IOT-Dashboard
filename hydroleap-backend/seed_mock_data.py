"""
seed_mock_data.py — Clears the Projects DynamoDB table and fills it with mock data
matching the schema: { pk, asset_id, client_id, data (JSON string), timestamp }

Usage:
  cd hydroleap-backend
  python seed_mock_data.py
"""

import boto3
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

dynamodb = boto3.resource(
    "dynamodb",
    region_name=os.getenv("AWS_REGION", "us-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

PROJECTS_TABLE = "Projects"
client = dynamodb.meta.client


def recreate_table():
    """Drop and recreate Projects table with pk as the partition key."""
    print(f"Checking {PROJECTS_TABLE} table schema...")
    try:
        desc = client.describe_table(TableName=PROJECTS_TABLE)
        keys = desc["Table"]["KeySchema"]
        current_key = keys[0]["AttributeName"]
        if current_key == "pk":
            print("  Table already has correct key (pk). Clearing items...")
            tbl = dynamodb.Table(PROJECTS_TABLE)
            scan = tbl.scan()
            with tbl.batch_writer() as batch:
                for item in scan.get("Items", []):
                    batch.delete_item(Key={"pk": item["pk"]})
            print(f"  Cleared {len(scan.get('Items', []))} items.")
            return tbl
        else:
            print(f"  Table has key '{current_key}' — deleting and recreating with 'pk'...")
            client.delete_table(TableName=PROJECTS_TABLE)
            waiter = client.get_waiter("table_not_exists")
            waiter.wait(TableName=PROJECTS_TABLE)
            print("  Old table deleted.")
    except client.exceptions.ResourceNotFoundException:
        print("  Table does not exist yet, creating...")

    client.create_table(
        TableName=PROJECTS_TABLE,
        KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "pk", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )
    waiter = client.get_waiter("table_exists")
    waiter.wait(TableName=PROJECTS_TABLE)
    print(f"  Created table '{PROJECTS_TABLE}' with partition key 'pk'.")
    return dynamodb.Table(PROJECTS_TABLE)


def ts(minutes_ago=0):
    """Return an ISO timestamp, optionally offset by minutes."""
    return (datetime.utcnow() - timedelta(minutes=minutes_ago)).strftime("%Y-%m-%dT%H:%M:%S.000Z")


MOCK_DEVICES = [
    # --- Client: PUB_CT ---
    {
        "client_id": "PUB_CT",
        "asset_id":  "EO009-SG",
        "data": {
            "Pump_speed":     42.5,
            "Flow_1":         5.2,
            "Flow_2":         4.8,
            "Pressure_1":     11.0,
            "Pressure_2":     10.5,
            "Temperature_1":  338.0,
            "Temperature_2":  336.0,
            "Rectifier_1_ON": True,
            "Rectifier_2_ON": False,
            "Rectifier_1_Vol":  24.0,
            "Rectifier_1_Amps": 8.5,
            "Rectifier_2_Vol":  0.0,
            "Rectifier_2_Amps": 0.0,
        },
        "minutes_ago": 2,
    },
    {
        "client_id": "PUB_CT",
        "asset_id":  "EO010-SG",
        "data": {
            "Pump_speed":     0.0,
            "Flow_1":         0.0,
            "Flow_2":         0.0,
            "Pressure_1":     0.0,
            "Pressure_2":     0.0,
            "Temperature_1":  310.0,
            "Temperature_2":  308.0,
            "Rectifier_1_ON": False,
            "Rectifier_2_ON": False,
            "Rectifier_1_Vol":  0.0,
            "Rectifier_1_Amps": 0.0,
            "Rectifier_2_Vol":  0.0,
            "Rectifier_2_Amps": 0.0,
        },
        "minutes_ago": 5,
    },
    # --- Client: HYDRO ---
    {
        "client_id": "HYDRO",
        "asset_id":  "EO001-AU",
        "data": {
            "Pump_speed":     78.0,
            "Flow_1":         9.1,
            "Flow_2":         8.7,
            "Pressure_1":     14.2,
            "Pressure_2":     13.9,
            "Temperature_1":  355.0,
            "Temperature_2":  350.0,
            "Rectifier_1_ON": True,
            "Rectifier_2_ON": True,
            "Rectifier_1_Vol":  28.0,
            "Rectifier_1_Amps": 12.0,
            "Rectifier_2_Vol":  26.5,
            "Rectifier_2_Amps": 11.0,
        },
        "minutes_ago": 1,
    },
    {
        "client_id": "HYDRO",
        "asset_id":  "EO002-AU",
        "data": {
            "Pump_speed":     55.0,
            "Flow_1":         6.3,
            "Flow_2":         6.0,
            "Pressure_1":     12.0,
            "Pressure_2":     11.8,
            "Temperature_1":  342.0,
            "Temperature_2":  340.0,
            "Rectifier_1_ON": True,
            "Rectifier_2_ON": False,
            "Rectifier_1_Vol":  22.0,
            "Rectifier_1_Amps": 9.5,
            "Rectifier_2_Vol":  0.0,
            "Rectifier_2_Amps": 0.0,
        },
        "minutes_ago": 3,
    },
    # --- Client: CDS ---
    {
        "client_id": "CDS",
        "asset_id":  "EO005-MY",
        "data": {
            "Pump_speed":     30.0,
            "Flow_1":         3.5,
            "Flow_2":         3.2,
            "Pressure_1":     9.5,
            "Pressure_2":     9.0,
            "Temperature_1":  320.0,
            "Temperature_2":  318.0,
            "Rectifier_1_ON": True,
            "Rectifier_2_ON": True,
            "Rectifier_1_Vol":  20.0,
            "Rectifier_1_Amps": 7.0,
            "Rectifier_2_Vol":  19.5,
            "Rectifier_2_Amps": 6.8,
        },
        "minutes_ago": 4,
    },
    {
        "client_id": "CDS",
        "asset_id":  "EO006-MY",
        "data": {
            "Pump_speed":     0.0,
            "Flow_1":         0.0,
            "Flow_2":         1.0,
            "Pressure_1":     8.0,
            "Pressure_2":     7.8,
            "Temperature_1":  305.0,
            "Temperature_2":  303.0,
            "Rectifier_1_ON": False,
            "Rectifier_2_ON": False,
            "Rectifier_1_Vol":  0.0,
            "Rectifier_1_Amps": 0.0,
            "Rectifier_2_Vol":  0.0,
            "Rectifier_2_Amps": 0.0,
        },
        "minutes_ago": 10,
    },
]


def seed(table):
    print("Seeding mock data...")
    for device in MOCK_DEVICES:
        client_id = device["client_id"]
        asset_id  = device["asset_id"]
        pk        = f"{client_id}#{asset_id}"
        item = {
            "pk":        pk,
            "asset_id":  asset_id,
            "client_id": client_id,
            "data":      json.dumps(device["data"]),
            "timestamp": ts(device["minutes_ago"]),
        }
        table.put_item(Item=item)
        print(f"  Inserted: {pk}")
    print(f"\nDone. {len(MOCK_DEVICES)} devices seeded into '{PROJECTS_TABLE}'.")


if __name__ == "__main__":
    tbl = recreate_table()
    seed(tbl)
