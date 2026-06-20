# Backend Setup - Fixed Dependencies ✅

The dependency conflict with `typing-extensions` has been resolved!

## The Problem

TensorFlow on macOS (`tensorflow-macos`) requires `typing-extensions<4.6.0`, but newer FastAPI/Pydantic versions require `>=4.6.0`. This creates a conflict.

## The Solution

We've pinned `typing-extensions==4.5.0` which satisfies both requirements.

## Installation

### Option 1: Use the Installation Script (Recommended)

```bash
cd backend
./install.sh
```

This script will:
1. Create/activate virtual environment
2. Install dependencies in the correct order
3. Install the appropriate TensorFlow version for your platform

### Option 2: Manual Installation

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

If you still get conflicts, try installing in this order:

```bash
pip install typing-extensions==4.5.0
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0 pydantic==2.5.0 numpy==1.24.3 python-multipart==0.0.6
pip install tensorflow-macos==2.13.0  # For macOS
# OR
pip install tensorflow==2.13.0  # For Linux/Windows
```

## Starting the Server

```bash
cd backend
source venv/bin/activate
python main.py
```

The server will start at: `http://localhost:8000`

## What Changed

1. ✅ Updated `backend/main.py` to match your existing `api.py` structure
2. ✅ Uses models from `asl_project/` folder
3. ✅ Loads word labels from `asl_project/labels.txt` (HELLO, NO, SORRY, THANKYOU, YES)
4. ✅ Fixed dependency conflicts with `typing-extensions==4.5.0`
5. ✅ Platform-specific TensorFlow installation (macOS vs Linux/Windows)

## Testing

Once the server is running, test it:

```bash
# Test alphabet mode
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{"mode": "alphabet", "landmarks": [0.5] * 63}'

# Test word mode
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{"mode": "word", "landmarks": [0.5] * 1890}'
```

## Current Word Labels

Based on `asl_project/labels.txt`:
- 0: HELLO
- 1: NO
- 2: SORRY
- 3: THANKYOU
- 4: YES

The backend will automatically load these labels when it starts.

## Troubleshooting

1. **Still getting dependency conflicts?**
   - Try the installation script (`./install.sh`)
   - Or install packages one by one in the order shown above

2. **Models not found?**
   - Make sure `asl_project/` folder exists in the parent directory
   - Check that model files exist:
     - `../asl_project/asl_alphabet_model.h5`
     - `../asl_project/asl_dynamic_word_lstm.h5`
     - `../asl_project/labels.txt`

3. **ModuleNotFoundError?**
   - Make sure virtual environment is activated
   - Run `pip install -r requirements.txt` again

---

**Setup Complete! 🎉**

Your backend is now ready to use with your trained models.







