from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from models.cloud_log_model import CloudLog  # SQLAlchemy model
from schemas.cloud_log_schema import CloudLogCreate, CloudLogRead  # Pydantic schemas
from database import get_db

router = APIRouter(
    prefix="/cloud_logs",
    tags=["Cloud Logs"]
)

# GET all cloud logs
@router.get("/", response_model=List[CloudLogRead])
def get_cloud_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    logs = db.query(CloudLog).offset(skip).limit(limit).all()
    return logs

# GET single cloud log by ID
@router.get("/{log_id}", response_model=CloudLogRead)
def get_cloud_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(CloudLog).filter(CloudLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
    return log

# POST create a new cloud log
@router.post("/", response_model=CloudLogRead, status_code=status.HTTP_201_CREATED)
def create_cloud_log(log: CloudLogCreate, db: Session = Depends(get_db)):
    new_log = CloudLog(**log.dict())
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log

# DELETE a cloud log
@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cloud_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(CloudLog).filter(CloudLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
    db.delete(log)
    db.commit()
    return None
