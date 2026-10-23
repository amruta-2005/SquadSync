@echo off
cd /d "%~dp0"
echo Starting SquadSync FastAPI Backend on http://127.0.0.1:8000 ...
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend --reload-include "*.py" --reload-exclude "*.db*" --reload-exclude "*.db-journal*"
