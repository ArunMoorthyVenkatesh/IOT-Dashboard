# hydroleap-backend/models/project_model.py
from pydantic import BaseModel, Field
from typing import Optional


class SensorData(BaseModel):
    Pump_speed: Optional[float] = None
    Flow_1: Optional[float] = None
    Flow_2: Optional[float] = None
    Pressure_1: Optional[float] = None
    Pressure_2: Optional[float] = None
    Temperature_1: Optional[float] = None
    Temperature_2: Optional[float] = None
    Rectifier_1_ON: Optional[bool] = None
    Rectifier_2_ON: Optional[bool] = None
    Rectifier_1_Vol: Optional[float] = None
    Rectifier_1_Amps: Optional[float] = None
    Rectifier_2_Vol: Optional[float] = None
    Rectifier_2_Amps: Optional[float] = None


class ProjectModel(BaseModel):
    pk: str = Field(..., description="Composite key: client_id#asset_id")
    asset_id: str = Field(..., description="Device/asset identifier")
    client_id: str = Field(..., description="Company/client identifier")
    data: str = Field(..., description="JSON string of sensor readings")
    timestamp: Optional[str] = None

    class Config:
        populate_by_name = True
