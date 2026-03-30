"""
seed_sensor_history.py
Creates the SensorHistory DynamoDB table and populates it with realistic
mock time-series data for all projects.

Each record stores a sensor reading event (MODIFY) with oldImage / newImage
so the frontend Audit Trail and Audit Graphs tabs render correctly.

Usage:
    cd hydroleap-backend
    python seed_sensor_history.py
"""

import boto3
import json
import math
import os
import random
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from dotenv import load_dotenv

load_dotenv()

# ── AWS setup ──────────────────────────────────────────────────────────────────

dynamodb = boto3.resource(
    "dynamodb",
    region_name=os.getenv("AWS_REGION", "us-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)
client = dynamodb.meta.client

HISTORY_TABLE = "SensorHistory"
RECORDS_PER_PROJECT = 200   # data points per project
DAYS_BACK           = 30    # spread records over last 30 days

# ── Projects to seed ───────────────────────────────────────────────────────────

PROJECTS = [
    {"asset_id": "EO009-SG", "client_id": "PUB_CT",  "base_pump": 42, "both_rect": False},
    {"asset_id": "EO010-SG", "client_id": "PUB_CT",  "base_pump":  0, "both_rect": False},
    {"asset_id": "EO001-AU", "client_id": "HYDRO",   "base_pump": 78, "both_rect": True},
    {"asset_id": "EO002-AU", "client_id": "HYDRO",   "base_pump": 55, "both_rect": False},
    {"asset_id": "EO005-MY", "client_id": "CDS",     "base_pump": 30, "both_rect": True},
    {"asset_id": "EO006-MY", "client_id": "CDS",     "base_pump":  0, "both_rect": False},
]

# ── Table management ───────────────────────────────────────────────────────────

def ensure_sensor_history_table():
    try:
        desc = client.describe_table(TableName=HISTORY_TABLE)
        keys = {k["AttributeName"] for k in desc["Table"]["KeySchema"]}
        if keys == {"asset_id", "timestamp"}:
            print(f"  Table '{HISTORY_TABLE}' already exists with correct schema.")
            return dynamodb.Table(HISTORY_TABLE)
        print(f"  Schema mismatch ({keys}). Deleting and recreating...")
        client.delete_table(TableName=HISTORY_TABLE)
        client.get_waiter("table_not_exists").wait(TableName=HISTORY_TABLE)
    except client.exceptions.ResourceNotFoundException:
        print(f"  Table '{HISTORY_TABLE}' not found. Creating...")

    client.create_table(
        TableName=HISTORY_TABLE,
        KeySchema=[
            {"AttributeName": "asset_id",  "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "asset_id",  "AttributeType": "S"},
            {"AttributeName": "timestamp", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    client.get_waiter("table_exists").wait(TableName=HISTORY_TABLE)
    print(f"  Created '{HISTORY_TABLE}'.")
    return dynamodb.Table(HISTORY_TABLE)

# ── Sensor value generator ─────────────────────────────────────────────────────

def smooth(base, amp, t, period=24.0, noise=1.0):
    """Smooth sinusoidal value + small random noise, clamped >= 0."""
    val = base + amp * math.sin(2 * math.pi * t / period) + random.gauss(0, noise)
    return round(max(0.0, val), 2)

def gen_sensor_state(proj, t_hours, rng):
    """Generate a realistic sensor reading for a project at time t_hours."""
    base = proj["base_pump"]
    is_running = base > 0

    # Pump speed: sinusoidal variation around base
    pump = smooth(base, base * 0.18, t_hours, period=12, noise=base * 0.04) if is_running else 0.0

    # Flow rates: correlated with pump speed
    flow_ratio = pump / (base or 1)
    f1 = round(max(0.0, 6.0 * flow_ratio + random.gauss(0, 0.3)), 2)
    f2 = round(max(0.0, 5.5 * flow_ratio + random.gauss(0, 0.25)), 2)

    # Pressures: slightly offset from flow
    p1 = smooth(12.0 * flow_ratio, 2.5 * flow_ratio, t_hours, period=8,  noise=0.4)
    p2 = smooth(11.0 * flow_ratio, 2.2 * flow_ratio, t_hours, period=8,  noise=0.35)

    # Temperatures: slow daily cycle
    temp1 = smooth(335.0, 18.0, t_hours, period=24, noise=2.0)
    temp2 = smooth(332.0, 16.0, t_hours, period=24, noise=1.8)

    # Rectifiers
    r1_on = is_running
    r2_on = is_running and proj["both_rect"]

    r1_vol  = smooth(24.0, 4.0, t_hours, period=6, noise=0.5)  if r1_on else 0.0
    r1_amps = smooth(9.5,  2.5, t_hours, period=6, noise=0.3)  if r1_on else 0.0
    r2_vol  = smooth(23.0, 3.8, t_hours, period=6, noise=0.5)  if r2_on else 0.0
    r2_amps = smooth(8.8,  2.2, t_hours, period=6, noise=0.3)  if r2_on else 0.0

    return {
        "asset_id":       proj["asset_id"],
        "client_id":      proj["client_id"],
        "Pump_speed":     round(pump, 2),
        "Flow_1":         f1,
        "Flow_2":         f2,
        "Pressure_1":     p1,
        "Pressure_2":     p2,
        "Temperature_1":  round(temp1, 2),
        "Temperature_2":  round(temp2, 2),
        "Rectifier_1_ON": r1_on,
        "Rectifier_2_ON": r2_on,
        "Rectifier_1_Vol":  round(r1_vol, 2),
        "Rectifier_1_Amps": round(r1_amps, 2),
        "Rectifier_2_Vol":  round(r2_vol, 2),
        "Rectifier_2_Amps": round(r2_amps, 2),
    }

def diff_label(old_val, new_val):
    if isinstance(new_val, bool):
        return "STATUS_CHANGE"
    if abs(new_val - old_val) > 5:
        return "SPIKE"
    if abs(new_val - old_val) > 2:
        return "CHANGE"
    return "MODIFY"

# ── Seeding ────────────────────────────────────────────────────────────────────

def seed(table):
    total = 0
    now = datetime.utcnow()
    interval_minutes = (DAYS_BACK * 24 * 60) / RECORDS_PER_PROJECT

    for proj in PROJECTS:
        print(f"  Seeding {proj['asset_id']} ({RECORDS_PER_PROJECT} records)…")
        rng = random.Random(proj["asset_id"])  # reproducible per project

        prev_state = None
        with table.batch_writer() as batch:
            for i in range(RECORDS_PER_PROJECT):
                # Spread records evenly across the last 30 days
                minutes_ago = DAYS_BACK * 24 * 60 - i * interval_minutes
                ts = (now - timedelta(minutes=minutes_ago)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
                t_hours = (now - timedelta(minutes=minutes_ago)).hour + (now - timedelta(minutes=minutes_ago)).minute / 60.0

                new_state = gen_sensor_state(proj, t_hours, rng)

                if prev_state is None:
                    old_state = {k: (v * 0.95 if isinstance(v, float) else v)
                                 for k, v in new_state.items()}
                else:
                    old_state = prev_state

                # Pick a descriptive event name
                event_name = "INSERT" if i == 0 else diff_label(
                    old_state.get("Pump_speed", 0), new_state.get("Pump_speed", 0)
                )

                item = {
                    "asset_id":   proj["asset_id"],
                    "timestamp":  ts,
                    "record_id":  str(uuid.uuid4()),
                    "event_name": event_name,
                    "old_image":  json.dumps(old_state),
                    "new_image":  json.dumps(new_state),
                }
                batch.put_item(Item=item)
                prev_state = new_state
                total += 1

        print(f"    ✓ {proj['asset_id']} done")

    print(f"\nSeeded {total} total records into '{HISTORY_TABLE}'.")


if __name__ == "__main__":
    print(f"Creating / verifying '{HISTORY_TABLE}' table…")
    tbl = ensure_sensor_history_table()
    print(f"\nSeeding {RECORDS_PER_PROJECT} records × {len(PROJECTS)} projects…")
    seed(tbl)
    print("\nAll done!")
