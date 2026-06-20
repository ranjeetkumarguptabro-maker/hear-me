#!/bin/bash
# Azure App Service startup script
# Changes to backend directory and starts the app

cd backend || exit 1
gunicorn -k uvicorn.workers.UvicornWorker main:app --bind=0.0.0.0:8000 --timeout=600

