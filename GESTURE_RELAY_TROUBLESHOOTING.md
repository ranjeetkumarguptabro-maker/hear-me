# Gesture Relay Troubleshooting Guide

## Issue: Gesture predictions not showing in Speech Assistant

### Quick Fix Checklist

1. **Backend Restart Required** ⚠️
   - The gesture endpoints were added to `backend/main.py`
   - If the backend was started BEFORE these endpoints were added, it needs to be restarted
   - **Action**: Stop the backend (Ctrl+C) and restart it:
     ```bash
     cd backend
     python main.py
     ```

2. **Enable Speech Assistant Toggle** ✅
   - On the Hearing participant page, the "Speech Assistant" toggle must be ON
   - Location: Right panel → Speech Assistant card → Toggle switch
   - When OFF: Shows "Enable Speech Assistant to see gesture predictions"
   - When ON: Shows messages or "Waiting for gesture predictions..."

3. **Enable Gesture Recognition on Deaf Side** ✅
   - On the Deaf participant page, the "Gesture Recognition" toggle must be ON
   - Location: Bottom left, next to Mode toggle
   - When OFF: No gesture detection happens
   - When ON: Gesture recognition starts and sends predictions

4. **Check Browser Console** 🔍
   - Open browser DevTools (F12)
   - Check Console tab for:
     - `🤲 Gesture relay initialized for hearing participant`
     - `📡 Starting gesture prediction polling...`
     - `🤲 Received gesture prediction: "..."`
   - If you see 404 errors: Backend needs restart
   - If you see no messages: Check if deaf participant has gesture recognition enabled

5. **Verify Backend Endpoints** 🔍
   Test in terminal:
   ```bash
   # Test GET endpoint (should return empty array if no messages)
   curl http://localhost:8000/gesture/2Y6EVKUT?since=0
   
   # Should return: [] (empty array, not "Not Found")
   ```

### Expected Flow

1. **Deaf Participant**:
   - Enables "Gesture Recognition" toggle
   - Makes hand gesture
   - Console shows: `🤲 Sending gesture prediction: "HELLO"`
   - Console shows: `✅ Gesture prediction sent successfully`

2. **Backend**:
   - Receives POST to `/gesture/{roomId}`
   - Stores message in memory
   - Console shows: `🤲 Gesture prediction for room {roomId}: ...`

3. **Hearing Participant**:
   - Polls GET `/gesture/{roomId}?since={lastId}` every 500ms
   - Receives new messages
   - Console shows: `🤲 Received gesture prediction: "..."`
   - Updates `gestureMessages` state
   - Displays in Speech Assistant (if toggle is ON)

### Common Issues

**Issue**: "Not Found" (404) when polling
- **Cause**: Backend doesn't have gesture endpoints
- **Fix**: Restart backend server

**Issue**: No messages received
- **Cause 1**: Speech Assistant toggle is OFF
- **Fix**: Enable the toggle
- **Cause 2**: Gesture Recognition is OFF on deaf side
- **Fix**: Enable gesture recognition on deaf participant page
- **Cause 3**: Backend not running
- **Fix**: Start backend server

**Issue**: Messages sent but not received
- **Cause**: Different room IDs
- **Fix**: Ensure both participants are in the same room

### Debug Steps

1. Check backend is running:
   ```bash
   ps aux | grep "python.*main.py"
   ```

2. Test backend endpoint directly:
   ```bash
   curl -X POST http://localhost:8000/gesture/TESTROOM \
     -H "Content-Type: application/json" \
     -d '{"text":"TEST","timestamp":1234567890,"participantType":"deaf","participantName":"Test"}'
   ```

3. Check if message was stored:
   ```bash
   curl http://localhost:8000/gesture/TESTROOM?since=0
   ```

4. Check browser console for errors
5. Verify room IDs match on both sides




