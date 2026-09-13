"""routes_sensors.py — REST API endpoints for sensor data."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.database.database import get_db
from app.database import models, schemas

router = APIRouter(prefix="/api/sensors", tags=["Sensors"])


@router.get("/latest", response_model=schemas.SensorReadingOut, summary="Get latest sensor reading")
def get_latest(db: Session = Depends(get_db)):
    """Returns the most recent sensor reading from any source."""
    reading = (
        db.query(models.SensorReading)
        .order_by(models.SensorReading.timestamp.desc())
        .first()
    )
    if not reading:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No sensor readings found yet.")
    return reading


@router.get("/history", response_model=List[schemas.SensorReadingOut], summary="Get sensor history")
def get_history(
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    hours: Optional[int] = Query(24, ge=1, le=168, description="Hours of history"),
    source: Optional[str] = Query(None, description="Filter by source: SIMULATION or ESP8266"),
    db: Session = Depends(get_db),
):
    """Returns historical sensor readings, newest first."""
    since = datetime.utcnow() - timedelta(hours=hours)
    query = (
        db.query(models.SensorReading)
        .filter(models.SensorReading.timestamp >= since)
        .order_by(models.SensorReading.timestamp.desc())
    )
    if source:
        query = query.filter(models.SensorReading.source == source.upper())
    return query.limit(limit).all()


@router.post("/ingest", summary="Ingest sensor data manually (for testing)")
async def ingest_sensor(data: schemas.SensorDataIn, db: Session = Depends(get_db)):
    """
    Directly ingest a sensor reading via REST (bypasses MQTT).
    Useful for testing or integrating non-MQTT sources.
    """
    from app.main import process_sensor_data
    await process_sensor_data(data.model_dump())
    return {"status": "ok", "message": "Data ingested and Digital Twin updated."}
