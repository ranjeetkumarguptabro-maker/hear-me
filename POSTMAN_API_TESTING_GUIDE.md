# Postman API Testing Guide

**Backend URL:** `http://51.124.124.18/`

---

## ✅ **1. Health Check (GET)**

**Endpoint:** `GET http://51.124.124.18/`

**Postman Setup:**
- Method: **GET**
- URL: `http://51.124.124.18/`
- Headers: None needed

**Expected Response:**
```json
{
  "status": "ASL API running",
  "models_loaded": {
    "alphabet": false,
    "word": false
  },
  "azure_communication_configured": true
}
```

---

## ✅ **2. Generate Azure Token (POST)**

**Endpoint:** `POST http://51.124.124.18/token`

**Postman Setup:**
- Method: **POST**
- URL: `http://51.124.124.18/token`
- Headers:
  - `Content-Type: application/json`
- Body: **None** (empty body is OK)

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIs...",
  "expiresOn": "2026-01-08T10:00:00",
  "user": {
    "communicationUserId": "8:acs:..."
  }
}
```

**OR if Azure not configured:**
```json
{
  "error": "Azure Communication Services not configured..."
}
```

---

## ✅ **3. Generate Azure Token (Simplified) (POST)**

**Endpoint:** `POST http://51.124.124.18/api/azure/token`

**Postman Setup:**
- Method: **POST**
- URL: `http://51.124.124.18/api/azure/token`
- Headers:
  - `Content-Type: application/json`
- Body (optional):
```json
{
  "userId": "8:acs:..." 
}
```
OR leave body empty to create new user

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIs...",
  "userId": "8:acs:...",
  "expiresOn": "2026-01-08T10:00:00"
}
```

---

## ✅ **4. Create Room (POST)**

**Endpoint:** `POST http://51.124.124.18/room`

**Postman Setup:**
- Method: **POST**
- URL: `http://51.124.124.18/room`
- Headers:
  - `Content-Type: application/json`
- Body:
```json
{
  "roomId": "TEST123",
  "userId": "8:acs:..." 
}
```
*(userId is optional)*

**Expected Response:**
```json
{
  "roomId": "TEST123",
  "azureRoomId": "19:meeting_...",
  "groupCallId": "19:meeting_...",
  "participants": [
    {
      "communicationUserId": "8:acs:..."
    }
  ],
  "message": "Azure room created successfully"
}
```

---

## ✅ **5. Get Room Details (GET)**

**Endpoint:** `GET http://51.124.124.18/room/{room_id}`

**Postman Setup:**
- Method: **GET**
- URL: `http://51.124.124.18/room/TEST123`
- Headers: None needed

**Expected Response:**
```json
{
  "roomId": "TEST123",
  "groupCallId": "19:meeting_...",
  "azureRoomId": "19:meeting_...",
  "participants": [
    {
      "communicationUserId": "8:acs:..."
    }
  ],
  "exists": true
}
```

---

## ✅ **6. Add Participant to Room (POST)**

**Endpoint:** `POST http://51.124.124.18/room/{room_id}/add-participant`

**Postman Setup:**
- Method: **POST**
- URL: `http://51.124.124.18/room/TEST123/add-participant`
- Headers:
  - `Content-Type: application/json`
- Body:
```json
{
  "communicationUserId": "8:acs:..."
}
```

**Expected Response:**
```json
{
  "roomId": "TEST123",
  "azureRoomId": "19:meeting_...",
  "participant": {
    "communicationUserId": "8:acs:..."
  },
  "message": "Participant added successfully"
}
```

---

## ✅ **7. Get/Create User ID (GET)**

**Endpoint:** `GET http://51.124.124.18/my-user-id`

**Postman Setup:**
- Method: **GET**
- URL: `http://51.124.124.18/my-user-id`
- Headers: None needed

**Expected Response:**
```json
{
  "communicationUserId": "8:acs:...",
  "message": "Share this user ID with others to receive calls"
}
```

---

