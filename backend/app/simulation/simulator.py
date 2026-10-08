"""
simulator.py — Simulation Engine.

Generates realistic time-series data for all 5 scenarios.
Data uses the SAME schema as real ESP8266 data — only 'source' differs.
This allows the software to run without any hardware attached.
"""

import asyncio
import json
import logging
import math
import random
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional

logger = logging.getLogger("simulator")

# ──────────────────────────────────────────────────────────
# Physical reasoning constants
# ──────────────────────────────────────────────────────────
# These values are chosen to represent a plausible small biogas
# digester under mesophilic conditions (25–40 °C).
# They do NOT represent calibrated measurements.

BASE_TEMP = 32.0          # °C — typical mesophilic digester temp
BASE_HUMIDITY = 62.0      # %
BASE_MQ5 = 380.0          # ADC — relative gas indicator (not calibrated ppm)
BASE_MQ2 = 320.0          # ADC — relative gas/smoke indicator
BASE_METHANE = 58.0       # % — estimated fraction (SIMULATION)
BASE_GAS_PROD = 2.5       # L/min — estimated production (SIMULATION)


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


def _noise(sigma: float = 0.2) -> float:
    """Small Gaussian noise to simulate sensor fluctuation."""
    return random.gauss(0, sigma)


class ScenarioSimulator:
    """
    Generates one sensor reading per call based on the active scenario.
    State evolves gradually across calls — not random per reading.
    """

    SCENARIOS = [
        "normal",
        "temp_drop",
        "gas_degradation",
        "sudden_spike",
        "recovery",
    ]

    def __init__(self):
        self.scenario: str = "normal"
        self.step: int = 0
        self._temp: float = BASE_TEMP
        self._humidity: float = BASE_HUMIDITY
        self._mq5: float = BASE_MQ5
        self._mq2: float = BASE_MQ2
        self._methane: float = BASE_METHANE
        self._gas_prod: float = BASE_GAS_PROD
        self._spike_done: bool = False

    def set_scenario(self, scenario: str):
        """Change the active scenario and reset step counter."""
        if scenario not in self.SCENARIOS:
            raise ValueError(f"Unknown scenario: {scenario}. Choose from {self.SCENARIOS}")
        self.scenario = scenario
        self.step = 0
        self._spike_done = False
        # Reset to base on scenario change
        self._temp = BASE_TEMP
        self._humidity = BASE_HUMIDITY
        self._mq5 = BASE_MQ5
        self._mq2 = BASE_MQ2
        self._methane = BASE_METHANE
        self._gas_prod = BASE_GAS_PROD
        logger.info(f"Simulator scenario changed to: {scenario}")

    def _next_normal(self):
        """Scenario 1 — Normal Operation: stable with small fluctuations."""
        self._temp += _noise(0.12)
        self._temp = _clamp(self._temp, 30.5, 33.5)
        self._humidity += _noise(0.25)
        self._humidity = _clamp(self._humidity, 60.0, 68.0)
        self._mq5 += _noise(6.0)
        self._mq5 = _clamp(self._mq5, 340.0, 420.0)
        self._mq2 += _noise(5.0)
        self._mq2 = _clamp(self._mq2, 260.0, 340.0)
        # Steady gas production (2.3 - 2.8 L/min)
        self._gas_prod = BASE_GAS_PROD + 0.15 * math.sin(self.step * 0.15) + _noise(0.04)
        self._gas_prod = _clamp(self._gas_prod, 2.2, 2.8)
        self._methane = BASE_METHANE + _noise(0.4)
        self._methane = _clamp(self._methane, 58.0, 64.0)

    def _next_temp_drop(self):
        """Scenario 2 — Temperature Drop: gradual decline causing biological inhibition and gas collapse."""
        # Temperature drops ~0.45°C every step, bottoming at 17.5°C (well below mesophilic 28-35°C)
        self._temp = max(17.5, self._temp - 0.45 + _noise(0.08))
        self._humidity += _noise(0.2)
        self._humidity = _clamp(self._humidity, 50.0, 70.0)
        # Gas production drops steeply with temperature
        temp_factor = max(0.05, (self._temp - 17.5) / (BASE_TEMP - 17.5))
        self._gas_prod = max(0.12, BASE_GAS_PROD * temp_factor + _noise(0.04))
        self._methane = max(24.0, BASE_METHANE * temp_factor + _noise(0.4))
        self._mq5 = max(120.0, BASE_MQ5 * (0.3 + 0.7 * temp_factor) + _noise(8.0))
        self._mq2 = _clamp(self._mq2 + _noise(4.0), 220.0, 320.0)

    def _next_gas_degradation(self):
        """Scenario 3 — Gas degradation despite stable temperature (acidosis / methanogen inhibition)."""
        # Temperature stays optimal
        self._temp += _noise(0.1)
        self._temp = _clamp(self._temp, 31.0, 33.5)
        self._humidity += _noise(0.2)
        self._humidity = _clamp(self._humidity, 60.0, 68.0)
        # Gas production and methane steadily collapse
        self._gas_prod = max(0.15, self._gas_prod - 0.08 + _noise(0.03))
        self._methane = max(25.0, self._methane - 0.8 + _noise(0.3))
        self._mq5 = max(130.0, self._mq5 - 8.0 + _noise(6.0))
        self._mq2 += _noise(5.0)
        self._mq2 = _clamp(self._mq2, 240.0, 340.0)

    def _next_sudden_spike(self):
        """Scenario 4 — Sudden gas leak / methane surge triggering immediate Level 1 Safety Alert."""
        self._temp += _noise(0.1)
        self._temp = _clamp(self._temp, 30.0, 33.0)
        self._humidity += _noise(0.2)
        # From step 2 onward, maintain active elevated spike for emergency response
        if self.step >= 2:
            self._mq5 = _clamp(820.0 + _noise(25.0), 750.0, 980.0)
            self._mq2 = _clamp(720.0 + _noise(20.0), 620.0, 880.0)
            self._gas_prod = _clamp(3.8 + _noise(0.1), 3.2, 4.5)
            self._methane = _clamp(74.0 + _noise(0.8), 68.0, 82.0)
        else:
            self._mq5 = BASE_MQ5 + _noise(10.0)
            self._mq2 = BASE_MQ2 + _noise(8.0)
            self._gas_prod = BASE_GAS_PROD + _noise(0.05)
            self._methane = BASE_METHANE + _noise(0.4)

    def _next_recovery(self):
        """Scenario 5 — Recovery: process parameters return smoothly back toward optimal baseline."""
        # Progressively interpolate towards optimal baseline
        self._temp += (BASE_TEMP - self._temp) * 0.2 + _noise(0.08)
        self._humidity += (BASE_HUMIDITY - self._humidity) * 0.15 + _noise(0.15)
        self._mq5 += (BASE_MQ5 - self._mq5) * 0.2 + _noise(5.0)
        self._mq2 += (BASE_MQ2 - self._mq2) * 0.2 + _noise(5.0)
        self._gas_prod += (BASE_GAS_PROD - self._gas_prod) * 0.2 + _noise(0.03)
        self._methane += (BASE_METHANE - self._methane) * 0.2 + _noise(0.2)

    def next_reading(self) -> Dict[str, Any]:
        """
        Generate the next simulated sensor reading.
        Returns a dict matching the standard sensor schema.
        """
        scenario_fn = {
            "normal":          self._next_normal,
            "temp_drop":       self._next_temp_drop,
            "gas_degradation": self._next_gas_degradation,
            "sudden_spike":    self._next_sudden_spike,
            "recovery":        self._next_recovery,
        }
        scenario_fn[self.scenario]()
        self.step += 1

        return {
            "device_id": "digester01",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "temperature": round(self._temp, 2),
            "humidity": round(self._humidity, 2),
            "mq5": round(self._mq5, 1),
            "mq2": round(self._mq2, 1),
            "methane": round(self._methane, 2),
            "gas_production": round(self._gas_prod, 3),
            "source": "SIMULATION",
        }


