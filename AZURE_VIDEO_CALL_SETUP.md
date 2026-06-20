# Azure Communication Services Video Call Integration

## ✅ What's Been Implemented

### 1. Backend Token Endpoint
- **File**: `backend/main.py`
- **Endpoint**: `POST /token`
- Generates Azure Communication Services tokens securely on the backend
- Connection string is stored server-side (never exposed to frontend)

### 2. Azure Video Call Component
- **File**: `src/components/AzureVideoCallPanel.jsx`
- **Features**:
  - 2-panel layout (Local user left, Remote user right)
  - Start/End call controls
  - Camera toggle (on/off)
  - Microphone toggle (mute/unmute)
  - Connection status indicators
  - Error handling for permissions and failures
  - Lazy loading of Azure SDK for performance

### 3. Integration
- **File**: `src/Communication.jsx`
- Azure video call panel is integrated as an optional feature
- Toggle button to show/hide Azure call panel
- Existing features (MediaPipe, ASL prediction, etc.) remain untouched

### 4. Styling
- **File**: `src/CommunicationRefactored.css`
- Added styles for Azure video call panel
- Matches existing design system
- Smooth transitions and animations

## 📦 Installation Required

### Frontend Dependencies
```bash
npm install @azure/communication-common @azure/communication-calling
```

### Backend Dependencies
```bash
cd backend
pip install azure-communication-identity
```

## 🚀 Next Steps

1. **Install Dependencies**:
   ```bash
   # Frontend
   npm install @azure/communication-common @azure/communication-calling
   
   # Backend
   cd backend
   pip install azure-communication-identity
   ```

2. **Start Backend Server**:
   ```bash
   cd backend
   python main.py
   # Or use: uvicorn main:app --reload
   ```

3. **Test the Integration**:
   - Open the Communication page
   - Click "Show Azure Call" button
   - Enter a user ID to call (you'll need two browser windows/tabs for testing)
   - Click "Start Call"

## 🔧 Configuration

The Azure connection string is configured in `backend/main.py`:
```python
AZURE_COMMUNICATION_CONNECTION_STRING = "endpoint=https://video-call-service.europe.communication.azure.com/;accesskey=..."
```

**Important**: Never expose the connection string or access key in the frontend!

## 🎯 Features

### ✅ Implemented
- [x] Backend token endpoint
- [x] 2-panel video layout
- [x] Local video stream
- [x] Remote video stream
- [x] Camera toggle
- [x] Microphone toggle
- [x] Start/End call
- [x] Connection status indicators
- [x] Error handling
- [x] Lazy loading
- [x] Non-breaking integration

### 🔄 Future Enhancements (Optional)
- [ ] Screen sharing
- [ ] Multiple participants
- [ ] Call recording
- [ ] Chat integration
- [ ] Call history

## 🐛 Troubleshooting

### "No token received from server"
- Check if backend is running on `http://localhost:8000`
- Verify Azure connection string is correct
- Check backend logs for errors

### "Camera permission denied"
- Grant camera permissions in browser settings
- Check browser console for permission errors

### "Failed to get access token"
- Verify backend has `azure-communication-identity` installed
- Check connection string format
- Ensure backend CORS allows frontend origin

## 📝 Notes

- The Azure video call panel is **optional** and can be toggled on/off
- Existing MediaPipe and ASL features continue to work independently
- Navbar remains fully functional
- All existing components and styles are preserved






