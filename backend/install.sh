#!/bin/bash
# Installation script for ASL Backend
# This script handles TensorFlow installation properly for macOS

echo "🔧 Installing ASL Backend Dependencies..."
echo ""

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install base dependencies first (without TensorFlow)
echo ""
echo "📥 Installing base dependencies..."
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0 pydantic==2.5.0 numpy==1.24.3 python-multipart==0.0.6 typing-extensions==4.5.0

# Install TensorFlow based on platform
echo ""
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 macOS detected - installing tensorflow-macos..."
    pip install tensorflow-macos==2.13.0
else
    echo "🐧 Linux/Windows detected - installing tensorflow..."
    pip install tensorflow==2.13.0
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "To start the server, run:"
echo "  source venv/bin/activate"
echo "  python main.py"







