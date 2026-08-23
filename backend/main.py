from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import random
import datetime

import models
import schemas
import crud
from database import SessionLocal, engine, Base
from websocket_manager import manager

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AquaSentinel Backend API", version="1.0.0")

# Setup CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://127.0.0.1:3000")
origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Seed data function
def seed_data():
    db = SessionLocal()
    # Check if we already have data
    if db.query(models.Facility).count() > 0:
        db.close()
        return

    print("Seeding initial data...")
    # Create Facilities
    f1 = models.Facility(name="Plant A", location="Industrial Zone North", latitude=51.505, longitude=-0.09)
    f2 = models.Facility(name="Plant B", location="River Point 2", latitude=51.507, longitude=-0.11)
    f3 = models.Facility(name="Plant C", location="Estuary Hub", latitude=51.500, longitude=-0.08)
    db.add_all([f1, f2, f3])
    db.commit()

    # Create Monitoring Points
    mp1 = models.MonitoringPoint(facility_id=f1.id, name="Discharge Point Alpha", latitude=51.506, longitude=-0.09)
    mp2 = models.MonitoringPoint(facility_id=f2.id, name="Station Beta", latitude=51.508, longitude=-0.11)
    mp3 = models.MonitoringPoint(facility_id=f3.id, name="Station Gamma", latitude=51.501, longitude=-0.08)
    db.add_all([mp1, mp2, mp3])
    db.commit()

    # Create Sensor Readings (History)
    now = datetime.datetime.utcnow()
    readings = []
    for mp in [mp1, mp2, mp3]:
        for i in range(30):
            past_time = now - datetime.timedelta(minutes=(30 - i))
            readings.append(models.SensorReading(
                monitoring_point_id=mp.id,
                timestamp=past_time,
                ph=7.0 + random.uniform(-0.2, 0.2),
                turbidity=14.0 + random.uniform(-1, 1),
                temperature=29.0 + random.uniform(-0.5, 0.5),
                tds=420.0 + random.uniform(-10, 10),
                flow_rate=80.0 + random.uniform(-2, 2)
            ))
    db.add_all(readings)
    db.commit()

    # Create Incidents
    inc1 = models.Incident(incident_code="INC-001", facility_id=f1.id, monitoring_point_id=mp1.id, 
                           issue="High Turbidity", risk_score=88, risk_level="Critical", status="Open")
    inc2 = models.Incident(incident_code="INC-002", facility_id=f2.id, monitoring_point_id=mp2.id, 
                           issue="Conductivity Spike", risk_score=65, risk_level="Medium", status="Investigating")
    inc3 = models.Incident(incident_code="INC-003", facility_id=f3.id, monitoring_point_id=mp3.id, 
                           issue="Minor pH Fluctuation", risk_score=40, risk_level="Low", status="Resolved")
    db.add_all([inc1, inc2, inc3])
    db.commit()

    db.close()
    print("Seed data created successfully.")

# Run seed on startup
@app.on_event("startup")
def startup_event():
    seed_data()

# --- API ENDPOINTS ---

import sensor_simulator

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "AquaSentinel Backend"}

# --- SIMULATION APIs ---

@app.post("/api/simulation/start")
async def start_simulation():
    started = sensor_simulator.start_simulation()
    return {"message": "Simulation started" if started else "Simulation already running"}

@app.post("/api/simulation/stop")
async def stop_simulation():
    stopped = sensor_simulator.stop_simulation()
    return {"message": "Simulation stopped" if stopped else "Simulation not running"}

@app.get("/api/simulation/status")
async def simulation_status():
    return sensor_simulator.get_simulation_status()

@app.post("/api/simulation/trigger-anomaly")
async def trigger_anomaly():
    return sensor_simulator.trigger_anomaly()

# --- SENSOR APIs ---

@app.get("/api/sensors/live", response_model=list[schemas.SensorReading])
def read_live_sensors(db: Session = Depends(get_db)):
    return crud.get_latest_sensors(db)

@app.get("/api/sensors/latest", response_model=list[schemas.SensorReading])
def read_latest_sensors(db: Session = Depends(get_db)):
    return crud.get_latest_sensors(db)

@app.get("/api/sensors/{point_id}/history", response_model=list[schemas.SensorReading])
def read_sensor_history_alias(point_id: int, limit: int = 30, db: Session = Depends(get_db)):
    db_point = crud.get_monitoring_point(db, point_id=point_id)
    if db_point is None:
        raise HTTPException(status_code=404, detail="Monitoring point not found")
    return crud.get_sensor_history(db, point_id=point_id, limit=limit)

