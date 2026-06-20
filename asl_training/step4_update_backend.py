"""
Step 4 — Patch backend/main.py to add the transformer word-prediction endpoint.

Changes made (all additive — existing /predict endpoint untouched):
  1. Add `import json` and `from collections import deque`
  2. Add transformer model paths (PROJECT_ROOT/asl_project/ and asl_training/)
  3. Add global TRANSFORMER_LABELS dict and transformer_model variable
  4. Load transformer model in load_models() startup hook
  5. Add `word_frame_buffers` dict for per-room 30-frame sliding windows
  6. Add POST /predict-word/{room_id} endpoint

Usage:
  python asl_training/step4_update_backend.py
"""

import ast
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
BACKEND_PATH = PROJECT_ROOT / "backend" / "main.py"
BACKUP_PATH = PROJECT_ROOT / "backend" / "main.py.bak"


# ---------------------------------------------------------------------------
# Guard: skip if already patched
# ---------------------------------------------------------------------------
PATCH_SENTINEL = "# [ASL-TRANSFORMER-PATCH-v1]"


def already_patched(source: str) -> bool:
    return PATCH_SENTINEL in source


# ---------------------------------------------------------------------------
# Patch helpers
# ---------------------------------------------------------------------------
def insert_after(source: str, anchor: str, insertion: str) -> str:
    """Insert `insertion` immediately after the first occurrence of `anchor`."""
    idx = source.find(anchor)
    if idx == -1:
        raise ValueError(f"Anchor not found in source:\n  {anchor!r}")
    pos = idx + len(anchor)
    return source[:pos] + insertion + source[pos:]


def replace_first(source: str, old: str, new: str) -> str:
    """Replace the first occurrence of `old` with `new`."""
    idx = source.find(old)
    if idx == -1:
        raise ValueError(f"Target text not found in source:\n  {old!r}")
    return source[:idx] + new + source[idx + len(old):]


# ---------------------------------------------------------------------------
# Main patch logic
# ---------------------------------------------------------------------------
NEW_IMPORTS = """import json
from collections import deque
"""

NEW_PATHS = """
ASL_TRAINING_DIR = PROJECT_ROOT / "asl_training"
TRANSFORMER_MODEL_PATH = ASL_PROJECT_DIR / "asl_word_transformer.keras"
TRANSFORMER_LABELS_PATH = ASL_TRAINING_DIR / "label_map.json"
"""

NEW_GLOBALS = """

# Transformer model (loaded on startup)
transformer_model = None
TRANSFORMER_LABELS: dict = {}  # int -> gloss string
"""

# Inserted inside load_models(), after the existing word model block
TRANSFORMER_LOAD_CODE = """
        # Load transformer word model
        global transformer_model, TRANSFORMER_LABELS
        print(f"📦 Loading transformer model from: {TRANSFORMER_MODEL_PATH}")
        if TRANSFORMER_MODEL_PATH.exists():
            transformer_model = tf.keras.models.load_model(
                str(TRANSFORMER_MODEL_PATH), compile=False
            )
            print("✅ Transformer model loaded")
            if TRANSFORMER_LABELS_PATH.exists():
                with open(TRANSFORMER_LABELS_PATH) as _lf:
                    _lmap = json.load(_lf)  # gloss -> int
                    TRANSFORMER_LABELS = {int(v): k for k, v in _lmap.items()}
                print(f"✅ Transformer labels loaded: {len(TRANSFORMER_LABELS)} classes")
            else:
                print(f"⚠️ Transformer label map not found: {TRANSFORMER_LABELS_PATH}")
        else:
            print(f"⚠️ Transformer model not found (run step3 first): {TRANSFORMER_MODEL_PATH}")
"""

NEW_BUFFERS = """

# ================ WORD TRANSFORMER SLIDING WINDOW ================
# Per-room deque buffers for 30-frame sliding window inference
word_frame_buffers: dict = {}  # room_id -> deque(maxlen=30)
TRANSFORMER_CONFIDENCE_THRESHOLD = 0.80
TRANSFORMER_WINDOW_SIZE = 30
TRANSFORMER_OVERLAP = 15  # Keep last 15 frames after each prediction
"""

