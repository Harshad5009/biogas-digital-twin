"""routes_prediction.py — REST API endpoints for predictions."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database.database import get_db
from app.database import models, schemas
from app.digital_twin.twin import digital_twin
from app.analytics.prediction import predict_gas_production, predict_temperature

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


@router.get("/", summary="Get latest predictions")
def get_predictions():
    """
    Returns current predictions for gas production and temperature.
    All predictions are clearly labeled as simulation-based.
    """
    gas_hist = list(digital_twin._gas_history)
    temp_hist = list(digital_twin._temp_history)

    gas_pred = predict_gas_production(gas_hist) if len(gas_hist) >= 5 else None
    temp_pred = predict_temperature(temp_hist) if len(temp_hist) >= 5 else None

    return {
        "gas_production": gas_pred,
        "temperature": temp_pred,
        "disclaimer": (
            "All predictions are based on SIMULATION DATA. "
            "They do not represent real experimental measurements."
        ),
    }


@router.get("/history", response_model=List[schemas.PredictionOut], summary="Get prediction history")
def get_prediction_history(limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(models.Prediction)
        .order_by(models.Prediction.timestamp.desc())
        .limit(limit)
        .all()
    )
