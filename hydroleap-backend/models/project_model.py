#hydroleap-backend/models/project_model.py
from pydantic import BaseModel, Field
from typing import Optional

class ProjectModel(BaseModel):
    projectId: str = Field(..., description="Unique project identifier")
    deviceId: str = Field(..., description="Unique device identifier")
    system_running: Optional[bool] = Field(None, alias="system_running")
    Pump_01: Optional[bool] = None
    FIT_01: Optional[float] = None
    Pressure: Optional[float] = None
    Temperature: Optional[float] = None
    FIT_02: Optional[float] = None
    LIT_01: Optional[float] = None
    LIT_02: Optional[float] = None
    Rectifier_01: Optional[bool] = None
    Rectifier_V: Optional[float] = None
    Rectifier_A: Optional[float] = None

    class Config:
        allow_population_by_field_name = True