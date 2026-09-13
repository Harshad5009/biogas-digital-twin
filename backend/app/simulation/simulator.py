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
        self._temp += _noise(0.15)
        self._temp = _clamp(self._temp, 29.0, 34.0)
        self._humidity += _noise(0.3)
        self._humidity = _clamp(self._humidity, 58.0, 70.0)
        self._mq5 += _noise(8.0)
        self._mq5 = _clamp(self._mq5, 300.0, 460.0)
        self._mq2 += _noise(7.0)
        self._mq2 = _clamp(self._mq2, 260.0, 380.0)
        # Gas production follows a slight sine wave around base (realistic fluctuation)
        self._gas_prod = BASE_GAS_PROD + 0.2 * math.sin(self.step * 0.15) + _noise(0.05)
        self._gas_prod = _clamp(self._gas_prod, 2.0, 3.0)
        self._methane = BASE_METHANE + _noise(0.5)
        self._methane = _clamp(self._methane, 55.0, 62.0)

    def _next_temp_drop(self):
        """Scenario 2 — Temperature Drop: gradual decline causing gas reduction."""
        # Temperature drops 0.3°C every step, bottoming at 22°C
        self._temp = max(22.0, self._temp - 0.3 + _noise(0.1))
        self._humidity += _noise(0.3)
        self._humidity = _clamp(self._humidity, 55.0, 72.0)
        # Gas production correlated with temperature — falls as temp drops
        temp_factor = (self._temp - 22.0) / (BASE_TEMP - 22.0)
        self._gas_prod = BASE_GAS_PROD * temp_factor + _noise(0.08)
        self._gas_prod = _clamp(self._gas_prod, 0.2, BASE_GAS_PROD)
        self._methane = BASE_METHANE * temp_factor + _noise(0.5)
        self._methane = _clamp(self._methane, 30.0, 62.0)
        self._mq5 = BASE_MQ5 * (0.8 + 0.2 * temp_factor) + _noise(10.0)
        self._mq2 = BASE_MQ2 * (0.85 + 0.15 * temp_factor) + _noise(8.0)

    def _next_gas_degradation(self):
        """Scenario 3 — Gas degradation despite stable temperature."""
        self._temp += _noise(0.1)
        self._temp = _clamp(self._temp, 30.0, 34.0)
        self._humidity += _noise(0.25)
        self._humidity = _clamp(self._humidity, 58.0, 70.0)
        # Gas production declines steadily
        self._gas_prod = max(0.3, self._gas_prod - 0.04 + _noise(0.05))
        self._methane = max(30.0, self._methane - 0.2 + _noise(0.3))
        self._mq5 += _noise(12.0)
        self._mq5 = _clamp(self._mq5, 250.0, 430.0)
        self._mq2 += _noise(10.0)

    def _next_sudden_spike(self):
        """Scenario 4 — Sudden abnormal gas reading spike."""
        self._temp += _noise(0.12)
        self._temp = _clamp(self._temp, 29.0, 34.0)
        self._humidity += _noise(0.3)
        # Add a big MQ spike at step 5, then return to normal
        if self.step == 5 and not self._spike_done:
            self._mq5 = BASE_MQ5 + random.uniform(300, 500)
            self._mq2 = BASE_MQ2 + random.uniform(250, 400)
            self._spike_done = True
        else:
            self._mq5 += _noise(10.0)
            self._mq5 = _clamp(self._mq5, 280.0, 450.0)
            self._mq2 += _noise(8.0)
            self._mq2 = _clamp(self._mq2, 240.0, 380.0)
        self._gas_prod += _noise(0.06)
        self._gas_prod = _clamp(self._gas_prod, 2.0, 3.0)
        self._methane += _noise(0.4)

    def _next_recovery(self):
        """Scenario 5 — Recovery: values return toward optimal range."""
        # Pull toward base values gradually
        self._temp += (BASE_TEMP - self._temp) * 0.15 + _noise(0.1)
        self._humidity += (BASE_HUMIDITY - self._humidity) * 0.1 + _noise(0.2)
        self._mq5 += (BASE_MQ5 - self._mq5) * 0.1 + _noise(8.0)
        self._mq2 += (BASE_MQ2 - self._mq2) * 0.1 + _noise(7.0)
        self._gas_prod += (BASE_GAS_PROD - self._gas_prod) * 0.15 + _noise(0.05)
        self._methane += (BASE_METHANE - self._methane) * 0.1 + _noise(0.3)

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


def stop_simulation():
    global _simulation_running, _simulation_task
    _simulation_running = False
    if _simulation_task and not _simulation_task.done():
        _simulation_task.cancel()


def start_simulation(interval_sec: int, data_callback, loop=None):
    """Start the simulation as an asyncio background task."""
    global _simulation_task
    if loop is None:
        loop = asyncio.get_event_loop()
    _simulation_task = loop.create_task(run_simulation_loop(interval_sec, data_callback))
    return _simulation_task
