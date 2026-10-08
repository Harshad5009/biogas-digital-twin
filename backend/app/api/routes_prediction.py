"""routes_prediction.py — REST API endpoints for predictions."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database.database import get_db
from app.database import models, schemas
from app.digital_twin.twin import digital_twin
from app.analytics.prediction import predict_gas_production, predict_temperature, predict_mq5

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


@router.get("/", summary="Get latest predictions from real or simulation data")
def get_predictions():
    """
    Returns current predictions for gas production, temperature, and MQ-5.
    Predictions are labeled as LIVE or SIMULATION depending on the active data source.
    """
    gas_hist = list(digital_twin._gas_history)
    temp_hist = list(digital_twin._temp_history)
    mq5_hist = list(digital_twin._mq5_history)

    is_live = digital_twin.get_effective_data_source() in ["LIVE", "ESP8266"]

    gas_pred = predict_gas_production(gas_hist, is_live=is_live) if len(gas_hist) >= 5 else None
    temp_pred = predict_temperature(temp_hist, is_live=is_live) if len(temp_hist) >= 5 else None
    mq5_pred = predict_mq5(mq5_hist, is_live=is_live) if len(mq5_hist) >= 5 else None

    return {
        "gas_production": gas_pred,
        "temperature": temp_pred,
        "mq5": mq5_pred,
        "data_source": "LIVE" if is_live else "SIMULATION",
        "disclaimer": (
            "Predictions computed from trained Machine Learning models (Random Forest & Gradient Boosting)."
            if is_live else
            "Predictions based on active simulation scenario using trained Machine Learning models."
        ),
    }


@router.get("/models", summary="Get trained machine learning models metadata")
def get_trained_models_info():
    """Returns training parameters, R² accuracy scores, and feature importances for all trained ML models."""
    from app.analytics.prediction import get_model_metadata
    return get_model_metadata()


@router.get("/history", response_model=List[schemas.PredictionOut], summary="Get prediction history")
def get_prediction_history(limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(models.Prediction)
        .order_by(models.Prediction.timestamp.desc())
        .limit(limit)
        .all()
    )
