# Speech-to-Text Transcription Fix

## Problem Summary
The remote participant's voice-to-text transcription was not showing up for deaf participants during video calls.

## Root Causes Identified

### 1. **Toggle Disabled by Default**
The "Voice to Text" toggle in `DeafFeaturePanel` was OFF by default, preventing transcription from displaying even if it was working in the background.

### 2. **Audio Capture Timing Issues**
The transcription setup tried to access the remote video element's audio before it was fully rendered and ready.

### 3. **Limited Audio Track Detection**
The code only tried to capture audio via Web Audio API's `createMediaElementSource`, which can fail if:
- The video element doesn't have audio tracks yet
- The MediaElementSource was already created once (can only be called once per element)
- Azure WebRTC's audio tracks aren't accessible through the video element

### 4. **Insufficient Error Handling & Retry Logic**
There wasn't enough retry logic when the video element wasn't found or audio tracks weren't ready.

## Fixes Applied

### Fix #1: Enable Voice-to-Text Toggle by Default
**File:** `src/components/deaf/DeafFeaturePanel.jsx`

```jsx
// Changed from false to true
const [voiceToTextEnabled, setVoiceToTextEnabled] = useState(true);
```

**Why:** Deaf participants need transcription automatically enabled when joining a call.

---

### Fix #2: Improved Audio Capture with Direct Track Access
**File:** `src/pages/CommunicationCall.jsx`

**Added:**
- First checks if `videoElement.srcObject` has direct audio tracks
- Uses those audio tracks directly via `MediaStream` API
- Falls back to Web Audio API capture only if needed

**Code Flow:**
1. Find video element with remote participant video
2. Check `srcObject.getAudioTracks()` 
3. If audio tracks exist → Use them directly ✅
4. If not → Fall back to Web Audio API capture
5. Log detailed audio track information for debugging

**Why:** Azure WebRTC may expose audio tracks directly in the video element's srcObject, which is more reliable than capturing from playback.

---

### Fix #3: Enhanced Retry Logic
**Changes:**
- Increased initial wait time from 2s to 3s before starting transcription
- Added retry counter (up to 5 retries with 2-second delays)
- Better video element detection with multiple selectors
- Checks for both `<video>` tags and nested video elements

**Code:**
```jsx
if (retryCount < 5) {
  startRemoteParticipantTranscription.retryCount = retryCount + 1;
  console.log(`🔄 Retry attempt ${retryCount + 1}/5 for transcription setup`);
  setTimeout(async () => {
    await startRemoteParticipantTranscription(participant);
  }, 2000);
}
```

**Why:** Remote video rendering can take time. Multiple retries ensure we catch the audio once it's available.

---

### Fix #4: Better Status Messages & User Feedback
**Added status messages at each stage:**
- "Initializing transcription..."
- "Looking for remote participant audio..."
- "Setting up audio transcription..."
- "🎤 Listening for remote participant... Speak now!"
- Clear error messages with actionable guidance

**Why:** Users need to know what's happening and why transcription might not be working.

---

### Fix #5: Improved Error Messages
**Examples:**
- "Error: Could not access remote video for transcription. Please ensure the remote participant has their camera/microphone enabled."
- "Error: Could not start transcription. Please check Azure Speech Service credentials."
- "Waiting for participant voice... (Enable your microphone if you're the remote participant)"

**Why:** Clear error messages help users troubleshoot issues themselves.

---

## How to Test

### Prerequisites
1. Backend server running on `http://localhost:8000`
2. Azure Communication Services configured
3. Azure Speech-to-Text API key configured (check `VITE_AZURE_SPEECH_KEY`)

### Testing Steps

#### Step 1: Open Two Browser Windows
1. **Window 1 (Deaf Participant):**
   - Go to `/test-communication`
   - Create a room (e.g., "TEST123")
   - Select "Deaf Participant"
   - Join the call

2. **Window 2 (Hearing Participant):**
   - Go to `/test-communication`
   - Enter the same room ID ("TEST123")
   - Select "Hearing Participant"
   - Join the call

#### Step 2: Verify Voice-to-Text
1. In the Deaf Participant window:
   - Check the right panel → "Voice To Text" section
   - The toggle should be **ON by default** (✅ blue toggle)
   - You should see: "🎤 Listening for remote participant... Speak now!"

2. In the Hearing Participant window:
   - **Speak clearly into your microphone**
   - Say something like: "Hello, can you hear me?"

3. In the Deaf Participant window:
   - Watch the "Voice To Text" section
   - You should see the transcribed text appear in **real-time**
   - Partial results appear first (gray), then final results (black)

#### Step 3: Check Browser Console Logs
Open browser DevTools (F12) in the Deaf Participant window:

**Look for these logs:**
```
🎤 Starting remote participant transcription for deaf user...
🎤 Checking video element srcObject for audio tracks...
📊 Found audio tracks in srcObject: 1
🎵 Audio track details: { id: "...", enabled: true, readyState: "live" }
🔄 Processing audio stream for transcription...
✅ Audio processing started successfully!
✅ Started remote participant transcription
🎤 Recognizing (partial): "hello can"
🎤 Recognized (final): "Hello, can you hear me?"
```

### Troubleshooting

