# Simple Test Integration Guide

This is a **simple test version** to verify your AI models work correctly before full integration.

## What This Does

Creates a minimal FastAPI backend that uses the **exact same logic** as your Python files:
- `realtime_asl.py` → `/predict/alphabet` endpoint
- `realtime_dynamic_words.py` → `/predict/word` endpoint

## Setup

1. **Start the simple test API:**

```bash
cd backend
source venv/bin/activate
python simple_test_api.py
```

You should see:
```
Loading models...
✅ Alphabet model loaded
✅ Word model loaded
✅ Loaded 5 word labels: ['HELLO', 'NO', 'SORRY', 'THANKYOU', 'YES']

🚀 Starting Simple Test API on http://localhost:8000
```

2. **Test the API** (in another terminal or browser console):

**Option A: Using the test client (browser console)**
```javascript
// Open browser console and run:
fetch("http://localhost:8000/")
  .then(r => r.json())
  .then(console.log);

// Test alphabet
fetch("http://localhost:8000/predict/alphabet", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify(new Array(63).fill(0.5))
})
  .then(r => r.json())
  .then(console.log);
```

**Option B: Using curl**
```bash
# Test status
curl http://localhost:8000/

# Test alphabet (dummy data)
curl -X POST http://localhost:8000/predict/alphabet \
  -H "Content-Type: application/json" \
  -d '[0.5] * 63'  # In Python shell

# Or with actual JSON:
curl -X POST http://localhost:8000/predict/alphabet \
  -H "Content-Type: application/json" \
  -d '[0.5,0.5,0.5,...]'  # 63 values
```

## Differences from Full Integration

**Simple Test API (`simple_test_api.py`):**
- ✅ Direct model loading (same as your Python files)
- ✅ Same prediction logic
- ✅ Separate endpoints: `/predict/alphabet` and `/predict/word`
- ✅ Simpler request format (just send landmarks array directly)
- ✅ Returns confidence scores

**Full Integration (`main.py`):**
- More complex request format
- Single `/predict` endpoint with mode parameter
- More error handling
- More features

## Next Steps

1. **Verify the simple API works** with dummy data
2. **Test with real landmarks** from MediaPipe
3. **If it works**, we can integrate this logic into the full backend
4. **If it doesn't work**, we can debug the model loading/prediction

## Troubleshooting

**Models not loading?**
- Check that `asl_project/` folder exists in parent directory
- Verify model files exist: `asl_alphabet_model.h5` and `asl_dynamic_word_lstm.h5`

**CORS errors?**
- Make sure frontend URL is in `allow_origins`

**Wrong predictions?**
- Test with real landmarks from MediaPipe, not dummy data
- Check that input shape matches (63 for alphabet, 1890 for word)







