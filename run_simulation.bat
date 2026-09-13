@echo off
echo ====================================================================
echo  Biogas Digital Twin — Triggering Simulation Scenario
echo ====================================================================
echo Choose Scenario:
echo  1. Normal Operation (normal)
echo  2. Temperature Drop (temp_drop)
echo  3. Gas Degradation (gas_degradation)
echo  4. Sudden Sensor Spike (sudden_spike)
echo  5. Recovery Mode (recovery)
echo ====================================================================
set /p choice="Enter scenario number [1-5]: "

if "%choice%"=="1" set SCENARIO=normal
if "%choice%"=="2" set SCENARIO=temp_drop
if "%choice%"=="3" set SCENARIO=gas_degradation
if "%choice%"=="4" set SCENARIO=sudden_spike
if "%choice%"=="5" set SCENARIO=recovery

echo Activating scenario: %SCENARIO%
curl -X POST http://localhost:8000/api/simulation/start -H "Content-Type: application/json" -d "{\"scenario\": \"%SCENARIO%\"}"
echo.
pause
