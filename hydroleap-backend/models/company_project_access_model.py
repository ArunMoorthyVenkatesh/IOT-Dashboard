# models/company_project_access_model.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CompanyProjectAccess(BaseModel):
    company: str = Field(..., description="Company name (partition key)")
    projectId: str = Field(..., description="Project ID (sort key)")
    accessGrantedAt: Optional[str] = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="ISO timestamp when access was granted"
    )

    # If you want to use datetime object for accessGrantedAt, change the type to datetime and parse accordingly.
