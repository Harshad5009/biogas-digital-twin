"""
health.py — Transparent health score calculation (0–100).

Formula is fully documented so it is NOT a black-box score.

Score components:
  1. Temperature Score  (25 pts) — optimal range 28–35 °C
  2. Gas Production Score (30 pts) — optimal range 1.5–3.5 L/min
  3. Trend Score (25 pts) — penalises declining trends
  4. Anomaly Penalty (-20 pts max) — subtracted when anomaly present
"""

from typing import List, Dict, Any, Optional
import numpy as np


# ──────────────────────────────────────────────
# Optimal operating ranges for a small digester
# ──────────────────────────────────────────────
OPTIMAL = {
    "temperature": (28.0, 35.0),     # °C
    "humidity":    (50.0, 75.0),     # %
    "mq5":         (200.0, 600.0),   # ADC units (relative indicator)
    "methane":     (50.0, 70.0),     # % (simulation estimate)
    "gas_production": (1.5, 3.5),    # L/min (simulation estimate)
}


def _range_score(value: Optional[float], low: float, high: float, max_pts: float) -> float:
    """
    Returns a score 0–max_pts based on how close value is to optimal range.
    Inside range → full score. Outside → linearly decays.
    """
    if value is None:
        return max_pts * 0.5   # neutral when unknown
    if low <= value <= high:
        return max_pts
    margin = (high - low) * 0.5 or 1.0
    if value < low:
        ratio = max(0.0, 1.0 - (low - value) / margin)
    else:
        ratio = max(0.0, 1.0 - (value - high) / margin)
    return round(ratio * max_pts, 2)


def _trend_score(values: List[float], max_pts: float = 25.0) -> tuple:
    """
    Analyses the slope of the last N values.
    Returns (score, description_string).
    Negative slope → lower score. Flat/positive → higher score.
    """
    if len(values) < 3:
        return max_pts * 0.7, "insufficient data for trend"

    x = np.arange(len(values), dtype=float)
    y = np.array(values, dtype=float)
    if y.std() == 0:
        return max_pts, "stable (no variation)"

    # Normalised slope: slope relative to mean value
    slope = np.polyfit(x, y, 1)[0]
    mean_val = float(np.mean(y)) or 1.0
    norm_slope = slope / abs(mean_val)

    if norm_slope >= 0:
        score = max_pts
        desc = "stable or improving trend"
    else:
        # Strong decline → near 0; mild decline → partial score
        penalty = min(1.0, abs(norm_slope) * 20)
        score = round(max_pts * (1.0 - penalty), 2)
        desc = f"declining trend (slope={norm_slope:.4f})"

    return score, desc


def calculate_health_score(
    temperature: Optional[float],
    humidity: Optional[float],
    gas_production: Optional[float],
    methane: Optional[float],
    recent_gas_production: List[float],
    recent_temperature: List[float],
    anomaly_detected: bool = False,
) -> Dict[str, Any]:
    """
    Calculate a transparent health score with contributing factors.

    Returns a dict with:
      score (float 0–100)
      status (HEALTHY / DEGRADING / CRITICAL)
      factors (list of factor details)
      summary (human-readable string)
    """
    factors = []

    # 1. Temperature score (25 pts)
    t_score = _range_score(temperature, *OPTIMAL["temperature"], 25.0)
    factors.append({
        "name": "Temperature",
        "value": temperature,
        "optimal_range": OPTIMAL["temperature"],
        "score": t_score,
        "max": 25.0,
        "note": "DHT11 reading" if temperature else "unavailable",
    })

    # 2. Gas production score (30 pts)
    g_score = _range_score(gas_production, *OPTIMAL["gas_production"], 30.0)
    factors.append({
        "name": "Gas Production (Simulated)",
        "value": gas_production,
        "optimal_range": OPTIMAL["gas_production"],
        "score": g_score,
        "max": 30.0,
        "note": "SIMULATION ESTIMATE — not a calibrated measurement",
    })

    # 3. Trend score (25 pts) — based on recent gas production history
    if len(recent_gas_production) >= 3:
        tr_score, tr_desc = _trend_score(recent_gas_production, 25.0)
    elif len(recent_temperature) >= 3:
        tr_score, tr_desc = _trend_score(recent_temperature, 25.0)
    else:
        tr_score, tr_desc = 17.5, "insufficient history"
    factors.append({
        "name": "Production Trend",
        "value": None,
        "optimal_range": None,
        "score": tr_score,
        "max": 25.0,
        "note": tr_desc,
    })

    # 4. Methane estimate score (20 pts)
    m_score = _range_score(methane, *OPTIMAL["methane"], 20.0)
    factors.append({
        "name": "Methane Estimate (Simulated)",
        "value": methane,
        "optimal_range": OPTIMAL["methane"],
        "score": m_score,
        "max": 20.0,
        "note": "SIMULATION ESTIMATE",
    })

    # Sum and apply anomaly penalty
    raw_score = t_score + g_score + tr_score + m_score
    anomaly_penalty = 20.0 if anomaly_detected else 0.0
    final_score = max(0.0, min(100.0, raw_score - anomaly_penalty))

    # Determine status
    if final_score >= 80:
        status = "HEALTHY"
    elif final_score >= 55:
        status = "DEGRADING"
    else:
        status = "CRITICAL"

    # Build summary
    low_factors = [f["name"] for f in factors if f["score"] < f["max"] * 0.6]
    if low_factors:
        summary = f"Low scores in: {', '.join(low_factors)}."
    else:
        summary = "All parameters within acceptable ranges."
    if anomaly_detected:
        summary += " Anomaly penalty applied (−20 pts)."

    return {
        "score": round(final_score, 1),
        "status": status,
        "factors": factors,
        "summary": summary,
        "anomaly_penalty": anomaly_penalty,
    }
