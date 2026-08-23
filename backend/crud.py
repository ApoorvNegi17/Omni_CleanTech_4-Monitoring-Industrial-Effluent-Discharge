from sqlalchemy.orm import Session
import models

def get_facility(db: Session, facility_id: int):
    return db.query(models.Facility).filter(models.Facility.id == facility_id).first()

def get_facilities(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Facility).offset(skip).limit(limit).all()

def get_monitoring_point(db: Session, point_id: int):
    return db.query(models.MonitoringPoint).filter(models.MonitoringPoint.id == point_id).first()

def get_monitoring_points(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.MonitoringPoint).offset(skip).limit(limit).all()

def get_latest_sensors(db: Session):
    points = db.query(models.MonitoringPoint).all()
    latest_readings = []
    for point in points:
        reading = db.query(models.SensorReading).filter(
            models.SensorReading.monitoring_point_id == point.id
        ).order_by(models.SensorReading.timestamp.desc()).first()
        if reading:
            latest_readings.append(reading)
    return latest_readings

def get_sensor_history(db: Session, point_id: int, limit: int = 30):
    return db.query(models.SensorReading).filter(
        models.SensorReading.monitoring_point_id == point_id
    ).order_by(models.SensorReading.timestamp.desc()).limit(limit).all()

def get_incident(db: Session, incident_id: int):
    return db.query(models.Incident).filter(models.Incident.id == incident_id).first()

def get_incidents(db: Session, skip: int = 0, limit: int = 100, status: str = None, risk: str = None):
    query = db.query(models.Incident)
    if status:
        query = query.filter(models.Incident.status.ilike(status))
    if risk:
        query = query.filter(models.Incident.risk_level.ilike(risk))
    return query.order_by(models.Incident.detected_at.desc()).offset(skip).limit(limit).all()

def resolve_incident(db: Session, incident_id: int):
    incident = get_incident(db, incident_id)
    if incident:
        incident.status = "Resolved"
        db.commit()
        db.refresh(incident)
    return incident

def get_risk_summary(db: Session):
    open_incidents = db.query(models.Incident).filter(models.Incident.status.in_(["Open", "Investigating"])).all()
    active_alerts = len(open_incidents)
    
    critical_points = db.query(models.MonitoringPoint).filter(models.MonitoringPoint.status == "critical").count()
    
    if active_alerts == 0:
        overall_risk = 20
        status = "SAFE"
    else:
        # Calculate max risk from open incidents
        max_risk = max([inc.risk_score for inc in open_incidents] + [0])
        overall_risk = max_risk
        status = "CRITICAL" if overall_risk >= 80 else ("HIGH" if overall_risk >= 60 else "WARNING")
        
    return {
        "overall_risk": overall_risk,
        "active_alerts": active_alerts,
        "critical_points": critical_points,
        "status": status
    }

import json
from action_engine import get_recommended_actions

def get_incident_details(db: Session, incident_id: int):
    incident = get_incident(db, incident_id)
    if not incident:
        return None
    
    facility_name = incident.facility.name if incident.facility else "Unknown"
    monitoring_point_name = incident.monitoring_point.name if incident.monitoring_point else "Unknown"
    
    recent_readings = []
    if incident.monitoring_point_id:
        # Get readings around the time of detection
        recent_readings = db.query(models.SensorReading).filter(
            models.SensorReading.monitoring_point_id == incident.monitoring_point_id,
            models.SensorReading.timestamp <= incident.detected_at
        ).order_by(models.SensorReading.timestamp.desc()).limit(10).all()
        
    actions = get_recommended_actions(incident.risk_level)
    
    return {
        "incident": incident,
        "facility_name": facility_name,
        "monitoring_point_name": monitoring_point_name,
        "recent_readings": recent_readings,
        "recommended_actions": actions
    }

def create_report(db: Session, incident_id: int):
    details = get_incident_details(db, incident_id)
    if not details:
        return None
    
    inc = details["incident"]
    
    content = f"""AquaSentinel Incident Report
    
Incident ID: {inc.incident_code}
Facility: {details['facility_name']}
Monitoring Point: {details['monitoring_point_name']}
Detected At: {inc.detected_at.strftime("%Y-%m-%d %H:%M:%S")}
Risk Score: {inc.risk_score}
Risk Level: {inc.risk_level}
Issue: {inc.issue}

Sensor Readings:
"""
    if details["recent_readings"]:
        r = details["recent_readings"][0]
        content += f"pH: {r.ph:.2f}\nTurbidity: {r.turbidity:.2f} NTU\nTemperature: {r.temperature:.2f} °C\nTDS: {r.tds:.2f} mg/L\nFlow Rate: {r.flow_rate:.2f} L/min\n"
    else:
        content += "No recent readings available.\n"
        
    content += f"\nDetected Anomaly: {inc.issue}\n"
    content += f"Affected Parameters: Analyzed internally.\n"
    content += f"Risk Explanation: {inc.description or 'None provided.'}\n\n"
    content += f"Recommended Actions:\n"
    for a in details["recommended_actions"]:
        content += f"- {a}\n"
        
    import datetime
    content += f"\nReport Generated At: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
    
    report = models.Report(
        incident_id=incident_id,
        report_content=content
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

def get_reports(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Report).order_by(models.Report.generated_at.desc()).offset(skip).limit(limit).all()

def get_report(db: Session, report_id: int):
    return db.query(models.Report).filter(models.Report.id == report_id).first()

def get_incident_report(db: Session, incident_id: int):
    # Returns the most recent report for an incident
    return db.query(models.Report).filter(models.Report.incident_id == incident_id).order_by(models.Report.generated_at.desc()).first()

def get_dashboard_summary(db: Session):
    points_count = db.query(models.MonitoringPoint).count()
    active_alerts = db.query(models.Incident).filter(models.Incident.status.in_(["Open", "Investigating"])).count()
    safe_facilities = db.query(models.Facility).filter(models.Facility.status == "safe").count()
    
    risk_data = get_risk_summary(db)
    
    return {
        "monitoring_points": points_count,
        "active_alerts": active_alerts,
        "safe_facilities": safe_facilities,
        "overall_risk": risk_data["overall_risk"],
        "system_status": "OPERATIONAL" if risk_data["overall_risk"] < 80 else "CRITICAL ALERT",
        "last_update": risk_data.get("last_update", "") # from system_status logic elsewhere or just use now
    }

def get_map_points(db: Session):
    points = db.query(models.MonitoringPoint).all()
    results = []
    for p in points:
        latest = db.query(models.SensorReading).filter(models.SensorReading.monitoring_point_id == p.id).order_by(models.SensorReading.timestamp.desc()).first()
        latest_dict = None
        if latest:
            latest_dict = {
                "ph": latest.ph,
                "turbidity": latest.turbidity,
                "temperature": latest.temperature,
                "tds": latest.tds,
                "flow_rate": latest.flow_rate
            }
        # mock risk score calculation for the point based on status
        risk = 20
        if p.status == "critical": risk = 90
        elif p.status == "warning": risk = 60
        
        results.append({
            "id": p.id,
            "name": p.name,
            "facility": p.facility.name if p.facility else "Unknown",
            "latitude": p.latitude,
            "longitude": p.longitude,
            "status": p.status,
            "risk_score": risk,
            "latest_readings": latest_dict
        })
    return results
