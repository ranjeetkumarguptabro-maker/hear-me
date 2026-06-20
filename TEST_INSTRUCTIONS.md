# How to Test the Simple ASL API

## Step 1: Start the Backend Server

Open a terminal and run:

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
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Keep this terminal open** - the server must be running!

---

## Step 2: Test the API

You have **3 options** to test:

### Option A: Using the HTML Test Page (Easiest)

1. Open `src/test_asl_api.html` in your browser

   - You can double-click the file, or
   - Drag and drop it into your browser, or
   - Right-click → Open with → Browser

2. You should see a page with test buttons

3. Click the buttons to test:
   - **Test Status** - Checks if API is running
   - **Test Alphabet** - Tests alphabet prediction
   - **Test Word** - Tests word prediction
   - **Run All Tests** - Runs everything

### Option B: Using Browser Console

1. Open your browser (Chrome/Firefox/Edge)

2. Open Developer Tools (F12 or Right-click → Inspect)

3. Go to the **Console** tab

4. Copy and paste this code:

```javascript
// Test 1: Check API status
fetch("http://localhost:8000/")
  .then((r) => r.json())
  .then((data) => console.log("✅ Status:", data))
  .catch((err) => console.error("❌ Error:", err));

// Test 2: Test Alphabet (wait a second first)
setTimeout(() => {
  const landmarks = new Array(63).fill(0.5); // Dummy data
  fetch("http://localhost:8000/predict/alphabet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(landmarks),
  })
    .then((r) => r.json())
    .then((data) => console.log("✅ Alphabet:", data))
    .catch((err) => console.error("❌ Error:", err));
}, 1000);

// Test 3: Test Word (wait 2 seconds)
setTimeout(() => {
  const landmarks = new Array(1890).fill(0.5); // Dummy data
  fetch("http://localhost:8000/predict/word", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(landmarks),
  })
    .then((r) => r.json())
    .then((data) => console.log("✅ Word:", data))
    .catch((err) => console.error("❌ Error:", err));
}, 2000);
```

5. Press Enter to run

### Option C: Using Terminal/Command Line

Open a **new terminal** (keep the server running in the first one):

```bash
# Test 1: Check status
curl http://localhost:8000/

# Test 2: Test alphabet (requires Python to create JSON array)
python3 -c "import json; print(json.dumps([0.5]*63))" | curl -X POST http://localhost:8000/predict/alphabet -H "Content-Type: application/json" -d @-

# Test 3: Test word
python3 -c "import json; print(json.dumps([0.5]*1890))" | curl -X POST http://localhost:8000/predict/word -H "Content-Type: application/json" -d @-
```

---

## Expected Results

### ✅ Success looks like:

**Status Test:**

```json
{
  "status": "ASL Test API Running",
  "models": {
    "alphabet": "loaded",
    "word": "loaded",
    "word_labels": ["HELLO", "NO", "SORRY", "THANKYOU", "YES"]
  }
}
```

**Alphabet Test:**

```json
{
  "prediction": 11, // Class index (0-25)
  "label": "L", // Predicted letter
  "confidence": 0.95 // Confidence score
}
```

**Word Test:**

```json
{
  "prediction": 0, // Class index
  "label": "HELLO", // Predicted word
  "confidence": 0.87 // Confidence score
}
```

### ❌ Common Errors:

**"Failed to fetch" / "Connection refused"**

- Make sure the backend server is running
- Check that it's on port 8000

**"CORS error"**

- The HTML file might need to be served via a web server
- Try Option B (browser console) instead

**"Model not found"**

- Check that `asl_project/` folder exists
- Verify model files are in the right place

---

## Next Steps

Once the simple test works:

1. ✅ Models are loading correctly
2. ✅ API is responding
3. ✅ Predictions are working

Then we can integrate this into the full website!






