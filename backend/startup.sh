#!/bin/bash
# Azure App Service startup script for FastAPI backend

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Start the FastAPI application using gunicorn
gunicorn -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000 --timeout 600

