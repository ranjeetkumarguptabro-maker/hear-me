# Backend Integration Guide

This guide will help you integrate your Python AI model for ASL recognition into the website.

## Quick Start

1. **Copy your Python model project into the `backend/` folder**
   - Place your model files in `backend/models/`
   - Copy any utility files you need

2. **Install dependencies:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Edit `backend/main.py`:**
   - Update `load_models()` to load your model
   - Replace `predict_alphabet()` with your alphabet model inference
   - Replace `predict_word()` with your word model inference

4. **Run the server:**
   ```bash
   python main.py
   ```

5. **Start the frontend:**
   ```bash
   npm run dev
   ```

6. **Test:** Open the website and use the ASL recognition feature

## What the Frontend Sends

### Alphabet Mode
- **Input**: 63 float values (21 hand landmarks × 3 coordinates: x, y, z)
- **Format**: `[x1, y1, z1, x2, y2, z2, ..., x21, y21, z21]`

### Word Mode
- **Input**: 1890 float values (30 frames × 63 landmarks)
- **Format**: `[frame1_x1, frame1_y1, frame1_z1, ..., frame30_x21, frame30_y21, frame30_z21]`

## What Your Backend Should Return

```json
{
  "prediction": 5  // Integer: class index (0-25 for alphabet, or your word class indices)
}
```

## Example Integration

### If using TensorFlow/Keras:

```python
import tensorflow as tf
import numpy as np

alphabet_model = None
word_model = None

def load_models():
    global alphabet_model, word_model
    alphabet_model = tf.keras.models.load_model("models/alphabet_model.h5")
    word_model = tf.keras.models.load_model("models/word_model.h5")

def predict_alphabet(landmarks: List[float]) -> int:
    landmarks_array = np.array(landmarks).reshape(1, 63)
    prediction = alphabet_model.predict(landmarks_array, verbose=0)
    return int(np.argmax(prediction[0]))
```

### If using PyTorch:

```python
import torch
import numpy as np

alphabet_model = None
word_model = None

def load_models():
    global alphabet_model, word_model
    alphabet_model = torch.load("models/alphabet_model.pth")
    alphabet_model.eval()
    word_model = torch.load("models/word_model.pth")
    word_model.eval()

def predict_alphabet(landmarks: List[float]) -> int:
    landmarks_tensor = torch.FloatTensor(landmarks).reshape(1, 63)
    with torch.no_grad():
        prediction = alphabet_model(landmarks_tensor)
    return int(torch.argmax(prediction).item())
```

### If using scikit-learn:

```python
import joblib
import numpy as np

alphabet_model = None
word_model = None

def load_models():
    global alphabet_model, word_model
    alphabet_model = joblib.load("models/alphabet_model.pkl")
    word_model = joblib.load("models/word_model.pkl")

def predict_alphabet(landmarks: List[float]) -> int:
    landmarks_array = np.array(landmarks).reshape(1, -1)
    prediction = alphabet_model.predict(landmarks_array)
    return int(prediction[0])
```

## Important Notes

1. **Input Shape**: 
   - Alphabet: 63 values → reshape to (1, 63)
   - Word: 1890 values → reshape to (1, 30, 63)

2. **Normalization**: If your model expects normalized inputs, add normalization in the prediction functions

3. **Class Mapping**: The frontend receives a number. If you want to display letter/word names, you can:
   - Option A: Create a mapping in the frontend (JavaScript)
   - Option B: Modify the API to return both number and label

4. **Performance**: 
   - The frontend throttles requests (200ms for alphabet mode)
   - Word mode buffers 30 frames before sending
   - Consider caching model predictions if processing is slow

## Testing Your Integration

1. Start the backend: `python backend/main.py`
2. Test with curl (see backend/README.md)
3. Open the website and test with real hand gestures
4. Check browser console (F12) for any errors

## Need Help?

- Check `backend/README.md` for detailed setup instructions
- Verify your model input/output shapes match the expected format
- Check FastAPI docs: https://fastapi.tiangolo.com/
- Ensure CORS is configured for `http://localhost:5173`







