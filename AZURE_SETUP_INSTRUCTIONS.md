# Azure Communication Services Setup Instructions

## 🔴 Current Issue
The backend is not returning a token. This means either:
1. Backend server is not running
2. Azure Communication Services SDK is not installed
3. Connection string is incorrect

## ✅ Setup Steps

### Step 1: Install Azure Communication Services SDK

Navigate to the backend directory and install the required package:

```bash
cd backend
pip install azure-communication-identity
```

Or if using a virtual environment:

```bash
cd backend
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows
pip install azure-communication-identity
```

### Step 2: Verify Connection String

The connection string is already configured in `backend/main.py`:
```
endpoint=https://video-call-service.europe.communication.azure.com/;accesskey=YOUR_AZURE_COMMUNICATION_KEY_HERE
```

**If this connection string is incorrect or expired**, you need to:
1. Go to Azure Portal
2. Navigate to your Communication Services resource
3. Go to "Keys" section
4. Copy the connection string
5. Update it in `backend/main.py` (line 101)

### Step 3: Start Backend Server

Make sure the backend server is running:

```bash
cd backend
python main.py
```

Or using uvicorn:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Step 4: Verify Backend is Working

Test the token endpoint:

```bash
curl -X POST http://localhost:8000/token
```

You should get a response with a token. If you get an error, check:
- Is the backend running?
- Is the Azure SDK installed?
- Is the connection string correct?

## 🔍 Troubleshooting

### Error: "Azure Communication Services SDK not installed"
**Solution**: Run `pip install azure-communication-identity` in the backend directory

### Error: "Azure Communication Services not configured"
**Solution**: Check the connection string in `backend/main.py` line 101

### Error: "Cannot connect to backend"
**Solution**: 
1. Make sure backend is running on `http://localhost:8000`
2. Check if port 8000 is available
3. Check backend logs for errors

### Error: "Failed to generate token"
**Solution**: 
1. Verify connection string is correct
2. Check Azure Portal to ensure the resource is active
3. Verify the access key hasn't expired

## 📝 Quick Test

1. Start backend: `cd backend && python main.py`
2. In browser console, test: `fetch('http://localhost:8000/token', {method: 'POST'}).then(r => r.json()).then(console.log)`
3. Should return: `{token: "...", expiresOn: "...", user: {...}}`

## ⚠️ Important Notes

- The connection string contains sensitive credentials - never commit it to public repositories
- The token endpoint should only be accessible from your frontend (CORS is configured)
- Tokens expire after a certain time - the frontend will need to refresh them






