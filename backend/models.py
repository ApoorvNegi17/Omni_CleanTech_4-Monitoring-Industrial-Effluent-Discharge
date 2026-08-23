from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Facility(Base):
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    location = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String, default="safe")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    monitoring_points = relationship("MonitoringPoint", back_populates="facility")
    incidents = relationship("Incident", back_populates="facility")

class MonitoringPoint(Base):
    __tablename__ = "monitoring_points"

    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"))
    name = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String, default="safe")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    facility = relationship("Facility", back_populates="monitoring_points")
    sensor_readings = relationship("SensorReading", back_populates="monitoring_point")
    incidents = relationship("Incident", back_populates="monitoring_point")

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    monitoring_point_id = Column(Integer, ForeignKey("monitoring_points.id"))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    ph = Column(Float)
    turbidity = Column(Float)
    temperature = Column(Float)
    tds = Column(Float)
    flow_rate = Column(Float)

    monitoring_point = relationship("MonitoringPoint", back_populates="sensor_readings")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_code = Column(String, unique=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"))
    monitoring_point_id = Column(Integer, ForeignKey("monitoring_points.id"), nullable=True)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)
    issue = Column(String)
    risk_score = Column(Integer)
    risk_level = Column(String)
    status = Column(String, default="Open")
    description = Column(String, nullable=True)

    facility = relationship("Facility", back_populates="incidents")
    monitoring_point = relationship("MonitoringPoint", back_populates="incidents")
    reports = relationship("Report", back_populates="incident")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    report_content = Column(String)

    incident = relationship("Incident", back_populates="reports")
