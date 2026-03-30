# hydroleap-backend/models/project_history_model.py

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class ProjectHistoryModel(BaseModel):
    historyId: str = Field(..., description="Unique history record ID (UUID)")
    asset_id: str = Field(..., description="Associated asset/device ID")
    action: str = Field(..., description="Action performed: create, update, or delete")
    snapshot: Dict[str, Any] = Field(..., description="Full snapshot of the project at the time of change")
    changedBy: Optional[str] = Field(None, description="Who performed the action")
    changedAt: str = Field(..., description="ISO8601 UTC timestamp")

    class Config:
        populate_by_name = True
