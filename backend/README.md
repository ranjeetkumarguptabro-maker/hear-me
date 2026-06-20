# ASL Recognition Backend

FastAPI backend server using your trained ASL models from `asl_project/`.

## Setup

1. **Create and activate virtual environment:**

   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**

   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

   **Note:** If you get dependency conflicts with `typing-extensions` and TensorFlow on macOS, the requirements.txt uses `tensorflow-macos` which should resolve this.

3. **Verify model files exist:**
   - `../asl_project/asl_alphabet_model.h5`
   - `../asl_project/asl_dynamic_word_lstm.h5`
   - `../asl_project/labels.txt` (for word labels)

## Running the Server

```bash
python main.py
```

The server will start at: `http://localhost:8000`

### API Endpoints

- **GET `/`**: Health check
- **POST `/predict`**: Predict ASL gesture

#### POST /predict

**Request:**

```json
{
  "mode": "alphabet" | "word",
  "landmarks": [float values]
}
```

- **Alphabet mode**: `landmarks` must be 63 values (21 points × 3 coords)
- **Word mode**: `landmarks` must be 1890 values (30 frames × 63 landmarks)

**Response:**

```json
{
  "prediction": 5, // class index (number)
  "label": "F" // human-readable label (letter or word)
}
```

**Error Response:**

```json
{
  "error": "Error message"
}
```

## Testing

Test with curl:

```bash
# Test alphabet mode
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{"mode": "alphabet", "landmarks": [0.0] * 63}'

# Test word mode
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{"mode": "word", "landmarks": [0.0] * 1890}'
```

## Model Details

- **Alphabet Model**: Input 63 values → Output 0-25 (A-Z)
- **Word Model**: Input 1890 values (30×63) → Output word class index
- **Word Labels**: Loaded from `asl_project/labels.txt`

## Troubleshooting

1. **ModuleNotFoundError**: Make sure virtual environment is activated
2. **Model not found**: Check that model files exist in `../asl_project/`
3. **CORS errors**: Backend allows `http://localhost:5173` and `http://127.0.0.1:5173`
4. **Dependency conflicts**: Try installing packages one by one, or use the exact versions in requirements.txt
