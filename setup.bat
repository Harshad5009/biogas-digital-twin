@echo off
echo ====================================================================
echo  BIOGAS DIGITAL TWIN — One-Click Setup Script
echo ====================================================================

echo [1/3] Setting up Python virtual environment and dependencies...
cd backend
if not exist "venv" (
    python -m venv venv
)
call .\venv\Scripts\activate.bat
pip install -r requirements.txt
cd ..

echo [2/3] Setting up React frontend dependencies...
cd frontend
call npm install
cd ..

echo [3/3] Setting up environment configuration...
if not exist ".env" (
    copy .env.example .env
    echo Created .env from template.
)

echo ====================================================================
echo  Setup Completed Successfully!
echo  Run 'run_backend.bat' and 'run_frontend.bat' in separate terminals.
echo ====================================================================
pause
