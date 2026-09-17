"""
main.py — FastAPI application entry point.

Pipeline:
    Simulation / ESP8266
        → MQTT / REST ingest
        → process_sensor_data()
        → Normalize sensor data
        → Database storage
        → Digital Twin update
        → WebSocket broadcast to frontend

Run with:
    python -m uvicorn app.main:app --reload --port 8001
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.database import init_db, SessionLocal
from app.database import models
from app.digital_twin.twin import digital_twin
from app.mqtt.client import mqtt_client
from app.simulation.simulator import (
    simulator,
    run_simulation_loop,
    stop_simulation,
)
from app.api import (
    routes_sensors,
    routes_twin,
    routes_prediction,
    routes_simulation,
    routes_health,
)


# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-20s | %(levelname)-8s | %(message)s",
)

logger = logging.getLogger("main")


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket connection manager
# ─────────────────────────────────────────────────────────────────────────────

class ConnectionManager:
    """Tracks all active WebSocket connections and broadcasts messages."""

    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)
        logger.info(
            f"WebSocket connected ({len(self.active)} total)"
        )

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)
        logger.info(
            f"WebSocket disconnected ({len(self.active)} remaining)"
        )

    async def broadcast(self, data: dict):
        """Send data to all connected WebSocket clients."""

        if not self.active:
            return

        message = json.dumps(data, default=str)
        disconnected = set()

        for ws in self.active.copy():
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.add(ws)

        for ws in disconnected:
            self.active.discard(ws)


ws_manager = ConnectionManager()


# ─────────────────────────────────────────────────────────────────────────────
# Sensor data normalization
# ─────────────────────────────────────────────────────────────────────────────

def normalize_sensor_data(data: dict) -> dict:
    """
    Convert ESP8266 MQTT payload into a common format expected by
    the Digital Twin.

    ESP8266 payload example:
    {
        "device_id": "digester01",
        "temperature": 28.7,
        "humidity": 70.0,
        "mq5_analog": 256,
        "mq5_status": "NORMAL",
        "mq2_status": "NORMAL",
        "system_status": "NORMAL"
    }

    Normalized format:
    {
        "temperature": 28.7,
        "humidity": 70.0,
        "mq5": 256,
        "mq2": 0,
        "source": "ESP8266"
    }
    """

    # Detect whether the message came from the physical ESP8266.
    is_esp8266_data = (
        "mq5_analog" in data
        or "mq5_status" in data
        or "mq2_status" in data
        or data.get("source") == "ESP8266"
    )

    if is_esp8266_data:
        source = "ESP8266"
    else:
        source = data.get("source", "SIMULATION")

    # MQ-5:
    # ESP8266 sends "mq5_analog", while Digital Twin expects "mq5".
    mq5_value = data.get(
        "mq5_analog",
        data.get("mq5")
    )

    # MQ-2:
    # ESP8266 currently sends a digital status:
    # NORMAL → 0
    # ALERT  → 1
    #
    # If a numeric mq2 value already exists, preserve it.
    mq2_status = str(
        data.get("mq2_status", "")
    ).upper()

    if "mq2" in data and data.get("mq2") is not None:
        mq2_value = data.get("mq2")
    else:
        mq2_value = 1 if mq2_status == "ALERT" else 0

    normalized_data = {
        **data,

        "device_id": data.get(
            "device_id",
            settings.DIGESTER_ID
        ),

        "temperature": data.get("temperature"),
        "humidity": data.get("humidity"),

        # Common Digital Twin field names
        "mq5": mq5_value,
        "mq2": mq2_value,

        # Preserve original ESP8266 fields
        "mq5_analog": data.get("mq5_analog"),
        "mq5_status": data.get("mq5_status"),
        "mq2_status": data.get("mq2_status"),
        "system_status": data.get("system_status"),

        # Optional simulated/estimated values
        "methane": data.get("methane"),
        "gas_production": data.get("gas_production"),

        # Correct source identification
        "source": source,
    }

    return normalized_data


# ─────────────────────────────────────────────────────────────────────────────
# Core data pipeline
# ─────────────────────────────────────────────────────────────────────────────

async def process_sensor_data(data: dict):
    """
    Central pipeline called for every incoming sensor reading.

    Steps:
    1. Normalize ESP8266 or simulation data
    2. Store sensor reading in database
    3. Update Digital Twin
    4. Persist Digital Twin state
    5. Store alerts if an anomaly is detected
    6. Broadcast updated data through WebSocket
    """
    # Filter: Ignore non-sensor payloads (alerts, commands, empty messages)
    has_sensor_data = any(
        data.get(k) is not None
        for k in ("temperature", "humidity", "mq5", "mq5_analog", "mq2", "mq2_status", "gas_production", "methane")
    )
    if not has_sensor_data:
        logger.debug("Skipping process_sensor_data for non-sensor payload: %s", data)
        return

    db = SessionLocal()
    twin_state = None

    try:
        # ─────────────────────────────────────────────────────────────────────
        # 1. Normalize incoming data
        # ─────────────────────────────────────────────────────────────────────

        normalized_data = normalize_sensor_data(data)

        device_id = normalized_data.get(
            "device_id",
            settings.DIGESTER_ID
        )

        source = normalized_data.get(
            "source",
            "SIMULATION"
        )

        logger.info(
            f"Incoming {source} data | "
            f"temperature={normalized_data.get('temperature')} | "
            f"humidity={normalized_data.get('humidity')} | "
            f"mq5={normalized_data.get('mq5')} | "
            f"mq2={normalized_data.get('mq2')}"
        )

        # ─────────────────────────────────────────────────────────────────────
        # 2. Store raw sensor reading in database
        # ─────────────────────────────────────────────────────────────────────

        reading = models.SensorReading(
            timestamp=datetime.now(timezone.utc),

            device_id=device_id,

            temperature=normalized_data.get("temperature"),
            humidity=normalized_data.get("humidity"),

            # Common normalized values
            mq5_value=normalized_data.get("mq5"),
            mq2_value=normalized_data.get("mq2"),

            # These are optional and may be null for real ESP8266 data
            methane_simulated=normalized_data.get("methane"),
            gas_production_simulated=normalized_data.get(
                "gas_production"
            ),

            source=source,
        )

        db.add(reading)
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 3. Update Digital Twin using normalized data
        # ─────────────────────────────────────────────────────────────────────

        twin_state = digital_twin.update(normalized_data)

        # Make sure the returned state is a dictionary
        if twin_state is None:
            twin_state = digital_twin.to_dict()

        logger.info(
            f"Digital Twin updated | "
            f"source={source} | "
            f"temperature={twin_state.get('temperature')} | "
            f"mq5={twin_state.get('mq5')} | "
            f"mq2={twin_state.get('mq2')} | "
            f"status={twin_state.get('status')}"
        )

        # ─────────────────────────────────────────────────────────────────────
        # 4. Persist Digital Twin state
        # ─────────────────────────────────────────────────────────────────────

        twin_record = models.DigitalTwinState(
            timestamp=datetime.now(timezone.utc),

            temperature=twin_state.get("temperature"),
            humidity=twin_state.get("humidity"),

            gas_indicator=twin_state.get("gas_indicator"),
            methane_estimate=twin_state.get("methane_estimate"),
            gas_production=twin_state.get("gas_production"),

            health_score=twin_state.get("health_score"),

            status=twin_state.get(
                "status",
                "HEALTHY"
            ),

            anomaly_detected=twin_state.get(
                "anomaly_detected",
                False
            ),

            anomaly_reason=twin_state.get("anomaly_reason"),

            # Important: use normalized source, not raw data default
            data_source=source,
        )

        db.add(twin_record)

        # ─────────────────────────────────────────────────────────────────────
        # 5. Store alert if anomaly is detected
        # ─────────────────────────────────────────────────────────────────────

        if twin_state.get("anomaly_detected"):

            level = (
                "CRITICAL"
                if twin_state.get("status") == "CRITICAL"
                else "WARNING"
            )

            alert_message = twin_state.get(
                "anomaly_reason",
                "Anomaly detected"
            )

            alert = models.Alert(
                timestamp=datetime.now(timezone.utc),
                level=level,
                message=alert_message,
                parameter="system",
                value=twin_state.get("health_score"),
            )

            db.add(alert)

            # Send alert through MQTT
            try:
                mqtt_client.publish_alert(
                    level,
                    alert_message
                )
            except Exception as mqtt_error:
                logger.warning(
                    f"Could not publish MQTT alert: {mqtt_error}"
                )

        # ─────────────────────────────────────────────────────────────────────
        # 6. Commit all database changes
        # ─────────────────────────────────────────────────────────────────────

        db.commit()

        logger.info(
            f"Database updated successfully | "
            f"source={source} | device={device_id}"
        )

    except Exception as e:
        db.rollback()
        logger.exception(
            f"Pipeline error while processing sensor data: {e}"
        )
        return

    finally:
        db.close()

    # ─────────────────────────────────────────────────────────────────────────
    # 7. Broadcast updated data to frontend WebSocket clients
    # ─────────────────────────────────────────────────────────────────────────

    await ws_manager.broadcast({
        "type": "update",

        "twin_state": twin_state,

        "raw": {
            "device_id": normalized_data.get("device_id"),

            "temperature": normalized_data.get("temperature"),
            "humidity": normalized_data.get("humidity"),

            # Normalized MQ-5 value
            "mq5": normalized_data.get("mq5"),

            # Original ESP8266 MQ-5 fields
            "mq5_analog": normalized_data.get("mq5_analog"),
            "mq5_status": normalized_data.get("mq5_status"),

            # Normalized MQ-2 value
            "mq2": normalized_data.get("mq2"),

            # Original ESP8266 MQ-2 status
            "mq2_status": normalized_data.get("mq2_status"),

            "system_status": normalized_data.get("system_status"),

            # Optional fields
            "methane": normalized_data.get("methane"),
            "gas_production": normalized_data.get(
                "gas_production"
            ),

            "source": normalized_data.get("source"),
            "timestamp": normalized_data.get("timestamp"),
        },
    })


# ─────────────────────────────────────────────────────────────────────────────
# Application lifespan
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""

    logger.info("=" * 60)
    logger.info(" Biogas Digital Twin — Backend Starting")
    logger.info("=" * 60)

    # Initialize database
    init_db()
    logger.info("Database initialized.")

    # Start MQTT client
    loop = asyncio.get_running_loop()

    mqtt_client.connect(
        data_callback=process_sensor_data,
        loop=loop
    )

    # Start simulation only when enabled
    if settings.SIMULATION_ENABLED:

        sim_task = loop.create_task(
            run_simulation_loop(
                interval_sec=settings.SIMULATION_INTERVAL_SECONDS,
                data_callback=process_sensor_data,
            )
        )

        logger.info(
            f"Simulation started "
            f"(scenario={simulator.scenario}, "
            f"interval={settings.SIMULATION_INTERVAL_SECONDS}s)"
        )

    else:
        sim_task = None

        logger.info(
            "Simulation disabled — "
            "waiting for ESP8266 data via MQTT."
        )

    logger.info(
        "Backend ready. API docs: https://biogas-digital-twin-1.onrender.com/docs"
    )

    logger.info("=" * 60)

    yield

    # ─────────────────────────────────────────────────────────────────────────
    # Shutdown
    # ─────────────────────────────────────────────────────────────────────────

    logger.info("Shutting down...")

    stop_simulation()

    if sim_task and not sim_task.done():
        sim_task.cancel()

    mqtt_client.disconnect()

    logger.info("Goodbye.")


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI application
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Biogas Digital Twin API",

    description=(
        "Backend API for the IoT-Enabled Digital Twin Biogas Digester project. "
        "Provides sensor data storage, Digital Twin state, anomaly detection, "
        "predictions, and What-If simulation. "
        "SIMULATION DATA is clearly labeled and not presented as real measurements."
    ),

    version="1.0.0",
    lifespan=lifespan,
)


# ─────────────────────────────────────────────────────────────────────────────
# CORS configuration
# ─────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,

    allow_origins=settings.ALLOWED_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Register API routers
# ─────────────────────────────────────────────────────────────────────────────

app.include_router(routes_sensors.router)
app.include_router(routes_twin.router)
app.include_router(routes_prediction.router)
app.include_router(routes_simulation.router)
app.include_router(routes_health.router)


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time dashboard updates.

    Sends the current Digital Twin state immediately after connection,
    then sends new updates whenever sensor data is received.
    """

    await ws_manager.connect(websocket)

    # Send current state immediately after connecting
    try:
        await websocket.send_text(
            json.dumps(
                {
                    "type": "connected",
                    "twin_state": digital_twin.to_dict(),
                    "message": (
                        "Connected to Biogas Digital Twin WebSocket."
                    ),
                },
                default=str,
            )
        )
    except Exception:
        pass

    try:
        while True:

            # Keep the WebSocket connection alive
            data = await websocket.receive_text()

            # Handle frontend ping messages
            if data == "ping":
                await websocket.send_text(
                    json.dumps({"type": "pong"})
                )

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

    except Exception:
        ws_manager.disconnect(websocket)


# ─────────────────────────────────────────────────────────────────────────────
# Root endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Root"])
def root():
    return {
        "project": (
            "IoT-Enabled Digital Twin for Biogas Digester Monitoring"
        ),
        "status": "running",
        "docs": "/docs",
        "websocket": "/ws",
        "note": (
            "Simulation data is clearly labeled and not presented "
            "as real measurements."
        ),
    }