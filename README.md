# Omni_CleanTech_4-Monitoring-Industrial-Effluent-Discharge
# AquaSentinel 🌊

### Real-Time Industrial Effluent Monitoring & Early-Warning Platform

AquaSentinel is a hackathon prototype designed to demonstrate how **real-time sensor monitoring, anomaly detection, risk assessment, source-to-impact analysis, and automated incident reporting** can help identify abnormal industrial effluent discharge at an early stage.

Industrial effluent can enter rivers and other water bodies without being detected immediately. AquaSentinel aims to provide a centralized monitoring dashboard that converts raw sensor readings into understandable risk information and actionable incidents.

---

## 🚨 Problem

Industrial effluent discharge into water bodies can remain unnoticed until significant environmental damage occurs.

Traditional monitoring approaches may depend heavily on:

* Periodic inspections
* Manual data analysis
* Fixed thresholds
* Delayed reporting
* Large volumes of raw sensor data

AquaSentinel demonstrates a more proactive approach:

```text
Sensor Data
     ↓
Facility Behaviour
     ↓
Anomaly Detection
     ↓
Pollution Fingerprint
     ↓
Risk Assessment
     ↓
Source-to-Impact Analysis
     ↓
Incident Detection
     ↓
Actionable Report
```

---

## 💡 Solution

AquaSentinel provides a monitoring dashboard that can:

* Monitor industrial effluent sensor readings
* Simulate real-time sensor data
* Detect abnormal sensor behaviour
* Calculate a prototype risk score
* Identify affected parameters
* Generate incidents automatically
* Display active alerts
* Track monitoring points
* Visualize sensor trends
* Provide recommended actions
* Generate incident reports
* Monitor downstream/source-to-impact points

The project concept moves beyond a simple:

```text
Sensor → Threshold → Alert
```

and demonstrates:

```text
Sensor Data → Behaviour Analysis → Anomaly Detection
→ Risk Assessment → Incident Detection → Actionable Report
```

---

# 🎯 Key Features

## 📊 Real-Time Monitoring

Monitor important water-quality parameters:

* pH
* Turbidity
* Temperature
* TDS / Conductivity
* Flow Rate

Sensor values can be simulated in real time for the hackathon prototype.

---

## 🤖 Anomaly Detection

The prototype analyzes sensor behaviour and identifies abnormal patterns using a lightweight rule-based detection system.

Examples include:

* High turbidity
* Elevated TDS
* Sudden sensor deviation
* Multiple abnormal parameters
* Unusual flow behaviour

> The current MVP uses simulated/rule-based anomaly detection. It does not claim to be a production-trained AI model.

---

## ⚠️ Risk Assessment

AquaSentinel calculates a prototype risk score from sensor deviations.

| Risk Score | Level       |
| ---------- | ----------- |
| 0–29       | 🟢 LOW      |
| 30–59      | 🟡 MEDIUM   |
| 60–79      | 🟠 HIGH     |
| 80–100     | 🔴 CRITICAL |

The risk calculation considers factors such as:

* pH deviation
* Turbidity
* Temperature deviation
* TDS
* Flow deviation
* Number of abnormal parameters

---

## 🚨 Automatic Incident Detection

When a significant anomaly is detected, the backend can automatically create an incident.

An incident contains:

* Incident ID
* Facility
* Monitoring point
* Detection time
* Issue
* Risk score
* Risk level
* Description
* Status

Users can investigate and resolve incidents through the dashboard.

---

## 🗺️ Source-to-Impact Monitoring

The system represents the relationship between:

```text
Industrial Facility
       ↓
Discharge Point
       ↓
Monitoring Point
       ↓
Downstream Monitoring Point
       ↓
Water Body / Community
```

Monitoring points can display:

* Location
* Current sensor values
* Risk score
* Status
* Facility information

---

## 📑 Incident Reports

AquaSentinel can generate structured incident reports containing:

* Incident information
* Facility information
* Monitoring point
* Detection timestamp
* Sensor readings
* Detected anomaly
* Risk score
* Risk level
* Affected parameters
* Recommended actions

Reports can be printed directly through the browser.

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │   Sensor / ESP32    │
                    │   Simulated Data    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   FastAPI Backend   │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      Sensor Processing   Risk Engine     Anomaly Detector
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Database       │
                    │       SQLite        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     WebSocket       │
                    │   Live Streaming    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Web Dashboard      │
                    │ HTML/CSS/JavaScript │
                    └─────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

* HTML5
* CSS3
* Vanilla JavaScript
* Chart.js
* Leaflet.js

## Backend

* Python
* FastAPI
* Uvicorn
* SQLAlchemy
* Pydantic

## Data

* SQLite
* Simulated sensor data

## Real-Time Communication

* FastAPI WebSockets

## Prototype Intelligence

* Rule-based risk engine
* Basic anomaly detection
* Moving-average comparison
* Threshold deviation analysis

---

# 📁 Project Structure

```text
AquaSentinel/
│
├── index.html
├── style.css
├── script.js
│
├── assets/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── crud.py
│   ├── sensor_simulator.py
│   ├── risk_engine.py
│   ├── anomaly_detector.py
│   ├── action_engine.py
│   ├── aquasentinel.db
│   ├── requirements.txt
│   ├── .env
│   └── README.md
│
└── README.md
```

---

# 🚀 Getting Started

