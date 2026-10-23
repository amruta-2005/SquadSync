# PowerShell startup script for SquadSync Backend
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "Starting SquadSync FastAPI Backend on http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Magenta

python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend --reload-include "*.py" --reload-exclude "*.db*" --reload-exclude "*.db-journal*"
