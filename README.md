# IoT-Enabled Digital Twin for Real-Time Biogas Digester Monitoring, Anomaly Detection and Predictive Analysis

> **Academic Engineering Mini-Project & Demonstration Platform**  
> Full-Stack IoT System with Virtual Twin Synchronization, Anomaly Detection, Transparent Health Scoring, Predictive Analytics, and What-If Simulation.

---

## 🌟 Project Overview

Biogas digesters rely on delicate anaerobic microbial ecosystems influenced by temperature, substrate composition, and internal moisture. This project implements a complete **Digital Twin** system for miniature/laboratory biogas digesters:

1. **Physical/Simulated Data Ingestion:** ESP8266 hardware or internal physics simulation engine publishing standardized JSON payloads via MQTT.
2. **Virtual Digital Twin Synchronization:** Continuous internal state mirroring with rolling historical windows.
3. **Two-Level Anomaly Detection:** Instant threshold violations (Level 1) and rolling-window statistical trend degradation (Level 2).
4. **Transparent Health Index (0-100):** Documented, explainable multi-factor scoring (no black-box metrics).
5. **Predictive Analytics:** Explainable Linear Regression forecasts with R² confidence metrics.
6. **What-If Virtual Simulation:** Interactive parameter tweaking on the virtual twin without altering the physical system.
7. **Production-Grade Web Dashboard:** High-aesthetic dark IoT theme built with React 18, Vite, TypeScript, and Recharts.

---

## 🏗️ System Architecture

```
PHYSICAL / SIMULATED DIGESTER
            ↓
   DHT11 / MQ-5 / MQ-2
            ↓
         ESP8266
            ↓
       Wi-Fi / MQTT
            ↓
        Mosquitto
            ↓
   FastAPI Backend / SQLite
            ↓
   DIGITAL TWIN ENGINE
   ├── Live State Sync
   ├── Anomaly Detection (Rule + Trend)
   ├── Health Scoring (0–100)
   ├── Predictive Analysis (Linear Reg.)
   └── What-If Simulation
            ↓
  WebSocket Broadcast (/ws)
            ↓
   React Web Dashboard
```

---

## 🚀 Quick Start (Windows)

### Option A — Automated Batch Scripts

1. **One-Click Setup:**
   ```powershell
   .\setup.bat
   ```
2. **Start Backend (Terminal 1):**
   ```powershell
   .\run_backend.bat
   ```
   *Backend runs on `http://localhost:8001` (API docs: `http://localhost:8001/docs`).*
3. **Start Frontend (Terminal 2):**
   ```powershell
   .\run_frontend.bat
   ```
   *Dashboard opens at `http://localhost:5173`.*

---

## 🧪 Simulation Scenarios (Zero-Hardware Demo)

The platform includes 5 physics-grounded simulation scenarios switchable in real-time:

| Scenario | Behavior | Expected System Response |
|---|---|---|
| **1. Normal Operation** | Temp 28–35°C, steady gas yield (~2.5 L/min). | Status: **HEALTHY**, Health: 90–95. |
| **2. Temperature Drop** | Gradual temperature decline below mesophilic range. | Status: **DEGRADING**, Gas yield falls, Trend warning. |
| **3. Gas Degradation** | Gas falls with stable temp (acidification/leak). | Status: **DEGRADING**, Anomaly penalty applied. |
| **4. Sudden Spike** | Abrupt MQ gas indicator change (>200 ADC units). | Level 1 Anomaly Alert triggered, buzzer command sent. |
| **5. Recovery Mode** | System parameters return to optimal baseline. | Health index restores to >85. |

---

## 🔌 Hardware Node (ESP8266 Integration)

- **Firmware Location:** `esp8266/biogas_node/`
- **Supported Hardware:** ESP8266 (NodeMCU / Wemos D1 Mini), DHT11 (Temp/Hum), MQ-5 (Gas), MQ-2 (Gas/Smoke), SSD1306 OLED (0.96" I2C), Active Buzzer, Potentiometer (for manual simulation control demo).
- **Hardware Wiring Guide:** See [`docs/hardware_wiring.md`](file:///C:/Users/HARSHAD%20THOK/.gemini/antigravity-ide/scratch/biogas-digital-twin/docs/hardware_wiring.md) for full pinouts, power safety, and single-ADC notes.
- **Data Parity:** The ESP8266 publishes identical JSON payloads to `biogas/digester01/sensors`. When hardware is active, `"source"` switches to `"ESP8266"` automatically.

---

## 📂 Project Structure

```
biogas-digital-twin/
├── README.md                  # Complete documentation
├── docker-compose.yml         # Optional Mosquitto MQTT container
├── setup.bat                  # One-click Windows setup
├── run_backend.bat            # Backend runner
├── run_frontend.bat           # Frontend runner
├── run_simulation.bat         # Scenario switcher
│
├── backend/                   # FastAPI Backend
│   ├── app/
│   │   ├── main.py            # Entry point & WebSocket broadcast
│   │   ├── config.py          # Environment settings
│   │   ├── api/               # REST Route Handlers
│   │   ├── database/          # SQLAlchemy Models & SQLite setup
│   │   ├── digital_twin/      # Digital Twin Engine
│   │   ├── analytics/         # Anomaly, Health, and Prediction logic
│   │   ├── simulation/        # Scenario generator & What-If engine
│   │   └── mqtt/              # paho-mqtt client wrapper
│   ├── requirements.txt       # Python dependencies
│   └── tests/                 # 17 Automated unit/integration tests
│
├── frontend/                  # React 18 + TypeScript Dashboard
│   ├── src/
│   │   ├── components/        # KpiCard, HealthRing, DigestorVisual, Sidebar
│   │   ├── pages/             # Dashboard, Twin, Sensors, History, WhatIf, etc.
│   │   ├── services/          # REST API & WebSocket client
│   │   ├── hooks/             # useWebSocket real-time hook
│   │   └── index.css          # Design system & dark IoT theme
│   ├── package.json
│   └── vite.config.ts
│
├── esp8266/                   # Complete ESP8266 Arduino C++ Firmware
│   └── biogas_node/
│       ├── biogas_node.ino
│       ├── config.h
│       ├── sensors.h
│       ├── display.h
│       └── mqtt_handler.h
│
├── mosquitto/                 # Mosquitto broker config
└── docs/                      # Hardware wiring, Architecture, API, MQTT, Testing, Viva
```

---

## ⚖️ Academic Integrity & Calibration Notice

* Temperature and humidity values reflect real physical DHT11 sensor readings when hardware is connected.
* MQ-5 and MQ-2 analog readings operate as relative gas presence indicators.
* Methane concentration and volumetric gas production rates are **clearly labeled as simulation estimates** unless calibrated laboratory-grade gas analyzers are connected.