## ✅ **8. ASL Prediction (POST)**

**Endpoint:** `POST http://51.124.124.18/predict`

**Postman Setup:**
- Method: **POST**
- URL: `http://51.124.124.18/predict`
- Headers:
  - `Content-Type: application/json`
- Body (Alphabet mode - 63 values):
```json
{
  "mode": "alphabet",
  "landmarks": [0.1, 0.2, 0.3, ...] 
}
```
*(63 float values for alphabet)*

- Body (Word mode - 1890 values):
```json
{
  "mode": "word",
  "landmarks": [0.1, 0.2, 0.3, ...] 
}
```
*(1890 float values = 30 frames × 63 landmarks)*

**Expected Response:**
```json
{
  "prediction": 0,
  "label": "A"
}
```

**Note:** This will fail if models aren't loaded (models_loaded: false in health check)

---

## ✅ **9. Send Transcription (POST)**

**Endpoint:** `POST http://51.124.124.18/transcription/{room_id}`

**Postman Setup:**
- Method: **POST**
- URL: `http://51.124.124.18/transcription/TEST123`
- Headers:
  - `Content-Type: application/json`
- Body:
```json
{
  "type": "final",
  "text": "Hello, how are you?",
  "timestamp": 1704628800000,
  "participantType": "hearing",
  "participantName": "John"
}
```

**Expected Response:**
```json
{
  "status": "ok",
  "messageId": 1
}
```

---

## ✅ **10. Get Transcriptions (GET)**

**Endpoint:** `GET http://51.124.124.18/transcription/{room_id}?since=0`

**Postman Setup:**
- Method: **GET**
- URL: `http://51.124.124.18/transcription/TEST123?since=0`
- Headers: None needed

**Expected Response:**
```json
[
  {
    "id": 1,
    "type": "final",
    "text": "Hello, how are you?",
    "timestamp": 1704628800000,
    "participantType": "hearing",
    "participantName": "John"
  }
]
```

---

## ✅ **11. Send Gesture Prediction (POST)**

**Endpoint:** `POST http://51.124.124.18/gesture/{room_id}`

**Postman Setup:**
- Method: **POST**
- URL: `http://51.124.124.18/gesture/TEST123`
- Headers:
  - `Content-Type: application/json`
- Body:
```json
{
  "text": "HELLO",
  "timestamp": 1704628800000,
  "participantType": "deaf",
  "participantName": "Alice"
}
```

**Expected Response:**
```json
{
  "status": "ok",
  "messageId": 1
}
```

---

## ✅ **12. Get Gesture Predictions (GET)**

**Endpoint:** `GET http://51.124.124.18/gesture/{room_id}?since=0`

**Postman Setup:**
- Method: **GET**
- URL: `http://51.124.124.18/gesture/TEST123?since=0`
- Headers: None needed

**Expected Response:**
```json
[
  {
    "id": 1,
    "text": "HELLO",
    "timestamp": 1704628800000,
    "participantType": "deaf",
    "participantName": "Alice"
  }
]
```

---

## 🧪 **Quick Test Sequence**

1. **Health Check** → `GET /` → Should return status
2. **Get User ID** → `GET /my-user-id` → Save the `communicationUserId`
3. **Create Room** → `POST /room` with `{"roomId": "TEST123"}` → Should create room
4. **Get Room** → `GET /room/TEST123` → Should return room details
5. **Send Transcription** → `POST /transcription/TEST123` → Should return `{"status": "ok"}`
6. **Get Transcriptions** → `GET /transcription/TEST123?since=0` → Should return your message

---

## ⚠️ **Common Issues**

### CORS Error
If you see CORS errors in Postman, add this header:
- `Origin: http://localhost:5173`

### 500 Internal Server Error
- Check if Azure Communication Services is configured
- Check backend logs for specific error

### 404 Not Found
- Verify the endpoint URL is correct
- Make sure backend is running

---

## 📝 **Postman Collection Import**

You can create a Postman collection with all these endpoints and import it for easy testing!

