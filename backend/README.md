# AquaSentinel Backend API

This is the FastAPI backend for the AquaSentinel industrial effluent monitoring MVP.

## Technologies Used
- Python 3
- FastAPI
- Uvicorn
- SQLAlchemy
- SQLite
- Pydantic

## How to Install and Run

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the server**:
   ```bash
   uvicorn main:app --reload
   ```

## API Information

- **Backend URL**: `http://localhost:8000`
- **Swagger UI Documentation**: `http://localhost:8000/docs`

## Available APIs
- `GET /api/health`: Health check
- `GET /api/facilities`: Get all facilities
- `GET /api/facilities/{id}`: Get specific facility
- `GET /api/monitoring-points`: Get all monitoring points
- `GET /api/monitoring-points/{id}`: Get specific monitoring point
- `GET /api/sensors/latest`: Get latest sensor readings for all points
- `GET /api/sensors/{id}`: Get historical sensor readings for a specific point
- `GET /api/incidents`: Get all incidents
- `GET /api/incidents/{id}`: Get specific incident

## Data
The SQLite database (`aquasentinel.db`) is automatically created and seeded with sample data when you start the server for the first time.
