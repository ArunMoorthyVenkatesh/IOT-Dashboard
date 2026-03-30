# models/company_project_access_model.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CompanyProjectAccess(BaseModel):
    company: str = Field(..., description="Company name (partition key)")
    asset_id: str = Field(..., description="Project asset_id (sort key)")
    accessGrantedAt: Optional[str] = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="ISO timestamp when access was granted"
    )
