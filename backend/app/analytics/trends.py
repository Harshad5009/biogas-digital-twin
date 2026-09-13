"""
trends.py — Rolling window trend analysis utilities.
Used by both the Digital Twin and anomaly detection modules.
"""

from typing import List, Optional, Dict, Any
import numpy as np


def rolling_stats(values: List[float], window: int = 10) -> Dict[str, Any]:
    """
    Compute rolling statistics for a list of values.
    Returns mean, std, rate_of_change, slope over the last `window` points.
    """
    if not values:
        return {"mean": None, "std": None, "slope": None, "rate_of_change": None}

    subset = values[-window:] if len(values) >= window else values
    arr = np.array(subset, dtype=float)
    mean = float(np.mean(arr))
    std = float(np.std(arr))

    # Linear slope
    x = np.arange(len(arr), dtype=float)
    slope = float(np.polyfit(x, arr, 1)[0]) if len(arr) >= 2 else 0.0

    # Rate of change: last value vs first in window
    roc = float(arr[-1] - arr[0]) if len(arr) >= 2 else 0.0

    return {
        "mean": round(mean, 4),
        "std": round(std, 4),
        "slope": round(slope, 6),
        "rate_of_change": round(roc, 4),
        "window_size": len(subset),
    }


def compute_correlation(series_a: List[float], series_b: List[float]) -> Optional[float]:
    """
    Pearson correlation between two series (trimmed to same length).
    Returns None if insufficient data.
    """
    n = min(len(series_a), len(series_b))
    if n < 4:
        return None
    a = np.array(series_a[-n:], dtype=float)
    b = np.array(series_b[-n:], dtype=float)
    if a.std() == 0 or b.std() == 0:
        return None
    return round(float(np.corrcoef(a, b)[0, 1]), 4)


def percentage_change(values: List[float], window: int = 10) -> Optional[float]:
    """Percentage change of the last value vs the mean of the window."""
    if len(values) < 2:
        return None
    subset = values[-window:]
    mean = np.mean(subset[:-1]) if len(subset) > 1 else subset[0]
    if abs(mean) < 1e-9:
        return None
    return round((values[-1] - float(mean)) / abs(float(mean)) * 100.0, 2)
