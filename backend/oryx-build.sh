#!/bin/bash
# Oryx build script for Azure
# This ensures Oryx builds from the backend directory

echo "Building Python application from backend directory..."
cd /tmp/zipdeploy/extracted/backend || exit 1
pip install --upgrade pip
pip install -r requirements.txt