@app.get("/api/sensors/{point_id}", response_model=list[schemas.SensorReading])
def read_sensor_history(point_id: int, db: Session = Depends(get_db)):
    db_point = crud.get_monitoring_point(db, point_id=point_id)
    if db_point is None:
        raise HTTPException(status_code=404, detail="Monitoring point not found")
    return crud.get_sensor_history(db, point_id=point_id)

# --- FACILITY APIs ---

@app.get("/api/facilities", response_model=list[schemas.Facility])
def read_facilities(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_facilities(db, skip=skip, limit=limit)

@app.get("/api/facilities/{facility_id}", response_model=schemas.Facility)
def read_facility(facility_id: int, db: Session = Depends(get_db)):
    db_facility = crud.get_facility(db, facility_id=facility_id)
    if db_facility is None:
        raise HTTPException(status_code=404, detail="Facility not found")
    return db_facility

@app.get("/api/monitoring-points", response_model=list[schemas.MonitoringPoint])
def read_monitoring_points(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_monitoring_points(db, skip=skip, limit=limit)

@app.get("/api/monitoring-points/{point_id}", response_model=schemas.MonitoringPoint)
def read_monitoring_point(point_id: int, db: Session = Depends(get_db)):
    db_point = crud.get_monitoring_point(db, point_id=point_id)
    if db_point is None:
        raise HTTPException(status_code=404, detail="Monitoring point not found")
    return db_point

# --- INCIDENT & RISK APIs ---

@app.get("/api/incidents", response_model=list[schemas.Incident])
def read_incidents(skip: int = 0, limit: int = 100, status: str = None, risk: str = None, db: Session = Depends(get_db)):
    return crud.get_incidents(db, skip=skip, limit=limit, status=status, risk=risk)

@app.get("/api/incidents/{incident_id}", response_model=schemas.Incident)
def read_incident(incident_id: int, db: Session = Depends(get_db)):
    db_incident = crud.get_incident(db, incident_id=incident_id)
    if db_incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return db_incident

import asyncio

@app.post("/api/incidents/{incident_id}/resolve", response_model=schemas.Incident)
async def resolve_incident(incident_id: int, db: Session = Depends(get_db)):
    db_incident = crud.resolve_incident(db, incident_id=incident_id)
    if db_incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Broadcast incident_resolved
    asyncio.create_task(manager.broadcast({
        "type": "incident_resolved",
        "incident_code": db_incident.incident_code
    }))
    
    return db_incident

@app.get("/api/risk/summary")
def get_risk_summary(db: Session = Depends(get_db)):
    return crud.get_risk_summary(db)

# --- SYSTEM & WEBSOCKET APIs ---

@app.get("/api/system/status")
def get_system_status(db: Session = Depends(get_db)):
    # count active incidents
    active_incidents = db.query(models.Incident).filter(models.Incident.status.in_(["Open", "Investigating"])).count()
    monitoring_points = db.query(models.MonitoringPoint).count()
    
    return {
        "backend": "online",
        "simulation": sensor_simulator.get_simulation_status()["running"],
        "monitoring_points": monitoring_points,
        "active_incidents": active_incidents,
        "last_update": datetime.datetime.utcnow().isoformat()
    }

@app.get("/api/dashboard/summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    return crud.get_dashboard_summary(db)

@app.get("/api/map/points", response_model=list[schemas.MapPoint])
def get_map_points(db: Session = Depends(get_db)):
    return crud.get_map_points(db)

@app.get("/api/incidents/{incident_id}/details", response_model=schemas.IncidentDetails)
def get_incident_details(incident_id: int, db: Session = Depends(get_db)):
    details = crud.get_incident_details(db, incident_id)
    if details is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return details

@app.post("/api/reports/{incident_id}", response_model=schemas.Report)
def generate_report(incident_id: int, db: Session = Depends(get_db)):
    report = crud.create_report(db, incident_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return report

@app.get("/api/reports", response_model=list[schemas.Report])
def read_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_reports(db, skip=skip, limit=limit)

@app.get("/api/reports/{report_id}", response_model=schemas.Report)
def read_report(report_id: int, db: Session = Depends(get_db)):
    report = crud.get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@app.get("/api/incidents/{incident_id}/report", response_model=schemas.Report)
def read_incident_report(incident_id: int, db: Session = Depends(get_db)):
    report = crud.get_incident_report(db, incident_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found for incident")
    return report

@app.websocket("/ws/sensors")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Just keep the connection alive, wait for client messages if any
            # The actual broadcasting happens from the sensor_simulator task
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
