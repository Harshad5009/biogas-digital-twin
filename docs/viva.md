# Academic Viva & Examiner Q&A Guide

**Project Title:** IoT-Enabled Digital Twin for Real-Time Biogas Digester Monitoring, Anomaly Detection and Predictive Analysis

---

## 1. Core Engineering Concepts

### Q1: What makes this a "Digital Twin" rather than just an IoT Dashboard?
**Answer:**
A dashboard merely visualizes raw telemetric streams. A **Digital Twin** maintains an internal state representation of the physical entity, tracks historic trend trajectories, executes continuous multi-level anomaly detection, transparently calculates a real-time health index, performs predictive modeling, and allows **What-If hypothetical simulations** on the virtual instance without risking the physical process.

### Q2: Why are MQ-5 and MQ-2 values documented as relative indicators?
**Answer:**
MQ series sensors are tin-dioxide semiconductor sensors influenced by ambient temperature, humidity, and cross-sensitivity with other gases. In an academic prototype without specialized gas chromatography or calibrated NDIR sensors, claiming accurate PPM or volumetric methane concentration is unscientific. We treat them as relative gas-presence indicators while clearly labeling methane concentrations as simulation estimates.

### Q3: How does Anomaly Detection work without deep learning?
**Answer:**
We use a two-tiered explainable architecture:
1. **Level 1 (Rule-Based):** Immediate physical boundaries (e.g. temp <20°C or >40°C, sudden inter-sample spikes).
2. **Level 2 (Trend-Based):** Rolling window analysis (moving average, variance, rate-of-change, and slope). It detects sustained gradual decline (e.g., biological cooling or acidification) long before a fixed threshold is breached.

### Q4: How is the Health Score calculated?
**Answer:**
The Health Score (0–100) is transparent and additive:
- **Temperature Score (25 pts):** Optimal mesophilic window (28–35°C).
- **Gas Production Score (30 pts):** Optimal yield range (1.5–3.5 L/min).
- **Production Trend Score (25 pts):** Positive or flat slope over recent window.
- **Methane Estimate Score (20 pts):** Theoretical composition factor.
- **Anomaly Penalty (-20 pts):** Subtracted when anomaly flags are active.

---

## 2. 3-Minute Examiner Demonstration Script

1. **Step 1 (Open Dashboard):** Show the dark IoT user interface, KPI cards, real-time gauges, and live WebSocket streaming.
2. **Step 2 (Explain Data Pipeline):** Point out the "SIMULATION MODE" badge. Explain that the data follows the exact JSON schema that the ESP8266 firmware produces.
3. **Step 3 (Trigger Scenario 2 - Temp Drop):** Switch scenario to "Temperature Drop". Show the temperature dropping on the live chart.
4. **Step 4 (Show Degradation Detection):** Point out the Level 2 trend detection alert in the Anomaly Panel and the decreasing Health Index.
5. **Step 5 (Demonstrate Predictive Analysis):** Navigate to the Prediction page to show the Linear Regression trend line forecasting lower gas production.
6. **Step 6 (Demonstrate What-If Simulation):** Navigate to What-If page. Adjust hypothetical temperature to 27°C and show predicted gas yield reduction while the live twin remains unaffected.
7. **Step 7 (Explain Hardware Switch):** Point to `esp8266/` firmware and explain how flashing the ESP8266 switches `"source": "ESP8266"` without altering a single line of backend or frontend code.