NEW_ENDPOINT = f"""

{PATCH_SENTINEL}

class WordPredictRequest(BaseModel):
    landmarks: list  # 258 floats: pose(132) + left_hand(63) + right_hand(63)


@app.post("/predict-word/{{room_id}}")
async def predict_word(room_id: str, request: WordPredictRequest):
    \"\"\"
    Predict ASL word using the Transformer model with a per-room sliding window.

    Input landmarks (258 floats):
      - Pose:       33 landmarks × 4 (x, y, z, visibility) — normalized to shoulder midpoint
      - Left hand:  21 landmarks × 3 (x, y, z)             — normalized to shoulder midpoint
      - Right hand: 21 landmarks × 3 (x, y, z)             — normalized to shoulder midpoint

    Returns:
      {{
        "word": "hello" | null,
        "confidence": 0.94,
        "buffered": 30
      }}
    Only returns a non-null word when confidence >= TRANSFORMER_CONFIDENCE_THRESHOLD.
    After a full-window prediction the buffer is slid by TRANSFORMER_OVERLAP frames.
    \"\"\"
    global word_frame_buffers

    if transformer_model is None:
        return {{
            "word": None,
            "confidence": 0.0,
            "buffered": 0,
            "error": "Transformer model not loaded. Run step3_train_model.py first.",
        }}

    if len(request.landmarks) != 258:
        return {{
            "word": None,
            "confidence": 0.0,
            "buffered": 0,
            "error": f"Expected 258 landmarks, got {{len(request.landmarks)}}",
        }}

    if room_id not in word_frame_buffers:
        word_frame_buffers[room_id] = deque(maxlen=TRANSFORMER_WINDOW_SIZE)

    buf = word_frame_buffers[room_id]
    buf.append(request.landmarks)
    buffered = len(buf)

    if buffered < TRANSFORMER_WINDOW_SIZE:
        return {{"word": None, "confidence": 0.0, "buffered": buffered}}

    x = np.array(list(buf), dtype=np.float32).reshape(1, TRANSFORMER_WINDOW_SIZE, 258)
    preds = transformer_model.predict(x, verbose=0)[0]
    class_idx = int(np.argmax(preds))
    confidence = float(np.max(preds))

    # Slide: keep last TRANSFORMER_OVERLAP frames
    frames_list = list(buf)
    word_frame_buffers[room_id] = deque(
        frames_list[-TRANSFORMER_OVERLAP:], maxlen=TRANSFORMER_WINDOW_SIZE
    )

    if confidence >= TRANSFORMER_CONFIDENCE_THRESHOLD:
        word = TRANSFORMER_LABELS.get(class_idx, f"word_{{class_idx}}")
        print(f"🤲 Transformer prediction: {{word}} ({{confidence:.2f}}) for room {{room_id}}")
        return {{"word": word, "confidence": confidence, "buffered": TRANSFORMER_WINDOW_SIZE}}

    return {{"word": None, "confidence": confidence, "buffered": TRANSFORMER_WINDOW_SIZE}}
"""


def apply_patches(source: str) -> str:
    # 1. Add json and deque imports after datetime import line
    anchor1 = "from datetime import datetime, timedelta\n"
    source = insert_after(source, anchor1, NEW_IMPORTS)

    # 2. Add new model paths after ASL_PROJECT_DIR assignment
    anchor2 = 'ASL_PROJECT_DIR = PROJECT_ROOT / "asl_project"\n'
    source = insert_after(source, anchor2, NEW_PATHS)

    # 3. Add transformer globals after ALPHABET_LABELS definition
    anchor3 = 'ALPHABET_LABELS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")\n'
    source = insert_after(source, anchor3, NEW_GLOBALS)

    # 4. Add transformer loading inside load_models(), after word model block
    # Anchor: the line that prints "❌ Word model not found"
    anchor4 = '            print(f"❌ Word model not found: {WORD_MODEL_PATH}")\n'
    source = insert_after(source, anchor4, TRANSFORMER_LOAD_CODE)

    # 5. Add word_frame_buffers after gesture_message_id_counter
    anchor5 = "gesture_message_id_counter = 0\n"
    source = insert_after(source, anchor5, NEW_BUFFERS)

    # 6. Add new endpoint before the main guard
    anchor6 = '\nif __name__ == "__main__":'
    source = replace_first(source, anchor6, NEW_ENDPOINT + '\nif __name__ == "__main__":')

    return source


def main():
    if not BACKEND_PATH.exists():
        print(f"backend/main.py not found at {BACKEND_PATH}")
        sys.exit(1)

    source = BACKEND_PATH.read_text()

    if already_patched(source):
        print("backend/main.py is already patched — nothing to do.")
        return

    # Backup
    BACKUP_PATH.write_text(source)
    print(f"Backup saved: {BACKUP_PATH}")

    # Apply patches
    try:
        patched = apply_patches(source)
    except ValueError as e:
        print(f"\nPatch failed: {e}")
        print("The file may have been manually modified. Check backend/main.py.")
        sys.exit(1)

    # Validate Python syntax
    try:
        ast.parse(patched)
    except SyntaxError as e:
        print(f"\nSyntax error in patched file: {e}")
        print("Aborting — original file untouched.")
        sys.exit(1)

    BACKEND_PATH.write_text(patched)

    print("backend/main.py updated successfully.")
    print()
    print("New endpoint added:   POST /predict-word/{room_id}")
    print("  Input:  {landmarks: [258 floats]}")
    print("  Output: {word: str|null, confidence: float, buffered: int}")
    print()
    print("Existing endpoint unchanged:   POST /predict")
    print()
    print("Next step:")
    print("  python asl_training/step5_update_frontend.py")
    print()
    print("Then restart the backend:")
    print("  cd backend && python main.py")


if __name__ == "__main__":
    main()
