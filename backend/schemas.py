from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class SensorReadingBase(BaseModel):
    monitoring_point_id: int
    ph: float
    turbidity: float
    temperature: float
    tds: float
    flow_rate: float

class SensorReading(SensorReadingBase):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class MonitoringPointBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    status: str

class MonitoringPoint(MonitoringPointBase):
    id: int
    facility_id: int
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class FacilityBase(BaseModel):
    name: str
    location: str
    latitude: float
    longitude: float
    status: str

class Facility(FacilityBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class IncidentBase(BaseModel):
    incident_code: str
    facility_id: int
    monitoring_point_id: Optional[int]
    issue: str
    risk_score: int
    risk_level: str
    status: str
    description: Optional[str]

class Incident(IncidentBase):
    id: int
    detected_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class ReportBase(BaseModel):
    incident_id: int
    report_content: str

class Report(ReportBase):
    id: int
    generated_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class IncidentDetails(BaseModel):
    incident: Incident
    facility_name: str
    monitoring_point_name: str
    recent_readings: List[SensorReading]
    recommended_actions: List[str]

class DashboardSummary(BaseModel):
    monitoring_points: int
    active_alerts: int
    safe_facilities: int
    overall_risk: int
    system_status: str
    last_update: str

class MapPoint(BaseModel):
    id: int
    name: str
    facility: str
    latitude: float
    longitude: float
    status: str
    risk_score: int
    latest_readings: Optional[dict] = None
