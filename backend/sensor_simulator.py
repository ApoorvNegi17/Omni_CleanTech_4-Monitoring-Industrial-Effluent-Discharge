import asyncio
import random
import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import crud
from risk_engine import calculate_risk
from anomaly_detector import detect_anomaly
from websocket_manager import manager

SIMULATION_RUNNING = False
SIMULATION_TASK = None
FORCE_ANOMALY = False

async def simulation_loop():
    global SIMULATION_RUNNING, FORCE_ANOMALY
    while SIMULATION_RUNNING:
        db = SessionLocal()
        try:
            points = db.query(models.MonitoringPoint).all()
            for point in points:
                # Base ranges
                ph = 7.0 + random.uniform(-0.2, 0.2)
                turbidity = 10.0 + random.uniform(-2, 2)
                temperature = 25.0 + random.uniform(-1, 1)
                tds = 400.0 + random.uniform(-10, 10)
                flow = 80.0 + random.uniform(-5, 5)

                if FORCE_ANOMALY and point.id == 1:
                    # Inject a serious spike for point 1
                    turbidity = 85.0 + random.uniform(-5, 5)
                    tds = 950.0 + random.uniform(-20, 20)
                    ph = 5.5 + random.uniform(-0.1, 0.1)
                
                # Check history
                history = crud.get_sensor_history(db, point.id, limit=5)
                history_dicts = [
                    {"ph": r.ph, "turbidity": r.turbidity, "temperature": r.temperature, "tds": r.tds, "flow_rate": r.flow_rate}
                    for r in history
                ]
                
                current_dict = {"ph": ph, "turbidity": turbidity, "temperature": temperature, "tds": tds, "flow_rate": flow}
                
                # Detect anomaly
                anomaly_res = detect_anomaly(current_dict, history_dicts)
                
                # Calculate Risk
                risk_res = calculate_risk(ph, turbidity, temperature, tds, flow)
                
                # Create reading
                reading = models.SensorReading(
                    monitoring_point_id=point.id,
                    ph=ph,
                    turbidity=turbidity,
                    temperature=temperature,
                    tds=tds,
                    flow_rate=flow
                )
                db.add(reading)
                
                # Update point status based on risk
                point.status = "critical" if risk_res["risk_level"] == "CRITICAL" else ("warning" if risk_res["risk_level"] in ["HIGH", "MEDIUM"] else "safe")
                
                # Broadcast Sensor Update via WebSocket
                asyncio.create_task(manager.broadcast({
                    "type": "sensor_update",
                    "timestamp": datetime.datetime.utcnow().isoformat(),
                    "monitoring_point_id": point.id,
                    "facility": point.facility.name if point.facility else f"Facility {point.facility_id}",
                    "ph": round(ph, 2),
                    "turbidity": round(turbidity, 2),
                    "temperature": round(temperature, 2),
                    "tds": round(tds, 2),
                    "flow_rate": round(flow, 2),
                    "risk_score": risk_res["risk_score"],
                    "risk_level": risk_res["risk_level"]
                }))
                
                # Incident creation logic
                if anomaly_res["is_anomaly"] and risk_res["risk_level"] in ["HIGH", "CRITICAL"]:
                    # Check for existing open incident for this point
                    existing = db.query(models.Incident).filter(
                        models.Incident.monitoring_point_id == point.id,
                        models.Incident.status.in_(["Open", "Investigating"])
                    ).first()
                    
                    if not existing:
                        incident_code = f"INC-AUTO-{int(datetime.datetime.utcnow().timestamp())}"
                        new_incident = models.Incident(
                            incident_code=incident_code,
                            facility_id=point.facility_id,
                            monitoring_point_id=point.id,
                            issue=anomaly_res["type"],
                            risk_score=risk_res["risk_score"],
                            risk_level=risk_res["risk_level"],
                            status="Open",
                            description=f"Automatic detection. Reasons: {', '.join(risk_res['reasons'])}"
                        )
                        db.add(new_incident)
                        db.commit() # commit early to ensure it's saved before broadcast
                        
                        # Broadcast Incident Event via WebSocket
                        asyncio.create_task(manager.broadcast({
                            "type": "incident",
                            "incident_code": incident_code,
                            "risk_level": risk_res["risk_level"],
                            "issue": anomaly_res["type"],
                            "monitoring_point_id": point.id
                        }))

            db.commit()
            
            # Reset forced anomaly after one tick so it's a spike
            if FORCE_ANOMALY:
                FORCE_ANOMALY = False

        except Exception as e:
            print(f"Simulation loop error: {e}")
        finally:
            db.close()
            
        await asyncio.sleep(5)

def start_simulation():
    global SIMULATION_RUNNING, SIMULATION_TASK
    if not SIMULATION_RUNNING:
        SIMULATION_RUNNING = True
        SIMULATION_TASK = asyncio.create_task(simulation_loop())
        return True
    return False

def stop_simulation():
    global SIMULATION_RUNNING, SIMULATION_TASK
    if SIMULATION_RUNNING:
        SIMULATION_RUNNING = False
        if SIMULATION_TASK:
            SIMULATION_TASK.cancel()
            SIMULATION_TASK = None
        return True
    return False

def get_simulation_status():
    global SIMULATION_RUNNING
    return {"running": SIMULATION_RUNNING}

def trigger_anomaly():
    global FORCE_ANOMALY
    FORCE_ANOMALY = True
    return {"status": "anomaly scheduled for next tick"}