# ──────────────────────────────────────────────────────────
# Async simulation runner
# ──────────────────────────────────────────────────────────

# Global simulator instance
simulator = ScenarioSimulator()
_simulation_task: Optional[asyncio.Task] = None
_simulation_running: bool = False


async def run_simulation_loop(interval_sec: int, data_callback):
    """
    Continuously generate simulated data at `interval_sec` intervals.
    Calls `data_callback(reading_dict)` for each generated reading.
    """
    global _simulation_running
    _simulation_running = True
    logger.info(f"Simulation loop started (scenario={simulator.scenario}, interval={interval_sec}s)")

    while _simulation_running:
        reading = simulator.next_reading()
        try:
            await data_callback(reading)
        except Exception as e:
            logger.error(f"Simulation callback error: {e}")
        await asyncio.sleep(interval_sec)

    logger.info("Simulation loop stopped.")


def is_simulation_running() -> bool:
    global _simulation_running, _simulation_task
    return _simulation_running and _simulation_task is not None and not _simulation_task.done()


def stop_simulation():
    global _simulation_running, _simulation_task
    _simulation_running = False
    if _simulation_task and not _simulation_task.done():
        _simulation_task.cancel()
    _simulation_task = None
    logger.info("Simulation stopped.")


def start_simulation(interval_sec: int, data_callback, loop=None):
    """Start the simulation as an asyncio background task if not already running."""
    global _simulation_task, _simulation_running
    if is_simulation_running():
        logger.info("Simulation is already running.")
        return _simulation_task

    if loop is None:
        loop = asyncio.get_running_loop()

    _simulation_running = True
    _simulation_task = loop.create_task(run_simulation_loop(interval_sec, data_callback))
    return _simulation_task
