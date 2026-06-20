from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import tensorflow as tf

# ---------------- APP ----------------
app = FastAPI()

# ---------------- CORS (IMPORTANT) ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # allow all (dev mode)
    allow_credentials=True,
    allow_methods=["*"],        # allow POST, OPTIONS
    allow_headers=["*"],
)

# ---------------- LOAD MODELS ----------------
alphabet_model = tf.keras.models.load_model("asl_alphabet_model.h5")
word_model = tf.keras.models.load_model("asl_dynamic_word_lstm.h5")

# ---------------- LOAD LABELS ----------------
with open("labels.txt") as f:
    WORD_LABELS = [line.strip() for line in f.readlines()]

ALPHABET_LABELS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

# ---------------- ROUTES ----------------
@app.get("/")
def root():
    return {"status": "ASL API running"}

@app.post("/predict")
def predict(payload: dict):
    """
    payload = {
      mode: "alphabet" | "word",
      landmarks: [ [63], [63], ... ]
    }
    """

    mode = payload.get("mode")
    landmarks = payload.get("landmarks")

    if landmarks is None:
        return {"error": "No landmarks received"}

    landmarks = np.array(landmarks, dtype=np.float32)

    # -------- ALPHABET --------
    if mode == "alphabet":
        if landmarks.shape != (63,):
            return {"error": "Alphabet expects 63 values"}

        x = landmarks.reshape(1, 63)
        preds = alphabet_model.predict(x, verbose=0)
        label = ALPHABET_LABELS[int(np.argmax(preds))]

        return {"prediction": label}

    # -------- WORD --------
    if mode == "word":
        if landmarks.shape != (30, 63):
            return {"error": "Word expects 30 frames of 63 landmarks"}

        x = landmarks.reshape(1, 30, 63)
        preds = word_model.predict(x, verbose=0)
        label = WORD_LABELS[int(np.argmax(preds))]

        return {"prediction": label}

    return {"error": "Invalid mode"}
