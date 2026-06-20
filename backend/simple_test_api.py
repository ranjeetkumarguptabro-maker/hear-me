"""
Simple Test API - Direct integration of your realtime_asl.py and realtime_dynamic_words.py logic
This is a minimal test to verify the models work correctly
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import tensorflow as tf
from pathlib import Path

# Get paths (same as your Python files)
BACKEND_DIR = Path(__file__).parent
ASL_PROJECT_DIR = BACKEND_DIR.parent / "asl_project"

# Load models (same as your realtime files)
print("Loading models...")
alphabet_model = tf.keras.models.load_model(str(ASL_PROJECT_DIR / "asl_alphabet_model.h5"))
print("✅ Alphabet model loaded")

word_model = tf.keras.models.load_model(str(ASL_PROJECT_DIR / "asl_dynamic_word_lstm.h5"))
print("✅ Word model loaded")

# Load word labels (same as realtime_dynamic_words.py)
labels_file = ASL_PROJECT_DIR / "labels.txt"
WORD_LABELS = []
if labels_file.exists():
    with open(labels_file, "r") as f:
        WORD_LABELS = [line.strip() for line in f.readlines()]
    print(f"✅ Loaded {len(WORD_LABELS)} word labels: {WORD_LABELS}")
else:
    print("⚠️ labels.txt not found")

ALPHABET_LABELS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

# FastAPI app
app = FastAPI(title="ASL Test API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "status": "ASL Test API Running",
        "models": {
            "alphabet": "loaded",
            "word": "loaded",
            "word_labels": WORD_LABELS
        }
    }

@app.post("/predict/alphabet")
def predict_alphabet(landmarks: list):
    """
    Predict alphabet (same logic as realtime_asl.py)
    Input: 63 values (21 points × 3 coords)
    Output: Letter (A-Z)
    """
    landmarks = np.array(landmarks, dtype=np.float32)
    
    if landmarks.shape != (63,):
        return {"error": f"Expected 63 values, got {landmarks.shape}"}
    
    # Reshape for model (same as realtime_asl.py)
    x = landmarks.reshape(1, 63)
    
    # Predict (same as realtime_asl.py: model.predict(np.array([landmarks]), verbose=0))
    prediction = alphabet_model.predict(x, verbose=0)
    
    # Get class index (same as: np.argmax(prediction))
    class_index = int(np.argmax(prediction[0]))
    
    # Get label (same as: encoder.inverse_transform([np.argmax(prediction)])[0])
    letter = ALPHABET_LABELS[class_index]
    
    return {
        "prediction": class_index,
        "label": letter,
        "confidence": float(prediction[0][class_index])
    }

@app.post("/predict/word")
def predict_word(landmarks: list):
    """
    Predict word (same logic as realtime_dynamic_words.py)
    Input: 1890 values (30 frames × 63 landmarks)
    Output: Word from labels.txt
    """
    landmarks = np.array(landmarks, dtype=np.float32)
    
    if landmarks.shape != (1890,):
        return {"error": f"Expected 1890 values (30×63), got {landmarks.shape}"}
    
    # Reshape for LSTM model (same as realtime_dynamic_words.py)
    # Sequence shape: (1, 30, 63)
    x = landmarks.reshape(1, 30, 63)
    
    # Predict (same as realtime_dynamic_words.py)
    prediction = word_model.predict(x, verbose=0)
    
    # Get class index (same as: np.argmax(prediction))
    class_index = int(np.argmax(prediction[0]))
    
    # Get label (same as: labels[np.argmax(prediction)])
    if class_index < len(WORD_LABELS):
        word = WORD_LABELS[class_index]
    else:
        word = f"Word_{class_index}"
    
    return {
        "prediction": class_index,
        "label": word,
        "confidence": float(prediction[0][class_index])
    }

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting Simple Test API on http://localhost:8000")
    print("📖 Test endpoints:")
    print("   GET  /")
    print("   POST /predict/alphabet (63 values)")
    print("   POST /predict/word (1890 values)")
    print()
    uvicorn.run(app, host="0.0.0.0", port=8000)







