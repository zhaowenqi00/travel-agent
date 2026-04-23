@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
cd /d "%~dp0.."
python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
