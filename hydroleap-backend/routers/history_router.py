# hydroleap-backend/routers/history_router.py

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from models.project_model import ProjectModel
from models.project_history_model import ProjectHistoryModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
import os
import uuid
import json

from dotenv import load_dotenv
load_dotenv()

import boto3

router = APIRouter()

# Debug: confirm AWS credentials on startup
try:
    print("Current boto3 identity:", boto3.client("sts").get_caller_identity())
except Exception as e:
    print("Could not fetch AWS identity:", e)

DYNAMODB_REGION  = os.environ.get("AWS_REGION", "us-east-1")
PROJECTS_TABLE   = "Projects"
HISTORY_TABLE    = "ProjectHistory"
SENSOR_HIST_TABLE = "SensorHistory"

dynamodb            = boto3.resource("dynamodb", region_name=DYNAMODB_REGION)
projects_table      = dynamodb.Table(PROJECTS_TABLE)
history_table       = dynamodb.Table(HISTORY_TABLE)
sensor_history_table = dynamodb.Table(SENSOR_HIST_TABLE)


def convert_floats_to_decimal(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimal(i) for i in obj]
    return obj


def log_history(project: ProjectModel, action: str, changedBy: Optional[str] = None):
    changedAt = datetime.utcnow().isoformat()
    history_item = {
        "asset_id":  project.asset_id,
        "changedAt": changedAt,
        "historyId": str(uuid.uuid4()),
        "action":    action,
        "snapshot":  convert_floats_to_decimal(project.dict()),
        "changedBy": changedBy or "",
    }
    history_table.put_item(Item=history_item)


@router.post("/projects", response_model=ProjectModel)
def create_project(project: ProjectModel, changedBy: Optional[str] = None):
    try:
        item = convert_floats_to_decimal(project.dict())
        projects_table.put_item(Item=item)
        log_history(project, "create", changedBy)
        return project
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/projects/{asset_id}", response_model=ProjectModel)
def update_project(asset_id: str, updates: Dict[str, Any], changedBy: Optional[str] = None):
    try:
        # pk = client_id#asset_id — scan for matching asset_id
        resp = projects_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("asset_id").eq(asset_id)
        )
        items = resp.get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="Project not found")
        existing = items[0]
        new_data = {**existing, **updates}
        item = convert_floats_to_decimal(new_data)
        projects_table.put_item(Item=item)
        project_obj = ProjectModel(**new_data)
        log_history(project_obj, "update", changedBy)
        return project_obj
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/projects/{asset_id}")
def delete_project(asset_id: str, changedBy: Optional[str] = None):
    try:
        resp = projects_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("asset_id").eq(asset_id)
        )
        items = resp.get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="Project not found")
        project = items[0]
        projects_table.delete_item(Key={"pk": project["pk"]})
        project_obj = ProjectModel(**project)
        log_history(project_obj, "delete", changedBy)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{asset_id}", response_model=List[ProjectHistoryModel])
def get_history(asset_id: str):
    try:
        resp = history_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("asset_id").eq(asset_id),
            ScanIndexForward=False
        )
        return resp.get("Items", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cloudwatch/logs")
def get_all_logs(
    limit: int = Query(200, gt=0, le=10000),
    asset_id: Optional[str] = Query(None)
):
    """
    Returns sensor history events for the Audit Trail and Audit Graphs tabs.
    Reads from the SensorHistory DynamoDB table (seeded via seed_sensor_history.py).
    Falls back to CloudWatch if the table is empty or unavailable.
    """
    try:
        if asset_id:
            resp = sensor_history_table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key("asset_id").eq(asset_id),
                ScanIndexForward=True,
                Limit=limit,
            )
        else:
            resp = sensor_history_table.scan(Limit=limit)

        items = resp.get("Items", [])

        if items:
            events = []
            for item in items:
                try:
                    old_image = json.loads(item.get("old_image", "{}"))
                    new_image = json.loads(item.get("new_image", "{}"))
                except (json.JSONDecodeError, TypeError):
                    old_image = {}
                    new_image = {}

                events.append({
                    "stream":    item.get("asset_id", ""),
                    "timestamp": item.get("timestamp", ""),
                    "data": {
                        "eventName": item.get("event_name", "MODIFY"),
                        "oldImage":  old_image,
                        "newImage":  new_image,
                    }
                })

            return {
                "source":        "SensorHistory",
                "filteredCount": len(events),
                "events":        events,
            }

    except Exception as db_err:
        print(f"[cloudwatch/logs] SensorHistory read failed: {db_err}. Falling back to CloudWatch.")

    # ── CloudWatch fallback ────────────────────────────────────────────────────
    log_group = "/aws/lambda/changestreamerlogger"
    try:
        logs_client = boto3.client(
            "logs",
            region_name=os.environ.get("AWS_REGION", "us-east-1"),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
        streams_response = logs_client.describe_log_streams(
            logGroupName=log_group,
            orderBy="LastEventTime",
            descending=True,
            limit=50,
        )
        streams = streams_response.get("logStreams", [])
        if not streams:
            return {"source": "cloudwatch", "filteredCount": 0, "events": []}

        all_filtered = []
        for s in streams:
            stream_name = s["logStreamName"]
            events_response = logs_client.get_log_events(
                logGroupName=log_group,
                logStreamName=stream_name,
                startFromHead=True,
                limit=limit,
            )
            for e in events_response.get("events", []):
                try:
                    parsed = json.loads(e["message"])
                    aid = parsed.get("newImage", {}).get("asset_id")
                    if asset_id is None or aid == asset_id:
                        all_filtered.append({
                            "stream":    stream_name,
                            "timestamp": e["timestamp"],
                            "data":      parsed,
                        })
                except json.JSONDecodeError:
                    continue

        return {
            "source":        "cloudwatch",
            "logGroup":      log_group,
            "filteredCount": len(all_filtered),
            "events":        all_filtered,
        }

    except Exception as e:
        return {"source": "none", "error": str(e), "events": []}
