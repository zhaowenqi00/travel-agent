#!/bin/bash
export PYTHONIOENCODING=utf-8
cd "$(dirname "$0")/.."
python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
