# REST API & WebSocket Documentation

Base URL: `http://localhost:8001`
Interactive Swagger UI: `http://localhost:8001/docs`

---

## 1. Sensors API (`/api/sensors`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sensors/latest` | Returns most recent sensor reading. |
| `GET` | `/api/sensors/history?hours=24&limit=100` | Historical readings list (supports `source=SIMULATION` or `ESP8266`). |
| `POST` | `/api/sensors/ingest` | Direct JSON ingestion (bypasses MQTT). |

---

## 2. Digital Twin API (`/api/twin`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/twin/state` | Current synchronized virtual twin state. |
| `GET` | `/api/twin/health` | Transparent health score breakdown with factor points. |
| `GET` | `/api/twin/history?limit=100` | Historical snapshots of the twin state. |

---

## 3. Simulation & What-If API (`/api/simulation`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/simulation/start` | Set active scenario: `normal`, `temp_drop`, `gas_degradation`, `sudden_spike`, `recovery`. |
| `GET` | `/api/simulation/status` | Active scenario, run step count, and engine status. |
| `POST` | `/api/simulation/what-if` | Compute hypothetical virtual twin outcomes without changing physical hardware. |

---

## 4. Prediction API (`/api/predictions`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/predictions/` | Short-term gas yield and temperature linear trend forecasts. |
| `GET` | `/api/predictions/history` | Historical prediction logs. |

---

## 5. System & Anomalies API (`/api`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/system/status` | Overall health (FastAPI, SQLite, MQTT, Simulation). |
| `GET` | `/api/anomalies` | Detected alerts and abnormal event logs. |
| `POST` | `/api/anomalies/{id}/acknowledge` | Acknowledge specific alert. |

---

## 6. Real-Time WebSocket (`/ws`)

Connect at `ws://localhost:8001/ws`.

Broadcast message format on sensor tick:
```json
{
  "type": "update",
  "twin_state": {
    "temperature": 32.2,
    "humidity": 61.4,
    "mq5": 395.0,
    "mq2": 305.0,
    "gas_indicator": 350.0,
    "methane_estimate": 58.4,
    "gas_production": 2.512,
    "health_score": 92.5,
    "status": "HEALTHY",
    "anomaly_detected": false,
    "anomaly_reason": null,
    "data_source": "SIMULATION"
  },
  "raw": { ... }
}
```
