"""routes_twin.py — REST API endpoints for Digital Twin state."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database.database import get_db
from app.database import models, schemas
from app.digital_twin.twin import digital_twin

router = APIRouter(prefix="/api/twin", tags=["Digital Twin"])


@router.get("/state", summary="Get current Digital Twin state")
def get_twin_state():
    """
    Returns the live in-memory Digital Twin state.
    This is the authoritative current state of the virtual digester.
    """
    return digital_twin.to_dict()


@router.get("/health", summary="Get transparent health score breakdown")
def get_health():
    """
    Returns the health score with all contributing factors documented.
    The score is NOT a black box — each factor is listed with its contribution.
    """
    detail = digital_twin.get_health_detail()
    return detail


@router.get("/history", response_model=List[schemas.TwinStateOut], summary="Get twin state history")
def get_twin_history(limit: int = 100, db: Session = Depends(get_db)):
    """Returns historical Digital Twin state snapshots from the database."""
    return (
        db.query(models.DigitalTwinState)
        .order_by(models.DigitalTwinState.timestamp.desc())
        .limit(limit)
        .all()
    )
