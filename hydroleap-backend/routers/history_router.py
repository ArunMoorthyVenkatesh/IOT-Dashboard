# hydroleap-backend/routers/history_router.py

from fastapi import APIRouter, HTTPException
from models.project_model import ProjectModel
from models.project_history_model import ProjectHistoryModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
import os

# Load environment variables (AWS keys, etc) from .env file
from dotenv import load_dotenv
load_dotenv()

import boto3
import json

router = APIRouter()

# Debug: print AWS identity to confirm credentials in use
try:
    print("Current boto3 identity:", boto3.client("sts").get_caller_identity())
except Exception as e:
    print("Could not fetch AWS identity:", e)

# DynamoDB setup
DYNAMODB_REGION = os.environ.get("AWS_REGION", "us-east-1")
PROJECTS_TABLE = "Projects"
HISTORY_TABLE = "ProjectHistory"

dynamodb = boto3.resource("dynamodb", region_name=DYNAMODB_REGION)
projects_table = dynamodb.Table(PROJECTS_TABLE)
history_table = dynamodb.Table(HISTORY_TABLE)

# Helper to convert all floats in nested structures to Decimal
def convert_floats_to_decimal(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimal(i) for i in obj]
    else:
        return obj

def log_history(project: ProjectModel, action: str, changedBy: Optional[str] = None):
    changedAt = datetime.utcnow().isoformat()
    history_item = {
        "projectId": project.projectId,
        "changedAt": changedAt,
        "historyId": str(uuid.uuid4()),
        "action": action,
        "snapshot": convert_floats_to_decimal(project.dict(by_alias=True)),
        "changedBy": changedBy or "",
    }
    history_table.put_item(Item=history_item)

@router.post("/projects", response_model=ProjectModel)
def create_project(project: ProjectModel, changedBy: Optional[str] = None):
    try:
        item = convert_floats_to_decimal(project.dict(by_alias=True))
        projects_table.put_item(Item=item)
        log_history(project, "create", changedBy)
        return project
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/projects/{project_id}", response_model=ProjectModel)
def update_project(project_id: str, updates: Dict[str, Any], changedBy: Optional[str] = None):
    try:
        resp = projects_table.get_item(Key={"projectId": project_id})
        if "Item" not in resp:
            raise HTTPException(status_code=404, detail="Project not found")
        new_data = {**resp["Item"], **updates}
        item = convert_floats_to_decimal(new_data)
        projects_table.put_item(Item=item)
        project_obj = ProjectModel(**new_data)
        log_history(project_obj, "update", changedBy)
        return project_obj
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/projects/{project_id}")
def delete_project(project_id: str, changedBy: Optional[str] = None):
    try:
        resp = projects_table.get_item(Key={"projectId": project_id})
        project = resp.get("Item")
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        projects_table.delete_item(Key={"projectId": project_id})
        project_obj = ProjectModel(**project)
        log_history(project_obj, "delete", changedBy)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{project_id}", response_model=List[ProjectHistoryModel])
def get_history(project_id: str):
    try:
        resp = history_table.query(
            KeyConditionExpression="projectId = :pid",
            ExpressionAttributeValues={":pid": project_id},
            ScanIndexForward=False
        )
        return resp.get("Items", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import JSONResponse
from fastapi import Query
import uuid  # for log_history
from typing import Optional

@router.get("/cloudwatch/logs")
def get_all_logs(
    limit: int = Query(100, gt=0, le=10000),
    project_id: Optional[str] = Query(None)
):
    log_group = "/aws/lambda/changestreamerlogger"
    try:
        logs_client = boto3.client(
            "logs",
            region_name=os.environ.get("AWS_REGION", "us-east-1"),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )

        # Get up to 50 recent log streams
        streams_response = logs_client.describe_log_streams(
            logGroupName=log_group,
            orderBy="LastEventTime",
            descending=True,
            limit=50
        )
        streams = streams_response["logStreams"]
        if not streams:
            return {"error": "No log streams found."}

        all_filtered = []
        total_scanned = 0

        # Go through each stream
        for s in streams:
            stream_name = s["logStreamName"]
            events_response = logs_client.get_log_events(
                logGroupName=log_group,
                logStreamName=stream_name,
                startFromHead=True,
                limit=limit
            )
            for e in events_response.get("events", []):
                try:
                    parsed = json.loads(e["message"])
                    pid = parsed.get("newImage", {}).get("projectId")
                    if project_id is None or pid == project_id:
                        all_filtered.append({
                            "stream": stream_name,
                            "timestamp": e["timestamp"],
                            "data": parsed
                        })
                        total_scanned += 1
                except json.JSONDecodeError:
                    continue

        return {
            "logGroup": log_group,
            "filteredCount": len(all_filtered),
            "events": all_filtered
        }

    except Exception as e:
        return {"error": str(e)}