## 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd AquaSentinel
```

---

## 2. Create a Virtual Environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## 3. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

---

## 4. Start the Backend

```bash
uvicorn main:app --reload
```

The backend should run at:

```text
http://localhost:8000
```

---

# 📚 API Documentation

FastAPI automatically provides interactive API documentation.

Open:

```text
http://localhost:8000/docs
```

You can use Swagger UI to test the APIs directly.

---

# 🔌 Important API Endpoints

## System

```text
GET /api/health
GET /api/system/status
```

## Dashboard

```text
GET /api/dashboard/summary
```

## Facilities

```text
GET /api/facilities
GET /api/facilities/{facility_id}
```

## Monitoring Points

```text
GET /api/monitoring-points
GET /api/monitoring-points/{point_id}
GET /api/map/points
```

## Sensors

```text
GET /api/sensors/latest
GET /api/sensors/live
GET /api/sensors/{point_id}
GET /api/sensors/{point_id}/history
```

## Risk

```text
GET /api/risk/summary
```

## Incidents

```text
GET /api/incidents
GET /api/incidents/{incident_id}
GET /api/incidents/{incident_id}/details
POST /api/incidents/{incident_id}/resolve
```

## Reports

```text
GET /api/reports
GET /api/reports/{report_id}
GET /api/incidents/{incident_id}/report
POST /api/reports/{incident_id}
```

## Simulation

```text
POST /api/simulation/start
POST /api/simulation/stop
GET /api/simulation/status
```

## WebSocket

```text
ws://localhost:8000/ws/sensors
```

---

# 🧪 Simulation Mode

Because this is a hackathon MVP, real industrial sensors are not required.

The prototype uses simulated sensor data representing:

* pH
* Turbidity
* Temperature
* TDS
* Flow Rate

The simulation generates continuously changing readings and stores them in the database.

Anomaly conditions can be triggered to demonstrate the complete detection workflow.

---

# ⚡ Demo Flow

A typical hackathon demonstration can follow this sequence:

### Step 1 — Open Dashboard

The dashboard displays:

* Monitoring points
* Active alerts
* Overall risk
* Current sensor readings

### Step 2 — Start Monitoring

The backend begins generating simulated sensor readings.

### Step 3 — Observe Live Data

Sensor values update through WebSocket communication.

### Step 4 — Trigger an Anomaly

Use the frontend's anomaly simulation functionality.

For example:

```text
Turbidity ↑
TDS ↑
      ↓
Anomaly Detected
      ↓
Risk Score ↑
      ↓
HIGH RISK
```

### Step 5 — Incident Created

The backend automatically creates an incident.

### Step 6 — Alert

The dashboard displays:

```text
⚠ Abnormal discharge detected
```

### Step 7 — Investigate

Open the incident to see:

* Sensor readings
* Risk score
* Detected anomaly
* Affected parameters
* Recommended actions

### Step 8 — Generate Report

Generate and print the incident report.

---

# 🔄 Data Flow

```text
Simulated Sensors
       │
       ▼
Sensor Reading
       │
       ▼
FastAPI Backend
       │
       ├──────────────► Database
       │
       ▼
Risk Engine
       │
       ▼
Anomaly Detector
       │
       ├── Normal ─────► Continue Monitoring
       │
       └── Abnormal
              │
              ▼
        Incident Created
              │
              ▼
        WebSocket Event
              │
              ▼
        Dashboard Alert
              │
              ▼
        Incident Report
```

---

# 🌱 Impact

AquaSentinel is designed around the idea of earlier detection of abnormal industrial discharge.

Potential benefits include:

### Communities

* Faster awareness of abnormal discharge
* Reduced prolonged exposure to potentially contaminated water
* Safer downstream environments

### Pollution Control Authorities

* Prioritized high-risk incidents
* Timestamped sensor evidence
* Reduced dependence on manual inspection

### Water-Resource Managers

* Continuous monitoring
* Historical water-quality data
* Better visibility of downstream conditions

### Aquatic Ecosystems

* Earlier identification of abnormal discharge
* Potentially reduced duration of harmful exposure
* Long-term monitoring datasets

The project concept identifies these stakeholder and environmental benefits as key impacts.

---

# 🔮 Future Scope

The current project is a hackathon MVP. A production version could extend the system with:

* Real ESP32 sensor integration
* MQTT-based IoT communication
* PostgreSQL + TimescaleDB
* Real machine-learning anomaly detection
* Facility-specific discharge fingerprints
* Advanced source-to-impact modelling
* Multi-point pollution propagation analysis
* Role-based access control
* Cloud deployment
* Automated authority notifications
* Advanced environmental analytics

The original project architecture proposes ESP32, pH, turbidity, temperature, TDS/conductivity and flow sensors, along with MQTT/WebSockets and PostgreSQL/TimescaleDB for a more complete deployment.

---

# ⚠️ Prototype Disclaimer

AquaSentinel is a **hackathon prototype and demonstration system**.

Sensor values, risk thresholds, anomaly detection and recommendations are intended for demonstration purposes and should not be interpreted as official environmental or regulatory measurements.

Real-world deployment would require:

* Properly calibrated sensors
* Validated environmental thresholds
* Reliable communication infrastructure
* Regulatory compliance
* Field testing
* Domain-expert validation
* Secure and reliable data storage

---

# 👥 Team

### Team: Odysseus

**Members:**

* Aaryan Rawat
* Apoorv Negi

**Theme:**
Omni_CleanTech_4 — Monitoring Industrial Effluent Discharge

---

# 📚 References

The project concept references:

* WHO — Water Quality Monitoring
* UN-Water — Ambient Water Quality Monitoring
* WHO — Water Quality & Risk Management
* WHO — Industrial Wastewater Research

These references support the project's focus on systematic monitoring, risk-based management and environmental protection.

---

# ⭐ Project Vision

> **Detect early. Understand risk. Protect water.**

AquaSentinel aims to demonstrate how sensor data can be transformed into meaningful environmental intelligence, helping shift industrial effluent monitoring from delayed detection toward proactive early warning.
