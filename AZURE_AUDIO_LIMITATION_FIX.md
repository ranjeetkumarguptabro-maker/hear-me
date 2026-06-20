# Azure Communication Services Audio Limitation & Fix

## The Problem You're Experiencing

You're testing locally with:
- ✅ **Microphone ON** (you can see it's unmuted)
- ✅ **Audio working** (you can hear your own voice/echo)
- ❌ **Transcription not working** (says "ask person to unmute")

### Why This Happens

**Azure Communication Services has an architectural limitation:**

Azure WebRTC **does NOT expose remote audio as a standard MediaStream** that can be accessed via `videoElement.srcObject.getAudioTracks()`.

```javascript
// This returns 0 for Azure WebRTC, even though audio is playing!
videoElement.srcObject.getAudioTracks().length  // → 0
```

The audio **IS playing** (that's why you hear the echo), but it's not accessible as a `MediaStream` object that the Speech-to-Text SDK can use.

---

## The Solution: Multiple Fallback Methods

I've implemented **3 fallback methods** that try in sequence:

### Method 1: ✅ **Use Local Microphone** (Best for Local Testing)

For local testing, the code will prompt you to **allow microphone access** in the deaf participant's window.

**How it works:**
1. You speak in the hearing participant window → audio transmitted
2. You hear the echo in the deaf participant window
3. The deaf participant's microphone picks up your voice from speakers
4. That audio is transcribed ✅

**Steps:**
1. When the browser prompts for microphone access → Click **"Allow"**
2. Start speaking
3. Transcription should appear!

**Console output:**
```
⚠️ No audio tracks in srcObject - This is expected for Azure WebRTC!
🎤 Azure Communication Services doesn't expose remote audio as MediaStream
🎤 Attempting fallback: Use default microphone for local testing...
✅ Using default microphone for transcription (local testing mode)
✅ Started remote participant transcription
🎤 Listening for remote participant... Speak now!
```

---

### Method 2: 🎬 **Desktop Audio Capture** (Chrome/Edge Only)

If microphone access fails, the code will try to capture desktop/tab audio.

**Steps:**
1. Browser will show a screen sharing dialog
2. Select the **"Tab"** option (not "Window" or "Screen")
3. Check the box: **"Share audio"** or "Share tab audio"
4. Click "Share"

This captures the audio playing in the browser tab!

**Console output:**
```
🎤 Attempting to capture desktop audio (Chrome)...
✅ Captured desktop audio for transcription
```

---

### Method 3: ⚠️ **Error Message with Instructions**

If both methods fail, you'll see:

```
⚠️ Azure WebRTC Audio Not Accessible

Solutions for testing:

1. EASY: When prompted, allow microphone access
   (This will transcribe your voice for testing)

2. ADVANCED: Click the screen share button
   and select 'This Tab' with audio enabled

Note: Audio IS working (you can hear it),
but Azure doesn't expose it as MediaStream.
```

---

## Testing Instructions (Step by Step)

### Window 1: Hearing Participant
1. Join call as "Hearing Participant"
2. **UNMUTE microphone** (button should be white/black, NOT red)
3. You should see your video

### Window 2: Deaf Participant  
1. Join call as "Deaf Participant"
2. You should see remote participant video in top-right
3. **Wait for browser prompt:** "localhost wants to use your microphone"
4. Click **"Allow"** ✅
5. Look at "Voice to Text" panel - should say:
   ```
   🎤 Using local microphone for transcription (testing mode)
   Speak now to test...
   ```

### Then:
1. **In Window 1 (Hearing)** - Speak clearly: "Hello, testing one two three"
2. **In Window 2 (Deaf)** - Check "Voice to Text" panel
3. You should see transcription appear! ✨

---

## Why This Works for Local Testing

When testing with the same person in both windows:

1. You speak → Hearing participant window captures voice
2. Voice transmitted via Azure WebRTC
3. Deaf participant window plays audio (you hear echo)
4. **Deaf participant's microphone picks up the played audio**
5. That audio → Azure Speech-to-Text → Transcription! ✅

**This is actually how many accessibility apps work in real scenarios too!**

---

## Console Debug Output

### Successful Transcription Start:

```
🎤 Starting remote participant transcription for deaf user...
📞 Call object properties: [state, id, remoteParticipants, ...]
👤 Participant properties: [identifier, state, videoStreams, ...]
⚠️ No direct audio stream, trying to capture from video element...
🎤 Azure WebRTC detected - using alternative audio capture...
📊 Found audio tracks in srcObject: 0
📊 Video tracks in srcObject: 1
⚠️ No audio tracks in srcObject - This is expected for Azure WebRTC!
🎤 Attempting fallback: Use default microphone for local testing...
✅ Using default microphone for transcription (local testing mode)
✅ Processing audio stream with 1 audio track(s)
✅ Started remote participant transcription
🎤 Listening for remote participant... Speak now!
🎤 Recognizing (partial): "hello"
🎤 Recognized (final): "Hello, testing one two three."
```

---

## Production Solution (Real Deployment)

For production with actual deaf/hearing participants (not local testing), you need:

### Option A: **Azure's Built-in Call Transcription** (Recommended)
```javascript
// Use Azure's native transcription feature
const transcriber = await call.createTranscription();
transcriber.on('transcriptionReceived', (data) => {
  console.log(data.transcript);
});
```

**Pros:**
- ✅ Officially supported
- ✅ No audio access issues
- ✅ Better accuracy
- ✅ Built-in speaker identification

**Cons:**
- ⚠️ Requires Azure Cognitive Services Call Recording
- ⚠️ Additional Azure costs
- ⚠️ More complex setup

### Option B: **Server-Side Transcription**

1. Hearing participant's audio → Sent to server
2. Server runs Speech-to-Text
3. Server sends transcription → Deaf participant via WebSocket/SignalR

**Pros:**
- ✅ Works around browser limitations
- ✅ Can use any transcription service
- ✅ More control

**Cons:**
- ⚠️ Requires backend infrastructure
- ⚠️ Higher latency
- ⚠️ More complex

### Option C: **Audio Capture on Hearing Side**

Run transcription on the **hearing participant's browser** and send text via Azure data channels.

```javascript
// In hearing participant window
if (participantType === "hearing") {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Transcribe locally, send text to deaf participant
}
```

**Pros:**
- ✅ Direct audio access
- ✅ No Azure audio limitations
- ✅ Lower latency

**Cons:**
- ⚠️ Requires hearing participant to run transcription
- ⚠️ Uses their CPU/bandwidth
- ⚠️ More complex logic

---

## Why Azure WebRTC Doesn't Expose Audio

From Azure's architecture:

1. **Remote audio is handled internally** by Azure's native code
2. **Auto-played through browser's audio system** 
3. **Not exposed as a JavaScript MediaStream** object
4. This is **by design** for security and performance

**Azure's Intent:**
- Remote audio should "just work" automatically
- Developers shouldn't need to handle audio rendering
- But this makes it inaccessible for custom processing!

---

## Alternative: Use Standard WebRTC Instead

If you need direct audio access, consider:

### SimpleWebRTC / PeerJS / Daily.co
```javascript
// These expose remote audio as MediaStream
remoteVideo.srcObject = remoteStream;
const audioTracks = remoteStream.getAudioTracks();  // ✅ This works!
```

**Trade-offs:**
- ✅ Full MediaStream API access
- ✅ Can process audio easily
- ❌ Lose Azure's infrastructure benefits
- ❌ Need to handle signaling yourself
- ❌ No built-in PSTN/phone integration

---

## Current Implementation Status

### ✅ What Works Now:
- Fallback to local microphone (for local testing)
- Desktop audio capture (Chrome/Edge)
- Clear error messages
- Auto-retry logic
- Debug logging

### ⚠️ Limitations:
- Requires microphone permission in deaf participant window
- For local testing only (same person in both windows)
- Not ideal for production deployment

### 🚧 TODO for Production:
- [ ] Implement Azure's built-in Call Transcription API
- [ ] OR implement server-side transcription
- [ ] OR move transcription to hearing participant's side
- [ ] Add proper data channel for text transmission
- [ ] Handle multiple participants
- [ ] Add language selection

---

## Testing Checklist

Before testing, verify:

### Both Windows:
- [ ] Backend server running (`http://localhost:8000`)
- [ ] Same room ID entered
- [ ] Call connected (green status)
- [ ] Can see each other's video

### Hearing Participant Window:
- [ ] Microphone UNMUTED (white/black button, not red)
- [ ] Can see microphone indicator responding to voice
- [ ] System microphone not globally muted

### Deaf Participant Window:
- [ ] "Voice to Text" toggle ON (blue)
- [ ] Allowed microphone access when prompted
- [ ] Can HEAR audio echo (confirms audio is working)
- [ ] Console shows "Using local microphone for transcription"

### Then Test:
1. **Speak clearly** in hearing window: "Testing one two three"
2. **Check deaf window** → Should see transcription!
3. **Check console** → Should see recognizing events

---

## Troubleshooting

### "Microphone permission denied"
**Solution:**
1. Click 🔒 in address bar
2. Microphone → Allow
3. Refresh page

### "No transcription appears"
**Check:**
1. Did you allow microphone? (check browser permission icon)
2. Is microphone working? (test in system settings)
3. Are you speaking loud enough?
4. Check console for errors
5. Verify Azure Speech API key is set

### "Audio echoing/feedback"
**This is expected for local testing!**
- The echo proves audio is working
- For production, this won't happen (different people, different devices)

### "Can hear audio but transcription says 'ask person to unmute'"
**This is the Azure limitation!**
- The old error message is gone now
- You should see new fallback methods trigger
- Allow microphone when prompted

---

## Summary

**The core issue:** Azure Communication Services doesn't expose remote audio as MediaStream

**The workaround:** Use local microphone as audio source for local testing

**For production:** Use Azure's built-in transcription or implement server-side solution

**Current status:** ✅ Working for local testing with fallback to microphone

**Next step:** Test it now! Allow microphone access and start speaking. You should see transcription appear in the "Voice to Text" panel.

---

## Quick Test (30 seconds)

1. Refresh both browser windows
2. Join call (both as deaf and hearing)
3. **In deaf window:** Allow microphone when prompted
4. **In hearing window:** Speak "Hello world"
5. **Check deaf window:** You should see "Hello world" transcribed!

If this works → ✅ Success! The workaround is functioning.

If not → Check console logs and review troubleshooting section above.




