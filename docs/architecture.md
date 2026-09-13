# System Architecture — Biogas Digester Digital Twin

## 1. Architectural Overview

The system bridges physical or simulated sensing with an intelligent software twin.

```
┌────────────────────────────────────────────────────────┐
│               DATA ACQUISITION LAYER                   │
│                                                        │
│  [Physical Path]                  [Simulation Path]    │
│   DHT11 / MQ-5 / MQ-2              Physics Simulator   │
│         ↓                                  ↓           │
│       ESP8266                      5 Timed Scenarios   │
│         ↓                                  ↓           │
│   MQTT JSON Payload ───(Identical Schema)──┘           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            COMMUNICATION & INGESTION LAYER             │
│                                                        │
│    Eclipse Mosquitto Broker (TCP 1883 / WS 9001)       │
│    FastAPI Ingestion Pipeline (process_sensor_data)    │
│    SQLite Database / SQLAlchemy ORM                    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 DIGITAL TWIN ENGINE                    │
│                                                        │
│  1. Live State Sync (Twin.update())                    │
│  2. Anomaly Detection (Level 1 Rule + Level 2 Trend)   │
│  3. Health Scoring (Transparent 0-100 formulation)     │
│  4. Predictive Analysis (Linear Regression R²)         │
│  5. What-If Virtual Simulation (Empirical Process)     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             PRESENTATION & ALERT LAYER                 │
│                                                        │
│   Real-Time WebSocket Server (/ws broadcast)           │
│   React 18 + Vite + TypeScript Web Dashboard           │
│   Bi-Directional MQTT Alerts -> ESP8266 Buzzer         │
└────────────────────────────────────────────────────────┘
```

## 2. Shared Data Contract

Both hardware and simulation generate identical JSON payloads:
```json
{
  "device_id": "digester01",
  "temperature": 32.1,
  "humidity": 61.0,
  "mq5": 420,
  "mq2": 315,
  "methane": 58.2,
  "gas_production": 2.500,
  "source": "SIMULATION"
}
```

When ESP8266 hardware is connected, `"source"` becomes `"ESP8266"`.
No application logic or database schema changes are required.
