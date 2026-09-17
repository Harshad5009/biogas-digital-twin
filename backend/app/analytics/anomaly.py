"""
anomaly.py — Two-level anomaly detection.

Level 1 — Rule-Based:  hard threshold violations (immediate)
Level 2 — Trend-Based: rolling window statistics (gradual degradation)
"""

from typing import List, Optional, Tuple, Dict, Any
import numpy as np


# ──────────────────────────────────────────────────────────
# Rule-Based Thresholds
# ──────────────────────────────────────────────────────────
THRESHOLDS = {
    "temperature_min":      20.0,    # °C
    "temperature_max":      40.0,    # °C
    "temperature_spike":    5.0,     # °C change between readings
    "humidity_min":         30.0,    # %
    "humidity_max":         95.0,    # %
    "mq5_spike":            200.0,   # ADC units change between readings
    # NOTE: MQ-2 from ESP8266 is a digital 0/1 value (NORMAL/ALERT), NOT an ADC value.
    # Do not apply ADC-based spike detection on it — use mq2_alert_detected flag instead.
    "gas_production_min":   0.3,     # L/min (simulation)
    "gas_drop_pct":         30.0,    # % drop from recent mean
}

# Rolling window size
WINDOW = 10


def _safe_mean(values: List[float]) -> float:
    return float(np.mean(values)) if values else 0.0


def _safe_std(values: List[float]) -> float:
    return float(np.std(values)) if len(values) > 1 else 0.0


# ──────────────────────────────────────────────────────────
# Level 1 — Rule-Based Detection
# ──────────────────────────────────────────────────────────

def rule_based_check(
    temperature: Optional[float],
    humidity: Optional[float],
    mq5: Optional[float],
    mq2: Optional[float],
    gas_production: Optional[float],
    prev_temperature: Optional[float] = None,
    prev_mq5: Optional[float] = None,
    prev_mq2: Optional[float] = None,
) -> Tuple[bool, List[str]]:
    """
    Check fixed thresholds.
    Returns (anomaly_detected: bool, reasons: List[str]).
    """
    anomaly = False
    reasons = []

    if temperature is not None:
        if temperature < THRESHOLDS["temperature_min"]:
            anomaly = True
            reasons.append(f"Temperature too low ({temperature:.1f}°C < {THRESHOLDS['temperature_min']}°C)")
        elif temperature > THRESHOLDS["temperature_max"]:
            anomaly = True
            reasons.append(f"Temperature too high ({temperature:.1f}°C > {THRESHOLDS['temperature_max']}°C)")

        if prev_temperature is not None:
            delta = abs(temperature - prev_temperature)
            if delta > THRESHOLDS["temperature_spike"]:
                anomaly = True
                reasons.append(f"Sudden temperature change ({delta:.1f}°C between readings)")

    if humidity is not None:
        if humidity < THRESHOLDS["humidity_min"] or humidity > THRESHOLDS["humidity_max"]:
            anomaly = True
            reasons.append(f"Humidity out of range ({humidity:.1f}%)")

    if mq5 is not None and prev_mq5 is not None:
        if abs(mq5 - prev_mq5) > THRESHOLDS["mq5_spike"]:
            anomaly = True
            reasons.append(f"Sudden MQ-5 change ({abs(mq5 - prev_mq5):.0f} units)")

    # MQ-2 is a digital 0/1 signal from ESP8266 (0=NORMAL, 1=ALERT).
    # Only flag anomaly when it is actually in ALERT state (value == 1).
    # Do NOT compare mq2 deltas — a 0→1 transition is only 1 unit and simulation
    # MQ-2 (~320 ADC) vs live MQ-2 (0/1) would always trigger a false alarm.
    if mq2 is not None and mq2 >= 1:
        anomaly = True
        reasons.append("MQ-2 gas sensor threshold exceeded (ALERT state)")

    if gas_production is not None:
        if gas_production < THRESHOLDS["gas_production_min"]:
            anomaly = True
            reasons.append(f"Gas production critically low ({gas_production:.2f} L/min) [SIMULATED]")

    return anomaly, reasons


# ──────────────────────────────────────────────────────────
# Level 2 — Trend-Based Detection
# ──────────────────────────────────────────────────────────

def trend_based_check(
    recent_temperatures: List[float],
    recent_gas_production: List[float],
    recent_mq5: List[float],
) -> Tuple[bool, List[str]]:
    """
    Detects gradual degradation using rolling statistics.
    Returns (anomaly_detected: bool, reasons: List[str]).
    """
    anomaly = False
    reasons = []

    # Helper: check if a series has a strong declining slope
    def has_decline(series: List[float], label: str, threshold_pct: float = 15.0) -> bool:
        if len(series) < 5:
            return False
        x = np.arange(len(series), dtype=float)
        y = np.array(series, dtype=float)
        slope = np.polyfit(x, y, 1)[0]
        mean_val = abs(float(np.mean(y))) or 1.0
        pct_decline_per_step = abs(slope) / mean_val * 100.0
        return slope < 0 and pct_decline_per_step > (threshold_pct / len(series))

    # Temperature declining trend
    if has_decline(recent_temperatures, "temperature", threshold_pct=10.0):
        anomaly = True
        reasons.append("Sustained temperature decline detected (trend-based)")

    # Gas production declining trend
    if has_decline(recent_gas_production, "gas_production", threshold_pct=12.0):
        anomaly = True
        reasons.append("Gas production declining trend detected [SIMULATED]")

    # MQ-5 high variance (instability)
    if len(recent_mq5) >= 5:
        std = _safe_std(recent_mq5)
        mean = _safe_mean(recent_mq5) or 1.0
        cv = std / mean
        if cv > 0.25:
            anomaly = True
            reasons.append(f"High MQ-5 instability (CV={cv:.2f}) — possible gas leak indicator")

    # Gas production significant drop from window mean
    if len(recent_gas_production) >= 5:
        window_mean = _safe_mean(recent_gas_production[:-1])
        latest = recent_gas_production[-1]
        if window_mean > 0:
            drop_pct = (window_mean - latest) / window_mean * 100.0
            if drop_pct > THRESHOLDS["gas_drop_pct"]:
                anomaly = True
                reasons.append(
                    f"Gas production dropped {drop_pct:.1f}% below recent average [SIMULATED]"
                )

    return anomaly, reasons


# ──────────────────────────────────────────────────────────
# Combined check
# ──────────────────────────────────────────────────────────

def detect_anomaly(
    temperature: Optional[float],
    humidity: Optional[float],
    mq5: Optional[float],
    mq2: Optional[float],
    gas_production: Optional[float],
    recent_temperatures: List[float],
    recent_gas_production: List[float],
    recent_mq5: List[float],
    prev_temperature: Optional[float] = None,
    prev_mq5: Optional[float] = None,
    prev_mq2: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Run both detection levels and return combined result.
    """
    r_anomaly, r_reasons = rule_based_check(
        temperature, humidity, mq5, mq2, gas_production,
        prev_temperature, prev_mq5, prev_mq2,
    )
    t_anomaly, t_reasons = trend_based_check(
        recent_temperatures, recent_gas_production, recent_mq5
    )

    all_anomaly = r_anomaly or t_anomaly
    all_reasons = r_reasons + t_reasons

    return {
        "anomaly_detected": all_anomaly,
        "reasons": all_reasons,
        "reason_string": "; ".join(all_reasons) if all_reasons else None,
        "rule_based": r_anomaly,
        "trend_based": t_anomaly,
    }
