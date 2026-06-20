# ASL Full-Sentence Recognition — Training Pipeline

Replaces the single-hand letter model with a Transformer that recognises 100 ASL words
from the [WLASL dataset](https://github.com/dxli94/WLASL).

---

## Prerequisites

```bash
pip install -r asl_training/requirements.txt
npm install @mediapipe/holistic   # new frontend dependency
```

Python 3.10+ and Node 18+ required.

---

## Pipeline overview

```
Step 1  Download WLASL videos       (~2–4 h on a fast connection)
Step 2  Extract Holistic landmarks  (~30–60 min CPU)
Step 3  Train Transformer model     (~2–3 h CPU  |  ~20 min GPU)
Step 4  Patch backend               (< 1 min)
Step 5  Patch frontend              (< 1 min)
```

---

## Step 1 — Download WLASL100 videos

```bash
# Test with 5 glosses first
python asl_training/step1_download_wlasl.py --dry-run

# Full download (~2–4 hours, resumable)
python asl_training/step1_download_wlasl.py
```

**What it does:**
- Downloads `WLASL_v0.3.json` from the WLASL GitHub repo
- Uses `yt-dlp` to fetch one `.mp4` per video instance
- Saves to `asl_training/videos/{gloss}/{video_id}.mp4`
- Already-downloaded files are skipped (safe to re-run)
- Failed/dead URLs are logged to `asl_training/failed_downloads.txt`

**Expected output:** ~1 000–2 500 videos across 100 glosses (varies by URL availability)

---

## Step 2 — Extract MediaPipe Holistic landmarks

```bash
python asl_training/step2_extract_landmarks.py --dry-run   # 5 glosses
python asl_training/step2_extract_landmarks.py             # all glosses
```

**What it does:**
- Opens each video with OpenCV, samples exactly 30 evenly-spaced frames
- Runs MediaPipe **Holistic** (pose + both hands — no face)
- Extracts 258-dim feature vector per frame:
  - Pose: 33 × (x, y, z, vis) = 132 dims
  - Left hand: 21 × (x, y, z) = 63 dims
  - Right hand: 21 × (x, y, z) = 63 dims
- All xyz values are normalised by subtracting the shoulder midpoint so position
  is body-relative (signer-distance invariant)
- Saves `(30, 258)` numpy arrays to `asl_training/landmarks/{gloss}/{video_id}.npy`
- Writes `asl_training/label_map.json` — `{"book": 0, "drink": 1, ...}`

---

## Step 3 — Train the Transformer

```bash
python asl_training/step3_train_model.py --subset 100   # default
python asl_training/step3_train_model.py --subset 300
python asl_training/step3_train_model.py --subset 1000
```

**Architecture:** Transformer (not LSTM) — 3 encoder blocks, 4-head attention, d_model=128

**Training config:**
- Adam + linear warmup (10 epochs) + cosine decay, base lr=1e-3
- Label smoothing 0.1, batch size 32, max 200 epochs
- Early stopping (patience=20, monitored on val_accuracy)
- Best checkpoint saved to `asl_project/asl_word_transformer.h5`

**At the end:** prints top-1 accuracy, top-5 accuracy, and a confusion matrix
for the 20 most-confused class pairs.

**Saved files:**
- `../asl_project/asl_word_transformer.h5` — model (used by backend)
- `asl_training/training_history.json` — per-epoch loss/accuracy curves

---

## Step 4 — Patch the backend

```bash
python asl_training/step4_update_backend.py
```

Adds to `backend/main.py` (existing `/predict` endpoint **unchanged**):

| New addition | Detail |
|---|---|
| `transformer_model` global | Loaded from `asl_project/asl_word_transformer.h5` at startup |
| `TRANSFORMER_LABELS` dict | Loaded from `asl_training/label_map.json` at startup |
| `word_frame_buffers` dict | Per-room `deque(maxlen=30)` sliding window |
| `POST /predict-word/{room_id}` | Accepts 258 floats, returns `{word, confidence, buffered}` |

**Sliding window:** buffer accumulates 30 frames; after prediction the last 15
frames are kept (50 % overlap) so back-to-back signs are caught.

**Confidence threshold:** only returns a word when `confidence >= 0.80`.

Restart the backend after patching:
```bash
cd backend && python main.py
```

---

## Step 5 — Patch the frontend

```bash
python asl_training/step5_update_frontend.py
```

**Files modified (additive only):**

| File | Change |
|---|---|
| `src/mediaPipeGesture.js` | Adds `initMediaPipeHolistic`, `extractHolisticFeatures`, `drawHolisticLandmarks` exports |
| `src/hooks/useGestureRecognition.js` | Adds Holistic `useEffect`, `wordPrediction`/`wordConfidence` state, calls `/predict-word/{roomId}` |
| `src/pages/DeafCommunication.jsx` | Destructures new state, adds confidence badge overlay |

**Runtime behaviour:**
- Alphabet mode → Hands model → `/predict` → single letter (unchanged)
- Word mode → Holistic → `/predict-word/{roomId}` → full word
- If word confidence ≥ 80 % → word shown prominently in purple badge
- Otherwise → falls back to alphabet letter

```bash
npm install @mediapipe/holistic
npm run dev
```

---

## Expanding beyond 100 words

Once WLASL100 works:

```bash
python asl_training/step1_download_wlasl.py   # already done
python asl_training/step2_extract_landmarks.py
python asl_training/step3_train_model.py --subset 300
python asl_training/step4_update_backend.py   # already patched, re-run is safe
```

The backend auto-loads the new model file on next restart.

---

## Sentence understanding (Phase 2)

Once this word model is stable the path to full-sentence understanding is:

1. Buffer consecutive word predictions → `["HELP", "ME", "UNDERSTAND"]`
2. Send ASL gloss sequence to Gemini/GPT: *"Convert this ASL gloss to natural English"*
3. Display cleaned sentence: *"Can you help me understand?"*

This two-stage approach mirrors what Sign-Speak uses commercially.

---

## Directory layout after full run

```
asl_training/
  WLASL_v0.3.json
  label_map.json
  training_history.json
  failed_downloads.txt
  videos/
    book/  drink/  computer/  ...
  landmarks/
    book/  drink/  computer/  ...

asl_project/           (one level up)
  asl_alphabet_model.h5     ← unchanged
  asl_word_transformer.h5   ← NEW
  labels.txt                ← unchanged
```
