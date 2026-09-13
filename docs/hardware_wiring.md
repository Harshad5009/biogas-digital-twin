# Hardware Wiring & Setup Guide (ESP8266 + MQ-5 + MQ-2)

This document provides complete instructions for wiring the physical components to the **ESP8266** (NodeMCU / Wemos D1 Mini), power considerations, single-ADC architecture solutions, and a 12-stage hardware testing sequence.

---

## 1. Component Bill of Materials (BOM)

| Component | Function | Interface Type | Operating Voltage |
|---|---|---|---|
| **ESP8266 NodeMCU** | Wi-Fi Microcontroller | Digital / I2C / ADC | 3.3V Logic / 5V USB |
| **DHT11** | Temperature & Humidity Sensor | Single-Bus Digital | 3.3V – 5.0V |
| **MQ-5** | Methane/LPG Relative Gas Indicator | Analog Voltage (A0) | 5.0V (Heater ~150mA) |
| **MQ-2** | Gas/Smoke Relative Indicator | Analog Voltage (A0) | 5.0V (Heater ~150mA) |
| **SSD1306 OLED** | 0.96" 128x64 Process Display | I2C (SDA/SCL) | 3.3V – 5.0V |
| **Active Buzzer** | Acoustic Alert Transducer | Digital Output | 3.3V – 5.0V |
| **Potentiometer** (10kΩ) | Simulation Control Demo | Analog Voltage (A0) | 3.3V |
| **Breadboard & Jumpers** | Prototyping Interconnects | Wire | — |

---

## 2. ESP8266 NodeMCU Pin Assignment Table

| ESP8266 Pin (Silk) | ESP8266 GPIO | Connected Component | Function / Signal |
|---|---|---|---|
| **A0** | ADC0 / TOUT | MQ Sensor / Potentiometer | Single Analog Channel (0–1024 ADC) |
| **D1** | GPIO 5 | SSD1306 OLED `SCL` | I2C Clock Line |
| **D2** | GPIO 4 | SSD1306 OLED `SDA` | I2C Data Line |
| **D5** | GPIO 14 | DHT11 `DATA` | Single-wire digital communication |
| **D6** | GPIO 12 | Active Buzzer `+` | High = Alarm ON, Low = Alarm OFF |
| **VIN / 5V** | — | MQ-5 & MQ-2 `VCC`, Buzzer `VCC` | External 5V Power Rail |
| **3V3** | — | DHT11 `VCC`, OLED `VCC` | 3.3V Regulated Logic Rail |
| **GND** | — | All Component `GND` pins | Common Ground (Mandatory) |

---

## 3. Crucial MQ Sensor Power & ADC Safety Warnings

> [!WARNING]
> **1. Heater Current Requirements:**
> MQ-series sensors (MQ-5, MQ-2) contain internal heating elements that require **5.0V** and consume between **150mA and 200mA each**. Never attempt to power MQ sensor heaters directly from ESP8266 3.3V GPIO pins, as this will damage the microcontroller's internal voltage regulator and cause reboot loops. Always supply MQ sensors from the **VIN / 5V USB rail** or a dedicated 5V power supply.

> [!IMPORTANT]
> **2. ESP8266 Single ADC (`A0`) Input Voltage:**
> The ESP8266 chip bare ADC pin accepts a maximum of **1.0V**. Most NodeMCU and Wemos D1 Mini boards include an on-board resistor voltage divider (220k / 100k) that safely scales **0 to 3.3V** at the board's `A0` header.
> Ensure your MQ module analog output voltage does not exceed your specific board's `A0` maximum input limit. If your MQ module outputs up to 5V analog, connect a simple voltage divider (e.g., 10kΩ and 20kΩ) between MQ `AOUT` and ESP8266 `A0`.

---

## 4. Addressing the ESP8266 Single-ADC Limitation

Because the ESP8266 contains only one analog-to-digital converter (`A0`), two analog sensors cannot be read simultaneously without external multiplexing hardware (such as an ADS1115 or CD74HC4067).

To ensure complete, safe operation without requiring additional purchases:
1. **Primary Sensor Mode (Recommended):**
   - Connect MQ-5 to `A0`.
   - The firmware reads the physical gas level on `A0` for MQ-5.
   - The secondary MQ-2 indicator is calculated using a proportional atmospheric baseline, allowing the Digital Twin and MQTT pipeline to receive both parameters cleanly.
2. **Potentiometer Interactive Simulation Mode:**
   - Connect the 10kΩ Potentiometer wiper to `A0` (outer pins to 3.3V and GND).
   - Rotating the knob dynamically changes the gas level in real time on the Digital Twin dashboard to demonstrate responsiveness and anomaly triggers.

To switch modes in firmware, update `#define HARDWARE_MODE` in [`esp8266/biogas_node/config.h`](file:///C:/Users/HARSHAD%20THOK/.gemini/antigravity-ide/scratch/biogas-digital-twin/esp8266/biogas_node/config.h).

---

## 5. Step-by-Step 12-Stage Hardware Testing Sequence

Verify your physical setup systematically to prevent wiring mistakes:

```
[Test 1: Power & Serial] ──> [Test 2: DHT11] ──> [Test 3: OLED Display]
             │
             ▼
[Test 4: MQ Sensor on A0] ──> [Test 5: Buzzer] ──> [Test 6: Wi-Fi Link]
             │
             ▼
[Test 7: MQTT Broker] ──> [Test 8: JSON Publish] ──> [Test 9: Backend Ingest]
             │
             ▼
[Test 10: SQLite Storage] ──> [Test 11: Twin Sync] ──> [Test 12: Live Dashboard]
```

1. **TEST 1 (Power On):** Connect ESP8266 to USB. Verify the on-board power LED lights up. Open Serial Monitor at `115200 baud`.
2. **TEST 2 (DHT11 Verification):** Verify temperature and humidity values appear on Serial Monitor without `[WARN]` messages.
3. **TEST 3 (OLED Screen):** Verify the SSD1306 displays `"BIOGAS DIGITAL TWIN"` splash screen followed by live readings.
4. **TEST 4 (MQ Analog Reading):** Expose the MQ sensor to a small gas source (e.g., lighter gas without flame) and observe the ADC reading rise in Serial Monitor.
5. **TEST 5 (Buzzer Check):** Trigger an alert to confirm the buzzer beeps cleanly without freezing the board.
6. **TEST 6 (Wi-Fi Connection):** Check Serial Monitor for `[WiFi] Connected! IP Address: 192.168.x.x`.
7. **TEST 7 (MQTT Connection):** Ensure Mosquitto broker is running and check for `[MQTT] Connected!`.
8. **TEST 8 (JSON Payload):** Verify ESP8266 prints `[MQTT] Published sensor data: {"device_id":"digester01",...}`.
9. **TEST 9 (Backend Ingestion):** Check backend terminal logs for incoming payload processing.
10. **TEST 10 (SQLite Database):** Query `data/biogas.db` to confirm new records have `source = 'ESP8266'` and valid `mq2_value`.
11. **TEST 11 (Digital Twin Update):** Verify `/api/twin/state` returns `data_source: "ESP8266"` and updated `gas_indicator`.
12. **TEST 12 (Live React Dashboard):** Open `http://localhost:5173` and observe the header badge switch to `🟢 ESP8266 LIVE HARDWARE`.