#### Issue: "Waiting for participant voice..."
**Possible causes:**
- Remote participant's microphone is muted
- Remote participant hasn't granted microphone permissions
- Audio tracks not available yet (wait 5-10 seconds)

#### Issue: "Error: Could not access remote video for transcription"
**Solutions:**
1. Ensure remote participant has **camera AND microphone enabled**
2. Wait for remote participant video to fully load (green indicator)
3. Refresh both browser windows and try again

#### Issue: No transcription appears
**Check:**
1. Is the "Voice To Text" toggle ON? (Should be by default)
2. Check browser console for errors
3. Verify Azure Speech API key in `.env` file:
   ```
   VITE_AZURE_SPEECH_KEY=your_key_here
   VITE_AZURE_REGION=westeurope
   ```
4. Ensure backend is running and accessible

#### Issue: "Audio source already connected"
**Solution:**
- This happens if `createMediaElementSource` was called twice
- Refresh the page to reset the audio context
- The new code should prevent this by checking for existing sources

---

## Technical Details

### Audio Capture Methods (in priority order)

1. **Direct Audio Track Access** (NEW - Primary method)
   - Access: `videoElement.srcObject.getAudioTracks()`
   - Pros: Most reliable, no Web Audio API overhead
   - Cons: Only works if Azure exposes audio tracks

2. **Web Audio API Capture** (Fallback)
   - Access: `audioContext.createMediaElementSource(videoElement)`
   - Pros: Can capture even if audio tracks aren't directly exposed
   - Cons: Can only be called once per element, adds processing overhead

### Azure Speech SDK Integration

```javascript
// Create speech config
const speechConfig = sdk.SpeechConfig.fromSubscription(
  AZURE_SPEECH_KEY,
  AZURE_REGION
);
speechConfig.speechRecognitionLanguage = "en-US";

// Create push stream from audio
const pushStream = sdk.AudioInputStream.createPushStream();
const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

// Create recognizer
const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

// Handle events
recognizer.recognizing = (s, e) => {
  // Partial results (real-time)
  setRemoteTranscription(e.result.text);
};

recognizer.recognized = (s, e) => {
  // Final results (appends to previous text)
  setRemoteTranscription(prev => `${prev}\n${e.result.text}`);
};

// Start continuous recognition
recognizer.startContinuousRecognitionAsync();
```

---

## Files Modified

1. **src/components/deaf/DeafFeaturePanel.jsx**
   - Changed `voiceToTextEnabled` default to `true`

2. **src/pages/CommunicationCall.jsx**
   - Added direct audio track detection
   - Improved retry logic (5 attempts)
   - Better video element finding
   - Enhanced error messages
   - Added status message updates
   - Improved logging

---

## Expected Behavior

### For Deaf Participants
✅ Voice-to-Text toggle is ON by default  
✅ See status messages during transcription setup  
✅ Real-time transcription appears as remote participant speaks  
✅ Partial results update continuously  
✅ Final results append to transcript history  
✅ Clear error messages if something goes wrong  

### For Hearing Participants
✅ No transcription UI (as per requirements)  
✅ Voice transmits normally to deaf participant  
✅ No performance impact from transcription  

---

## Performance Considerations

- **Audio Processing:** Uses Web Audio API's ScriptProcessor (4096 buffer)
- **Transcription:** Azure Speech SDK handles speech recognition
- **Memory:** Audio context and recognizer are cleaned up on participant disconnect
- **Network:** Only audio data sent to Azure (no video)

---

## Next Steps (Future Enhancements)

1. **Add Visual Audio Indicator**
   - Show volume meter when remote participant speaks
   - Helps deaf user know when to expect transcription

2. **Transcription History**
   - Save transcription to local storage
   - Allow copying/downloading transcript

3. **Multi-Language Support**
   - Auto-detect language or allow selection
   - Currently hardcoded to "en-US"

4. **Punctuation & Formatting**
   - Enable Azure's punctuation feature
   - Better sentence formatting

5. **Confidence Scores**
   - Show confidence level for transcribed text
   - Highlight low-confidence words

---

## Debug Mode

To enable verbose logging, open browser console and run:
```javascript
localStorage.setItem('DEBUG_SPEECH_TO_TEXT', 'true');
```

Then refresh the page. You'll see additional debug information about:
- Audio track details
- Transcription events
- Buffer processing
- Azure SDK events

---

## Support

If transcription still doesn't work after these fixes:

1. **Check Azure Speech Service Status**
   - Visit: https://status.azure.com
   - Verify Speech Services are operational

2. **Verify API Key**
   - Test key with curl:
     ```bash
     curl -X POST "https://westeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken" \
       -H "Ocp-Apim-Subscription-Key: YOUR_KEY"
     ```

3. **Check Browser Compatibility**
   - Chrome/Edge: ✅ Full support
   - Firefox: ✅ Full support
   - Safari: ⚠️ May have Web Audio API issues

4. **Network Issues**
   - Check firewall isn't blocking WebSocket connections
   - Azure Speech uses WSS (WebSocket Secure)

---

## Conclusion

The speech-to-text feature should now work reliably for deaf participants. The fixes address:
- ✅ Audio capture reliability
- ✅ Timing issues
- ✅ User experience
- ✅ Error handling
- ✅ Debugging capability

The transcription will start automatically when a remote participant joins and will display real-time transcription in the "Voice To Text" panel.




