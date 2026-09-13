"""
schemas.py — Pydantic models for API request/response validation.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


# ─────────────────────────────────────────────────────────────
# Sensor Reading Schemas
# ─────────────────────────────────────────────────────────────

class SensorDataIn(BaseModel):
    """Schema for incoming sensor data (from ESP8266 or simulation)."""
    device_id: str = "digester01"
    timestamp: Optional[datetime] = None
    temperature: Optional[float] = Field(None, ge=-10, le=100, description="°C")
    humidity: Optional[float] = Field(None, ge=0, le=100, description="%RH")
    mq5: Optional[float] = Field(None, ge=0, description="MQ-5 ADC raw value")
    mq2: Optional[float] = Field(None, ge=0, description="MQ-2 ADC raw value")
    methane: Optional[float] = Field(None, ge=0, le=100, description="Simulated methane %")
    gas_production: Optional[float] = Field(None, ge=0, description="Simulated L/min")
    source: str = Field("SIMULATION", description="SIMULATION or ESP8266")


class SensorReadingOut(BaseModel):
    """Schema for returning sensor reading from API."""
    id: int
    timestamp: datetime
    device_id: str
    temperature: Optional[float]
    humidity: Optional[float]
    mq5_value: Optional[float]
    mq2_value: Optional[float]
    methane_simulated: Optional[float]
    gas_production_simulated: Optional[float]
    source: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# Digital Twin State Schemas
# ─────────────────────────────────────────────────────────────

class TwinStateOut(BaseModel):
    """Schema for Digital Twin state response."""
    id: int
    timestamp: datetime
    temperature: Optional[float]
    humidity: Optional[float]
    gas_indicator: Optional[float]
    methane_estimate: Optional[float]
    gas_production: Optional[float]
    health_score: Optional[float]
    status: str
    anomaly_detected: bool
    anomaly_reason: Optional[str]
    data_source: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# Prediction Schemas
# ─────────────────────────────────────────────────────────────

class PredictionOut(BaseModel):
    id: int
    timestamp: datetime
    prediction_horizon: Optional[str]
    parameter: Optional[str]
    predicted_value: Optional[float]
    confidence: Optional[float]
    model_type: Optional[str]
    based_on: str

    class Config:
        from_attributes = True


class PredictionResult(BaseModel):
    """Detailed prediction response including trend direction."""
    parameter: str
    current_value: Optional[float]
    predicted_value: Optional[float]
    horizon: str
    trend: str          # "INCREASING" / "DECREASING" / "STABLE"
    confidence: Optional[float]
    model_type: str
    data_note: str      # Always clearly states if based on simulation data


# ─────────────────────────────────────────────────────────────
# Simulation / What-If Schemas
# ─────────────────────────────────────────────────────────────

class SimulationStartRequest(BaseModel):
    """Request to start a named simulation scenario."""
    scenario: str = Field(
        "normal",
        description="Scenario name: normal / temp_drop / gas_degradation / sudden_spike / recovery"
    )


class WhatIfRequest(BaseModel):
    """Request for What-If simulation — modifies Digital Twin only, not physical system."""
    temperature: Optional[float] = Field(None, ge=0, le=60)
    humidity: Optional[float] = Field(None, ge=0, le=100)
    mq5_override: Optional[float] = Field(None, ge=0)
    mq2_override: Optional[float] = Field(None, ge=0)
    duration_hours: float = Field(6.0, ge=0.5, le=24.0)

    class Config:
        json_schema_extra = {
            "example": {
                "temperature": 27.0,
                "humidity": 65.0,
                "duration_hours": 6.0
            }
        }


class WhatIfResult(BaseModel):
    """Result of a What-If simulation run."""
    disclaimer: str = "WHAT-IF SIMULATION — NO PHYSICAL SYSTEM CHANGE"
    input_temperature: Optional[float] = None
    input_humidity: Optional[float] = None
    input_mq5: Optional[float] = None
    input_mq2: Optional[float] = None
    gas_indicator: Optional[float] = None
    duration_hours: Optional[float] = None
    predicted_methane: float
    predicted_gas_production: float
    predicted_health_score: float
    predicted_status: str
    summary: str
    data_note: str = "All values are simulation-based estimates only."


# ─────────────────────────────────────────────────────────────
# Alert Schemas
# ─────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: int
    timestamp: datetime
    level: str
    message: Optional[str]
    parameter: Optional[str]
    value: Optional[float]
    acknowledged: bool

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# Health Schemas
# ─────────────────────────────────────────────────────────────

class HealthScoreDetail(BaseModel):
    """Transparent health score with contributing factors."""
    score: float
    status: str
    factors: List[dict]   # List of {name, score, weight, contribution, note}
    summary: str


# ─────────────────────────────────────────────────────────────
# System Status Schema
# ─────────────────────────────────────────────────────────────

class SystemStatusOut(BaseModel):
    backend: str = "ONLINE"
    mqtt_connected: bool
    simulation_active: bool
    database_ok: bool
    digester_id: str
    last_data_received: Optional[datetime]
    data_source: str
