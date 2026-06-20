# ASL Backend Integration

This document describes the FastAPI backend integration for ASL recognition.

## Overview

The frontend now sends hand landmarks from MediaPipe to a FastAPI backend for ASL (American Sign Language) prediction.

## Backend Requirements

- **URL**: `http://127.0.0.1:8000`
- **Endpoint**: `POST /predict`
- **Headers**: 
  - `Content-Type: application/json`
  - `x-api-key: asl-gesture-2025-secure-key`
- **Request Body**:
  ```json
  {
    "mode": "alphabet" | "word",
    "landmarks": [63 float values]
  }
  ```
- **Response**:
  ```json
  {
    "prediction": number
  }
  ```

## Implementation Details

### Files Added/Modified

1. **`src/api/aslApi.js`** (NEW)
   - `flattenLandmarks()`: Converts MediaPipe landmarks (21 points × 3 coords) to flat 63-value array
   - `predictASL()`: Sends landmarks to FastAPI backend and returns prediction

2. **`src/Communication.jsx`** (MODIFIED)
   - Added ASL state: `aslMode`, `aslPrediction`, `isPredicting`, `aslError`
   - Integrated API calls in MediaPipe results callback
   - Added throttling (200ms) to prevent excessive API calls
   - Added `handleAslModeChange()` to reset prediction on mode change

3. **`src/components/GestureDetection.jsx`** (MODIFIED)
   - Added mode toggle UI (Alphabet/Word buttons)
   - Added ASL prediction display box
   - Shows prediction number or error message
   - Shows "Processing..." indicator during API calls

4. **`src/components/DeafUserPanel.jsx`** (MODIFIED)
   - Passes ASL-related props to GestureDetection component

5. **`src/Communication.css`** (MODIFIED)
   - Added styles for mode toggle buttons
   - Added styles for prediction display box
   - Added error display styles

### Data Flow

1. MediaPipe detects hand and extracts landmarks (21 points, each with x, y, z)
2. `flattenLandmarks()` converts to flat array: `[x1, y1, z1, x2, y2, z2, ..., x21, y21, z21]`
3. User selects mode: "alphabet" or "word" via toggle
4. `predictASL()` sends POST request to `/predict` endpoint
5. Backend returns prediction number
6. Prediction is displayed in the UI

### Throttling

API calls are throttled to a minimum of 200ms between requests to:
- Prevent overwhelming the backend
- Reduce network traffic
- Improve performance

### Error Handling

- Network errors are caught and displayed to the user
- Invalid landmarks or mode values are validated
- Prediction state resets when hand is not detected

## Usage

1. Start the FastAPI backend server at `http://127.0.0.1:8000`
2. Open the communication page
3. Camera will automatically start (hand detection)
4. Toggle between "Alphabet" and "Word" mode
5. Show hand gestures - predictions will appear in real-time
6. Prediction number is displayed in the ASL Prediction box

## Configuration

To change the API endpoint or key, edit `src/api/aslApi.js`:

```javascript
const API_BASE_URL = "http://127.0.0.1:8000";
const API_KEY = "asl-gesture-2025-secure-key";
```

## Notes

- The legacy gesture detection (HELP, YES, NO) still works alongside ASL prediction
- MediaPipe camera and landmark extraction remain unchanged
- All backend code should be separate (not included in this frontend)







