#!/bin/bash
# Setup script for ASL Backend (compatible versions)

echo "🔧 Setting up ASL Backend with compatible versions..."
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install typing-extensions first (compatible with TensorFlow-macos)
echo "📥 Installing typing-extensions 4.5.0..."
pip install typing-extensions==4.5.0

# Install compatible FastAPI/Pydantic versions
echo "📥 Installing FastAPI 0.95.2 (compatible with typing-extensions 4.5.0)..."
pip install fastapi==0.95.2

echo "📥 Installing Uvicorn..."
pip install "uvicorn[standard]==0.22.0"

echo "📥 Installing Pydantic 1.10.12 (compatible with typing-extensions 4.5.0)..."
pip install pydantic==1.10.12

echo "📥 Installing other dependencies..."
pip install numpy==1.24.3
pip install python-multipart==0.0.6

# Install TensorFlow for macOS
echo "📥 Installing TensorFlow for macOS..."
pip install tensorflow-macos==2.13.0

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server, run:"
echo "  source venv/bin/activate"
echo "  python main.py"
