"""
prediction.py — Simple, explainable prediction model.

Uses Linear Regression (scikit-learn) on recent historical data.
Clearly labels all predictions as simulation-based.
No deep learning — keeps it understandable for academic review.
"""

from typing import List, Optional, Dict, Any
import numpy as np

try:
    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import r2_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


def predict_gas_production(
    recent_values: List[float],
    steps_ahead: int = 12,   # Number of future readings to predict
    reading_interval_sec: int = 5,
) -> Dict[str, Any]:
    """
    Predict future gas production using Linear Regression.

    Args:
        recent_values:        Last N gas production readings (L/min, simulated)
        steps_ahead:          How many future readings to project
        reading_interval_sec: Time between readings in seconds

    Returns dict with prediction details, always labeled as simulation-based.
    """
    horizon_minutes = (steps_ahead * reading_interval_sec) / 60.0
    if horizon_minutes >= 60:
        horizon_label = f"{horizon_minutes/60:.0f}h"
    else:
        horizon_label = f"{horizon_minutes:.0f}min"

    base_note = (
        "NOTE: This prediction is based on SIMULATION DATA only. "
        "It does not represent real experimental measurements."
    )

    if len(recent_values) < 5:
        return {
            "parameter": "gas_production",
            "current_value": recent_values[-1] if recent_values else None,
            "predicted_value": recent_values[-1] if recent_values else None,
            "horizon": horizon_label,
            "trend": "STABLE",
            "confidence": None,
            "model_type": "Insufficient data",
            "data_note": base_note,
            "message": "Need at least 5 readings for prediction.",
        }

    if not SKLEARN_AVAILABLE:
        # Fallback: simple linear extrapolation without sklearn
        x = np.arange(len(recent_values), dtype=float)
        y = np.array(recent_values, dtype=float)
        coeffs = np.polyfit(x, y, 1)
        slope, intercept = coeffs
        future_x = len(recent_values) + steps_ahead - 1
        predicted = float(slope * future_x + intercept)
        model_type = "Linear Extrapolation (numpy)"
        confidence = None
    else:
        # scikit-learn Linear Regression
        x = np.arange(len(recent_values), dtype=float).reshape(-1, 1)
        y = np.array(recent_values, dtype=float)
        model = LinearRegression()
        model.fit(x, y)
        future_x = np.array([[len(recent_values) + steps_ahead - 1]])
        predicted = float(model.predict(future_x)[0])
        y_pred_hist = model.predict(x)
        r2 = float(r2_score(y, y_pred_hist))
        confidence = round(max(0.0, r2), 3)
        model_type = "Linear Regression (scikit-learn)"

    predicted = max(0.0, predicted)
    current = float(recent_values[-1])

    # Determine trend
    delta_pct = (predicted - current) / (abs(current) or 1.0) * 100.0
    if delta_pct > 3:
        trend = "INCREASING"
    elif delta_pct < -3:
        trend = "DECREASING"
    else:
        trend = "STABLE"

    return {
        "parameter": "gas_production",
        "current_value": round(current, 3),
        "predicted_value": round(predicted, 3),
        "horizon": horizon_label,
        "trend": trend,
        "confidence": confidence if SKLEARN_AVAILABLE else None,
        "model_type": model_type,
        "data_note": base_note,
    }


def predict_temperature(
    recent_values: List[float],
    steps_ahead: int = 12,
    reading_interval_sec: int = 5,
) -> Dict[str, Any]:
    """Predict temperature trend using the same Linear Regression approach."""
    horizon_minutes = (steps_ahead * reading_interval_sec) / 60.0
    horizon_label = f"{horizon_minutes:.0f}min" if horizon_minutes < 60 else f"{horizon_minutes/60:.0f}h"

    if len(recent_values) < 5:
        return {
            "parameter": "temperature",
            "current_value": recent_values[-1] if recent_values else None,
            "predicted_value": recent_values[-1] if recent_values else None,
            "horizon": horizon_label,
            "trend": "STABLE",
            "confidence": None,
            "model_type": "Insufficient data",
            "data_note": "Temperature from DHT11 sensor or simulation.",
        }

    x = np.arange(len(recent_values), dtype=float).reshape(-1, 1)
    y = np.array(recent_values, dtype=float)

    if SKLEARN_AVAILABLE:
        model = LinearRegression()
        model.fit(x, y)
        future_x = np.array([[len(recent_values) + steps_ahead - 1]])
        predicted = float(model.predict(future_x)[0])
        r2 = float(r2_score(y, model.predict(x)))
        confidence = round(max(0.0, r2), 3)
        model_type = "Linear Regression (scikit-learn)"
    else:
        coeffs = np.polyfit(np.arange(len(recent_values), dtype=float), y.flatten(), 1)
        predicted = float(coeffs[0] * (len(recent_values) + steps_ahead - 1) + coeffs[1])
        confidence = None
        model_type = "Linear Extrapolation (numpy)"

    current = float(recent_values[-1])
    delta = predicted - current
    trend = "INCREASING" if delta > 0.5 else ("DECREASING" if delta < -0.5 else "STABLE")

    return {
        "parameter": "temperature",
        "current_value": round(current, 2),
        "predicted_value": round(predicted, 2),
        "horizon": horizon_label,
        "trend": trend,
        "confidence": confidence,
        "model_type": model_type,
        "data_note": "Temperature from DHT11 or simulation source.",
    }
