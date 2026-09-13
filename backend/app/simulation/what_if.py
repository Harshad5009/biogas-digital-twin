"""
what_if.py — What-If simulation engine.

Allows the user to modify virtual parameters and see estimated effects
WITHOUT changing the physical system at all.

DISCLAIMER: All outputs are simulation-based estimates.
"""

from typing import Optional, Dict, Any


# Empirical coefficients for a simple biogas process model
# These are NOT calibrated from real experimental data.
# They represent plausible behaviour for demonstration purposes.

def estimate_gas_production(temperature: float, humidity: float, gas_indicator: float) -> float:
    """
    Simple empirical model to estimate gas production from input conditions.
    Based on the principle that mesophilic digestion peaks at ~35°C.

    Formula (simplified prototype model, NOT calibrated):
        base_rate = 2.5 L/min (at T=32°C, RH=62%)
        temp_factor:   Gaussian peak at 35°C, σ=8°C
        humidity_factor: linear, optimal 60–75%
        gas_factor:    relative combined gas indicator influence (normalized around baseline 350.0)
    """
    import math

    # Temperature efficiency: Gaussian peak at 35°C
    temp_factor = math.exp(-((temperature - 35.0) ** 2) / (2 * 8.0 ** 2))
    temp_factor = max(0.0, min(1.0, temp_factor))

    # Humidity factor: linear between 40% and 80%, peak at 65%
    if humidity < 40:
        hum_factor = 0.4
    elif humidity > 80:
        hum_factor = 0.7
    else:
        hum_factor = 0.5 + 0.5 * math.sin(math.pi * (humidity - 40) / 80)
    hum_factor = max(0.2, min(1.0, hum_factor))

    # Combined relative gas factor (normalized around combined baseline 350.0)
    gas_factor = max(0.3, min(1.2, gas_indicator / 350.0))

    estimated = 2.5 * temp_factor * hum_factor * gas_factor
    return round(max(0.0, estimated), 3)


def estimate_methane(gas_production: float, temperature: float) -> float:
    """
    Estimate methane fraction from gas production and temperature.
    Higher temperature and production generally correlate with better methane fraction.
    SIMULATION ESTIMATE — not experimentally validated.
    """
    base = 55.0
    temp_boost = max(0, (temperature - 25) * 0.4)
    prod_boost = min(10, gas_production * 1.5)
    return round(min(72.0, base + temp_boost + prod_boost), 2)


def estimate_health_score(temperature: float, gas_production: float, methane: float) -> float:
    """Simple linear health estimate for What-If output."""
    t_ok = 1.0 if 28 <= temperature <= 37 else max(0.0, 1.0 - abs(temperature - 32) * 0.08)
    g_ok = 1.0 if 1.5 <= gas_production <= 3.5 else max(0.0, 1.0 - abs(gas_production - 2.5) * 0.3)
    m_ok = 1.0 if 50 <= methane <= 70 else max(0.0, 1.0 - abs(methane - 58) * 0.03)
    score = round((t_ok * 35 + g_ok * 40 + m_ok * 25), 1)
    return min(100.0, max(0.0, score))


def run_what_if(
    temperature: Optional[float],
    humidity: Optional[float],
    mq5_override: Optional[float] = None,
    mq2_override: Optional[float] = None,
    duration_hours: float = 6.0,
    current_state: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Run a What-If simulation and return estimated outcomes.

    This modifies the VIRTUAL DIGITAL TWIN state only.
    The physical system is NOT affected.

    Args:
        temperature:     Hypothetical temperature to test
        humidity:        Hypothetical humidity to test
        mq5_override:    Optional MQ-5 value override
        mq2_override:    Optional MQ-2 value override
        duration_hours:  Projection duration
        current_state:   Current twin state for context

    Returns dict with predicted outcomes and disclaimer.
    """
    # 1. Resolve effective inputs
    temp = temperature if temperature is not None else (
        current_state.get("temperature") if current_state and current_state.get("temperature") is not None else 32.0
    )
    hum = humidity if humidity is not None else (
        current_state.get("humidity") if current_state and current_state.get("humidity") is not None else 62.0
    )
    effective_mq5 = mq5_override if mq5_override is not None else (
        current_state.get("mq5") if current_state and current_state.get("mq5") is not None else 380.0
    )
    effective_mq2 = mq2_override if mq2_override is not None else (
        current_state.get("mq2") if current_state and current_state.get("mq2") is not None else 320.0
    )

    if temp is None:
        temp = 32.0
    if hum is None:
        hum = 62.0
    if effective_mq5 is None:
        effective_mq5 = 380.0
    if effective_mq2 is None:
        effective_mq2 = 320.0

    # 2. Calculate gas indicator from both effective values
    if effective_mq5 is not None and effective_mq2 is not None:
        gas_indicator = (effective_mq5 + effective_mq2) / 2.0
    elif effective_mq5 is not None:
        gas_indicator = effective_mq5
    elif effective_mq2 is not None:
        gas_indicator = effective_mq2
    else:
        gas_indicator = 350.0

    # 3. Calculate process estimates using unified gas indicator
    pred_gas = estimate_gas_production(temp, hum, gas_indicator)
    pred_methane = estimate_methane(pred_gas, temp)
    pred_health = estimate_health_score(temp, pred_gas, pred_methane)

    if pred_health >= 80:
        pred_status = "HEALTHY"
        summary = "Conditions are expected to remain within acceptable ranges."
    elif pred_health >= 55:
        pred_status = "DEGRADING"
        summary = "Conditions show signs of mild degradation. Monitor closely."
    else:
        pred_status = "CRITICAL"
        summary = "Conditions are expected to be sub-optimal. Corrective action recommended."

    # Add specific observations
    observations = []
    if temp < 25:
        observations.append(f"Temperature {temp}°C is below optimal — reduces microbial activity.")
    elif temp > 40:
        observations.append(f"Temperature {temp}°C is above optimal — may inhibit methanogens.")
    if hum < 45:
        observations.append("Low humidity may inhibit biological processes.")
    if pred_gas < 1.0:
        observations.append("Very low gas production estimated.")

    if observations:
        summary += " " + " ".join(observations)

    return {
        "disclaimer": "WHAT-IF SIMULATION — NO PHYSICAL SYSTEM CHANGE",
        "input_temperature": round(temp, 2),
        "input_humidity": round(hum, 2),
        "input_mq5": round(effective_mq5, 1),
        "input_mq2": round(effective_mq2, 1),
        "gas_indicator": round(gas_indicator, 1),
        "duration_hours": duration_hours,
        "predicted_methane": pred_methane,
        "predicted_gas_production": pred_gas,
        "predicted_health_score": pred_health,
        "predicted_status": pred_status,
        "summary": summary,
        "data_note": (
            "All values are SIMULATION-BASED ESTIMATES using a simplified empirical model. "
            "They do not represent calibrated experimental measurements."
        ),
    }
