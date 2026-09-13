@echo off
title Biogas Digital Twin System

cd /d "%~dp0"

echo Starting MQTT broker...
docker compose up -d

echo Starting backend...
start "Biogas Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --reload --port 8001"

timeout /t 3 /nobreak >nul

echo Starting frontend...
start "Biogas Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo All startup commands have been executed.
pause