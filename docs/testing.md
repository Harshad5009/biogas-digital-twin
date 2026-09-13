# Comprehensive Testing Guide & Test Procedures

This document outlines automated and manual verification procedures for the Biogas Digital Twin.

---

## 1. Automated Test Execution

### Running Backend Unit & Integration Tests:
```powershell
cd backend
.\venv\Scripts\activate.bat
python -m unittest discover -s tests -v
```

### Verified Test Suite (16 Automated Tests):
1. `test_root_endpoint`: Verifies API alive status and documentation endpoint.
2. `test_system_status`: Verifies SQLite, Backend, and MQTT subsystem health check.
3. `test_digital_twin_state`: Verifies twin virtual state synchronization.
4. `test_what_if_endpoint`: Verifies hypothetical scenario projections.
5. `test_simulation_start_endpoint`: Verifies live scenario switching.
6. `test_predictions_endpoint`: Verifies Linear Regression prediction engine.
7. `test_normal_scenario`: Verifies Scenario 1 range stability.
8. `test_temperature_drop_scenario`: Verifies Scenario 2 degradation slope.
9. `test_sudden_spike_scenario`: Verifies Scenario 4 gas spike trigger.
10. `test_recovery_scenario`: Verifies Scenario 5 baseline return.
11. `test_health_score_calculation`: Verifies transparent 0-100 formulation.
12. `test_prediction_model`: Verifies regression trend classifications.
13. `test_rule_based_anomaly_detection`: Verifies Level 1 hard limits.
14. `test_twin_normal_update`: Verifies in-memory rolling history updates.
15. `test_twin_temperature_drop_degradation`: Verifies state degradation logic.
16. `test_what_if_simulation`: Verifies isolation from physical hardware.

---

## 2. Frontend Build Verification

```powershell
cd frontend
npm run build
```
Build output produces optimized minified bundles in `frontend/dist/`.

---

## 3. Manual End-to-End Demonstration Checklist

| Step | Action | Expected Visual Result |
|---|---|---|
| 1 | Launch Backend & Frontend | Dashboard renders with dark IoT aesthetics. |
| 2 | Check WebSocket Status | "LIVE" green dot active in top header. |
| 3 | Change Scenario to "Temp Drop" | Temperature trends downwards; Gas production decreases. |
| 4 | Observe Anomaly Panel | Level 2 Degradation Warning triggered; Health score drops. |
| 5 | Open "Predictive Analysis" | Linear Regression shows downward sloping trend line. |
| 6 | Open "What-If Simulation" | Move temperature slider to 22°C; observe predicted low yield without affecting live twin. |
| 7 | Switch Scenario to "Recovery" | Temperature and gas yield smoothly return to optimal mesophilic range. |
