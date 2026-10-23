@echo off
cd /d "%~dp0"
echo ========================================================
echo Starting SquadSync Backend (Port 8000) and Frontend (Port 5173)...
echo ========================================================
start "SquadSync Backend API" cmd /k "cd /d "%~dp0" && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend --reload-include "*.py" --reload-exclude "*.db*" --reload-exclude "*.db-journal*""
timeout /t 2 /nobreak >nul
start "SquadSync Frontend UI" cmd /k "cd /d "%~dp0" && npm run dev"
echo Both servers are launching in separate windows!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
