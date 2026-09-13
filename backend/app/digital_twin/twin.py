"""
twin.py — Digital Twin engine.

Maintains a virtual state of the biogas digester.

Updated whenever new sensor data arrives from:
    - ESP8266 through MQTT
    - Simulation engine

This is a data-driven Digital Twin. It is not a physics-based
biogas production simulator.

Real available sensors:
    - DHT11 temperature
    - DHT11 humidity
    - MQ-5 raw analog gas reading
    - MQ-2 digital gas status

Unavailable optional sensors:
    - Methane concentration
    - Gas production/flow
    - Pressure
    - CO2
    - H2S
"""

import logging

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from collections import deque

from app.analytics.anomaly import detect_anomaly
from app.analytics.health import calculate_health_score
from app.analytics.prediction import (
    predict_gas_production,
    predict_temperature,
)

logger = logging.getLogger("digital_twin")


# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

HISTORY_LEN = 60


class DigitalTwin:
    """
    Virtual representation of the biogas digester.

    Maintains:

    - Current sensor state
    - Gas indicator
    - Health score and status
    - Anomaly detection results
    - Prediction outputs
    - Rolling history for trend analysis
    - Data source information

    Important:
    MQ-5 is an uncalibrated analog sensor. Its value is a relative
    ADC reading and must not be interpreted directly as ppm.

    MQ-2 is currently used as a digital threshold sensor:
        0 = NORMAL
        1 = ALERT
    """

    def __init__(self):

        # ─────────────────────────────────────────────────────────────────────
        # Current sensor state
        # ─────────────────────────────────────────────────────────────────────

        self.temperature: Optional[float] = None
        self.humidity: Optional[float] = None

        # MQ-5 raw analog ADC value
        self.mq5: Optional[float] = None

        # MQ-2 digital status:
        # 0 = NORMAL
        # 1 = ALERT
        self.mq2: Optional[float] = None

        # Optional values
        self.methane_estimate: Optional[float] = None
        self.gas_production: Optional[float] = None

        # Derived relative gas indicator
        self.gas_indicator: Optional[float] = None

        # ─────────────────────────────────────────────────────────────────────
        # Health and status
        # ─────────────────────────────────────────────────────────────────────

        self.health_score: float = 100.0
        self.status: str = "HEALTHY"

        # ─────────────────────────────────────────────────────────────────────
        # Anomaly state
        # ─────────────────────────────────────────────────────────────────────

        self.anomaly_detected: bool = False
        self.anomaly_reason: Optional[str] = None

        # ─────────────────────────────────────────────────────────────────────
        # Metadata
        # ─────────────────────────────────────────────────────────────────────

        self.last_update: Optional[datetime] = None
        self.data_source: str = "SIMULATION"
        self.update_count: int = 0

        # ─────────────────────────────────────────────────────────────────────
        # Previous values for spike detection
        # ─────────────────────────────────────────────────────────────────────

        self._prev_temperature: Optional[float] = None
        self._prev_mq5: Optional[float] = None
        self._prev_mq2: Optional[float] = None

        # ─────────────────────────────────────────────────────────────────────
        # Rolling histories
        # ─────────────────────────────────────────────────────────────────────

        self._temp_history: deque = deque(maxlen=HISTORY_LEN)
        self._gas_history: deque = deque(maxlen=HISTORY_LEN)
        self._mq5_history: deque = deque(maxlen=HISTORY_LEN)
        self._health_history: deque = deque(maxlen=HISTORY_LEN)

        # ─────────────────────────────────────────────────────────────────────
        # Cached predictions
        # ─────────────────────────────────────────────────────────────────────

        self.gas_prediction: Optional[Dict[str, Any]] = None
        self.temp_prediction: Optional[Dict[str, Any]] = None

    # ─────────────────────────────────────────────────────────────────────────
    # Main update method
    # ─────────────────────────────────────────────────────────────────────────

    def update(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update the Digital Twin with new sensor data.

        Expected normalized data format:

        {
            "temperature": 28.7,
            "humidity": 70.0,
            "mq5": 262,
            "mq2": 0,
            "methane": None,
            "gas_production": None,
            "source": "ESP8266"
        }

        Returns:
            Updated Digital Twin state as a dictionary.
        """

        # ─────────────────────────────────────────────────────────────────────
        # 1. Store previous values
        # ─────────────────────────────────────────────────────────────────────

        self._prev_temperature = self.temperature
        self._prev_mq5 = self.mq5
        self._prev_mq2 = self.mq2

        # ─────────────────────────────────────────────────────────────────────
        # 2. Update current values
        # ─────────────────────────────────────────────────────────────────────

        self.temperature = self._safe_float(
            data.get("temperature")
        )

        self.humidity = self._safe_float(
            data.get("humidity")
        )

        self.mq5 = self._safe_float(
            data.get("mq5", data.get("mq5_analog"))
        )

        self.mq2 = self._normalize_mq2(data)

        self.methane_estimate = self._safe_float(
            data.get("methane")
        )

        self.gas_production = self._safe_float(
            data.get("gas_production")
        )

        # Preserve the actual source
        self.data_source = data.get(
            "source",
            "SIMULATION"
        )

        self.last_update = datetime.now(timezone.utc)
        self.update_count += 1

        # ─────────────────────────────────────────────────────────────────────
        # 3. Calculate relative gas indicator
        # ─────────────────────────────────────────────────────────────────────

        self.gas_indicator = self._calculate_gas_indicator()

        # ─────────────────────────────────────────────────────────────────────
        # 4. Append values to rolling histories
        # ─────────────────────────────────────────────────────────────────────

        if self.temperature is not None:
            self._temp_history.append(self.temperature)

        if self.gas_production is not None:
            self._gas_history.append(self.gas_production)

        if self.mq5 is not None:
            self._mq5_history.append(self.mq5)

        # ─────────────────────────────────────────────────────────────────────
        # 5. Run anomaly detection
        # ─────────────────────────────────────────────────────────────────────

        try:
            anomaly_result = detect_anomaly(
                temperature=self.temperature,
                humidity=self.humidity,
                mq5=self.mq5,
                mq2=self.mq2,
                gas_production=self.gas_production,
                recent_temperatures=list(self._temp_history),
                recent_gas_production=list(self._gas_history),
                recent_mq5=list(self._mq5_history),
                prev_temperature=self._prev_temperature,
                prev_mq5=self._prev_mq5,
                prev_mq2=self._prev_mq2,
            )

            self.anomaly_detected = anomaly_result.get(
                "anomaly_detected",
                False
            )

            self.anomaly_reason = anomaly_result.get(
                "reason_string"
            )

        except Exception as anomaly_error:
            logger.warning(
                f"Anomaly detection unavailable: {anomaly_error}"
            )

            self.anomaly_detected = False
            self.anomaly_reason = None

        # ─────────────────────────────────────────────────────────────────────
        # 6. Calculate health score
        # ─────────────────────────────────────────────────────────────────────

        try:
            health_result = calculate_health_score(
                temperature=self.temperature,
                humidity=self.humidity,
                gas_production=self.gas_production,
                methane=self.methane_estimate,
                recent_gas_production=list(self._gas_history),
                recent_temperature=list(self._temp_history),
                anomaly_detected=self.anomaly_detected,
            )

            self.health_score = float(
                health_result.get("score", 100.0)
            )

            self.status = health_result.get(
                "status",
                "HEALTHY"
            )

        except Exception as health_error:
            logger.warning(
                f"Health score calculation unavailable: {health_error}"
            )

            # Fallback health calculation based only on available
            # real sensors.
            self.health_score, self.status = (
                self._calculate_available_sensor_health()
            )

        # ─────────────────────────────────────────────────────────────────────
        # 7. Correct status when optional sensors are unavailable
        # ─────────────────────────────────────────────────────────────────────

        self._apply_available_sensor_status()

        self._health_history.append(self.health_score)

        # ─────────────────────────────────────────────────────────────────────
        # 8. Refresh predictions every 5 readings
        # ─────────────────────────────────────────────────────────────────────

        if self.update_count % 5 == 0:
            self._refresh_predictions()

        logger.info(
            f"Twin updated | "
            f"source={self.data_source} | "
            f"temperature={self.temperature} | "
            f"humidity={self.humidity} | "
            f"mq5={self.mq5} | "
            f"mq2={self.mq2} | "
            f"gas_indicator={self.gas_indicator} | "
            f"health={self.health_score} | "
            f"status={self.status} | "
            f"anomaly={self.anomaly_detected}"
        )

        return self.to_dict()

    # ─────────────────────────────────────────────────────────────────────────
    # Helper: safe float conversion
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _safe_float(value: Any) -> Optional[float]:
        """
        Convert a value to float safely.

        Returns None for:
        - None
        - Empty strings
        - Invalid values
        """

        if value is None:
            return None

        if value == "":
            return None

        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # Helper: normalize MQ-2 value
    # ─────────────────────────────────────────────────────────────────────────

    def _normalize_mq2(self, data: Dict[str, Any]) -> Optional[float]:
        """
        Normalize MQ-2 input.

        Priority:
        1. Numeric mq2 value, if supplied.
        2. mq2_status = ALERT → 1.
        3. mq2_status = NORMAL → 0.
        4. Otherwise None.
        """

        if data.get("mq2") is not None:
            return self._safe_float(data.get("mq2"))

        mq2_status = str(
            data.get("mq2_status", "")
        ).upper()

        if mq2_status == "ALERT":
            return 1.0

        if mq2_status == "NORMAL":
            return 0.0

        return None

    # ─────────────────────────────────────────────────────────────────────────
    # Helper: calculate gas indicator
    # ─────────────────────────────────────────────────────────────────────────

    def _calculate_gas_indicator(self) -> Optional[float]:
        """
        Calculate a relative gas indicator.

        MQ-5 is an uncalibrated raw ADC value, so it is used directly
        as the relative gas indicator.

        MQ-2 is a digital threshold sensor and is not averaged with
        the MQ-5 ADC value because their scales are different.

        Therefore:
            gas_indicator = MQ-5 raw relative value

        If MQ-5 is unavailable:
            gas_indicator = MQ-2 digital state
        """

        if self.mq5 is not None:
            return round(self.mq5, 1)

        if self.mq2 is not None:
            return round(self.mq2, 1)

        return None

    # ─────────────────────────────────────────────────────────────────────────
    # Health fallback using available sensors
    # ─────────────────────────────────────────────────────────────────────────

    def _calculate_available_sensor_health(self):
        """
        Fallback health score based only on available sensors.

        This prevents missing optional sensors from automatically
        causing a degrading status.

        Available parameters:
            - Temperature
            - Humidity
            - MQ-2 alert status
            - Anomaly result
        """

        score = 100.0

        # Temperature assessment
        if self.temperature is not None:

            # Approximate acceptable operating range for monitoring.
            # These are monitoring thresholds, not a universal
            # biological guarantee for every digester.
            if self.temperature < 20 or self.temperature > 40:
                score -= 15
            elif self.temperature < 25 or self.temperature > 37:
                score -= 5

        # Humidity assessment
        if self.humidity is not None:

            if self.humidity < 30 or self.humidity > 90:
                score -= 10
            elif self.humidity < 40 or self.humidity > 80:
                score -= 5

        # MQ-2 digital alert assessment
        if self.mq2 == 1:
            score -= 20

        # Anomaly assessment
        if self.anomaly_detected:
            score -= 20

        score = max(0.0, min(100.0, score))

        if score >= 80:
            status = "HEALTHY"
        elif score >= 60:
            status = "DEGRADING"
        else:
            status = "CRITICAL"

        return round(score, 1), status

    # ─────────────────────────────────────────────────────────────────────────
    # Status correction
    # ─────────────────────────────────────────────────────────────────────────

    def _apply_available_sensor_status(self):
        """
        Prevent missing optional sensors from being treated as faults.

        If methane and gas production are unavailable but the available
        real sensors are normal, the system should remain HEALTHY.

        If an actual anomaly or MQ-2 alert exists, the status is preserved
        as a warning/critical condition.
        """

        # If an actual anomaly is detected, do not hide it.
        if self.anomaly_detected:
            if self.health_score < 40:
                self.status = "CRITICAL"
            elif self.health_score < 70:
                self.status = "DEGRADING"
            else:
                self.status = "WARNING"
            return

        # MQ-2 alert means a gas threshold event was detected.
        if self.mq2 == 1:
            self.status = "WARNING"
            self.health_score = min(self.health_score, 75.0)
            return

        # If only optional values are missing, do not degrade status.
        # Temperature and humidity are available and normal.
        if (
            self.data_source == "ESP8266"
            and self.temperature is not None
            and self.humidity is not None
            and self.mq2 == 0
        ):

            if (
                20 <= self.temperature <= 40
                and 30 <= self.humidity <= 90
            ):
                self.status = "HEALTHY"

                # Keep a reasonable score for available sensors.
                if self.health_score < 80:
                    self.health_score = 90.0

    # ─────────────────────────────────────────────────────────────────────────
    # Prediction methods
    # ─────────────────────────────────────────────────────────────────────────

    def _refresh_predictions(self):
        """Refresh predictive models using available history."""

        # Gas production prediction is possible only when gas production
        # values exist. With the current hardware, this may remain None.
        if len(self._gas_history) >= 5:
            try:
                self.gas_prediction = predict_gas_production(
                    list(self._gas_history)
                )
            except Exception as error:
                logger.warning(
                    f"Gas prediction unavailable: {error}"
                )

        # Temperature prediction uses DHT11 history.
        if len(self._temp_history) >= 5:
            try:
                self.temp_prediction = predict_temperature(
                    list(self._temp_history)
                )
            except Exception as error:
                logger.warning(
                    f"Temperature prediction unavailable: {error}"
                )

    # ─────────────────────────────────────────────────────────────────────────
    # State serialization
    # ─────────────────────────────────────────────────────────────────────────

    def to_dict(self) -> Dict[str, Any]:
        """Return the current Digital Twin state as a JSON-serializable dict."""

        return {
            "temperature": self.temperature,
            "humidity": self.humidity,

            # Real gas sensor values
            "mq5": self.mq5,
            "mq2": self.mq2,

            # Derived relative gas indicator
            "gas_indicator": self.gas_indicator,

            # Optional values
            "methane_estimate": self.methane_estimate,
            "gas_production": self.gas_production,

            # Health and anomaly information
            "health_score": self.health_score,
            "status": self.status,
            "anomaly_detected": self.anomaly_detected,
            "anomaly_reason": self.anomaly_reason,

            # Metadata
            "last_update": (
                self.last_update.isoformat()
                if self.last_update
                else None
            ),
            "data_source": self.data_source,
            "update_count": self.update_count,

            # Predictions
            "gas_prediction": self.gas_prediction,
            "temp_prediction": self.temp_prediction,

            # Rolling history
            "history": {
                "temperature": list(
                    self._temp_history
                )[-20:],

                "gas_production": list(
                    self._gas_history
                )[-20:],

                "mq5": list(
                    self._mq5_history
                )[-20:],

                "health_score": list(
                    self._health_history
                )[-20:],
            },

            # Sensor availability information
            "sensor_availability": {
                "temperature": self.temperature is not None,
                "humidity": self.humidity is not None,
                "mq5": self.mq5 is not None,
                "mq2": self.mq2 is not None,
                "methane": self.methane_estimate is not None,
                "gas_production": self.gas_production is not None,
                "pressure": False,
                "co2": False,
                "h2s": False,
            },

            # Data interpretation notes
            "data_notes": {
                "mq5": (
                    "Raw uncalibrated ADC value; "
                    "not directly equivalent to ppm."
                ),
                "mq2": (
                    "Digital threshold status: "
                    "0 = NORMAL, 1 = ALERT."
                ),
                "methane": (
                    "Unavailable because no calibrated methane "
                    "sensor is connected."
                ),
                "gas_production": (
                    "Unavailable because no gas-flow sensor "
                    "is connected."
                ),
            },
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Health details
    # ─────────────────────────────────────────────────────────────────────────

    def get_health_detail(self) -> Dict[str, Any]:
        """Return transparent health score details."""

        try:
            return calculate_health_score(
                temperature=self.temperature,
                humidity=self.humidity,
                gas_production=self.gas_production,
                methane=self.methane_estimate,
                recent_gas_production=list(self._gas_history),
                recent_temperature=list(self._temp_history),
                anomaly_detected=self.anomaly_detected,
            )

        except Exception as error:
            logger.warning(
                f"Could not calculate health details: {error}"
            )

            score, status = self._calculate_available_sensor_health()

            return {
                "score": score,
                "status": status,
                "available_sensors": {
                    "temperature": self.temperature is not None,
                    "humidity": self.humidity is not None,
                    "mq5": self.mq5 is not None,
                    "mq2": self.mq2 is not None,
                },
                "note": (
                    "Health score calculated using available sensors. "
                    "Optional unconnected sensors are not treated as faults."
                ),
            }


# ─────────────────────────────────────────────────────────────────────────────
# Global singleton instance
# ─────────────────────────────────────────────────────────────────────────────

digital_twin = DigitalTwin()