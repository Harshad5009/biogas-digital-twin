"""routes_health.py — REST API endpoints for system and digester health."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database.database import get_db
from app.database import models, schemas
from app.digital_twin.twin import digital_twin
from app.mqtt.client import mqtt_client
from app.simulation.simulator import simulator, _simulation_running
from app.config import settings

router = APIRouter(prefix="/api", tags=["System"])


@router.get("/system/status", response_model=schemas.SystemStatusOut, summary="Get system status")
def get_system_status(db: Session = Depends(get_db)):
    """Returns the overall system health: backend, MQTT, database, simulation."""
    # Test DB
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # Last reading timestamp
    last = (
        db.query(models.SensorReading.timestamp)
        .order_by(models.SensorReading.timestamp.desc())
        .first()
    )

    source = "SIMULATION" if _simulation_running else "ESP8266" if mqtt_client.is_connected else "NONE"

    return schemas.SystemStatusOut(
        backend="ONLINE",
        mqtt_connected=mqtt_client.is_connected,
        simulation_active=_simulation_running,
        database_ok=db_ok,
        digester_id=settings.DIGESTER_ID,
        last_data_received=last[0] if last else None,
        data_source=source,
    )


@router.get("/anomalies", response_model=List[schemas.AlertOut], summary="Get recent anomaly alerts")
def get_anomalies(limit: int = 50, db: Session = Depends(get_db)):
    """Returns recent alerts — includes anomaly detections and threshold violations."""
    return (
        db.query(models.Alert)
        .order_by(models.Alert.timestamp.desc())
        .limit(limit)
        .all()
    )


@router.post("/anomalies/{alert_id}/acknowledge", summary="Acknowledge an alert")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    db.commit()
    return {"status": "ok", "alert_id": alert_id}
