@echo off
echo ====================================================================
echo  Starting Biogas Digital Twin Backend (FastAPI + WebSocket)
echo ====================================================================
cd backend
call .\venv\Scripts\activate.bat
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
