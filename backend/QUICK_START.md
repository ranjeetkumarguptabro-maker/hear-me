# Quick Start Guide - Backend Setup (Fixed Dependencies)

## The Issue

TensorFlow-macos 2.13.0 requires `typing-extensions < 4.6.0`, but Pydantic 2.x requires `typing-extensions >= 4.6.0`. 

**Solution**: Use compatible older versions (FastAPI 0.95.2 + Pydantic 1.10.12) that work with `typing-extensions 4.5.0`.

## Install Dependencies

Run these commands:

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install typing-extensions first (compatible with TensorFlow-macos)
pip install typing-extensions==4.5.0

# Install compatible FastAPI/Pydantic versions
pip install fastapi==0.95.2
pip install "uvicorn[standard]==0.22.0"
pip install pydantic==1.10.12

# Install other dependencies
pip install numpy==1.24.3
pip install python-multipart==0.0.6

# Install TensorFlow for macOS
pip install tensorflow-macos==2.13.0
```

Or use the setup script:
```bash
cd backend
./setup.sh
```

## Start the Server

```bash
cd backend
source venv/bin/activate
python main.py
```

You should see:
```
📦 Loading alphabet model from: ...
✅ Alphabet model loaded
📦 Loading word model from: ...
✅ Word model loaded
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

## Test the Server

```bash
# Test alphabet mode
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{"mode": "alphabet", "landmarks": [0.5] * 63}'
```

## Troubleshooting

### If you get import errors:

Uninstall conflicting packages and reinstall:
```bash
source venv/bin/activate
pip uninstall fastapi pydantic uvicorn typing-extensions -y
pip install typing-extensions==4.5.0
pip install fastapi==0.95.2 "uvicorn[standard]==0.22.0" pydantic==1.10.12
```

### If models aren't found:

Make sure these files exist:
- `../asl_project/asl_alphabet_model.h5`
- `../asl_project/asl_dynamic_word_lstm.h5`
- `../asl_project/labels.txt`
