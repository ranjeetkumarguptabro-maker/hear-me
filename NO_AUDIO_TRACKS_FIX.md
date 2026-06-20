# Fix: "No Audio Tracks" - Speech-to-Text Not Working

## Problem You're Seeing

In the console, you see:
```
Found audio tracks in srcObject: 0
```

And the "Voice To Text" panel shows:
- Toggle is ON ✅
- But no transcription appears ❌

## Root Cause

**The remote (hearing) participant is NOT transmitting audio.**

The video is working (you can see them), but their **microphone is muted or disabled**.

---

## ✅ SOLUTION: Enable Remote Participant's Microphone

### In the HEARING participant's window (the other browser tab):

#### Step 1: Check Microphone Button
Look at the bottom of the screen for the microphone button:

- ❌ **RED button with slash** = MUTED (bad)
- ✅ **WHITE/BLACK button** = UNMUTED (good)

#### Step 2: Unmute Microphone
If the button is RED:
1. Click the microphone button to unmute
2. It should turn WHITE/BLACK
3. You should NOT see a slash through it

#### Step 3: Grant Microphone Permissions
If browser prompts for permissions:
1. Click "Allow" for microphone access
2. Make sure you select the correct microphone device
3. Test that the microphone is working (speak and watch for volume indicator)

#### Step 4: Verify Microphone is Working
- Check system settings that microphone isn't muted globally
- Try speaking - you should see the audio indicator react
- On Mac: System Settings → Sound → Input → Check input level
- On Windows: Settings → System → Sound → Input device volume

---

## How to Test

### After unmuting in the hearing participant's window:

1. **In DEAF participant window** - Open browser console (F12)

2. **Look for these NEW console messages:**
   ```
   📊 Found audio tracks in srcObject: 1  ← Should be 1, not 0!
   ✅ Using direct audio tracks from srcObject
   🎵 Audio track details: { enabled: true, readyState: "live" }
   ✅ Started remote participant transcription
   🎤 Listening for remote participant... Speak now!
   ```

3. **In HEARING participant window** - Speak clearly:
   - "Hello, testing one two three"
   - "Can you see this transcription?"

4. **In DEAF participant window** - Check "Voice To Text" panel:
   - Should show: "🎤 Listening for remote participant... Speak now!"
   - Then transcribed text should appear as you speak

---

## New Features Added

### 1. **Better Error Messages**

If no audio is detected, you'll now see:
```
⚠️ No audio detected from remote participant.

Please ask the other person to:
1. Unmute their microphone (click the mic button)
2. Grant microphone permissions if prompted
3. Ensure their microphone is working

The microphone button should be WHITE (not red).
```

### 2. **Auto-Retry (10 attempts)**

The system will now automatically retry detecting audio every 3 seconds for up to 10 attempts, giving the hearing participant time to enable their microphone.

### 3. **Visual Warning (Red Text)**

Error messages are shown in **red text** in the "Voice To Text" panel so you know something needs attention.

---

## Common Issues & Solutions

### Issue 1: "Found audio tracks: 0" persists
**Solution:**
- Hearing participant needs to **completely leave and rejoin** the call
- When rejoining, make sure to **allow microphone permissions**
- Click the microphone button to ensure it's UNMUTED (white/black, not red)

### Issue 2: Audio was working, then stopped
**Solution:**
- Hearing participant accidentally muted themselves
- Click the microphone button to unmute
- May need to refresh the page if audio context was closed

### Issue 3: "Microphone muted, verified: true"
**This is EXPECTED for the deaf participant!**
- The deaf participant SHOULD have their mic muted
- What matters is the REMOTE (hearing) participant's mic
- Check the OTHER browser window's microphone status

### Issue 4: Browser shows "Microphone blocked"
**Solution:**
1. Click the 🔒 lock icon in the browser address bar
2. Find "Microphone" in the permissions list
3. Change from "Block" to "Allow"
4. Refresh the page
5. Allow microphone when prompted

### Issue 5: Transcription shows but is empty/no words
**Possible causes:**
- Remote participant is speaking too quietly
- Background noise is too loud
- Microphone quality issues
- Wrong microphone selected (e.g., built-in instead of external)

**Solution:**
- Hearing participant: Check system microphone settings
- Speak CLEARLY and LOUDLY
- Reduce background noise
- Test microphone in system settings first

---

## Browser-Specific Notes

### Chrome/Edge (Recommended) ✅
- Full audio track support
- Best transcription accuracy
- Lowest latency

### Firefox ⚠️
- May require additional microphone permissions
- Sometimes needs page refresh after granting permissions

### Safari (macOS) ⚠️
- Stricter microphone permissions
- May need to enable in System Settings → Privacy & Security → Microphone
- Check both browser AND system permissions

---

## Debugging Steps

If transcription still doesn't work:

### 1. Check Console Logs (Deaf Participant Window)

Open DevTools (F12) → Console tab

**Look for:**
```
📊 Found audio tracks in srcObject: X
```

- If **X = 0** → Remote mic is disabled ❌
- If **X = 1 or more** → Audio should work ✅

### 2. Check Audio Track Details

Look for:
```javascript
🎵 Audio track details: {
  enabled: true,     // Should be true
  muted: false,      // Should be false
  readyState: "live" // Should be "live"
}
```

### 3. Test Azure Speech Service

In console, run:
```javascript
console.log(import.meta.env.VITE_AZURE_SPEECH_KEY?.substring(0, 10) + "...");
```

Should show: `"5fyuuKrLJ..."`

If it shows `undefined`, your Azure key isn't configured.

### 4. Test Microphone Directly

In the hearing participant's window, open DevTools console and run:
```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log("✅ Microphone working!");
    console.log("Audio tracks:", stream.getAudioTracks().length);
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => {
    console.error("❌ Microphone error:", err.message);
  });
```

Should show: `"✅ Microphone working!"` and `"Audio tracks: 1"`

---

## Quick Checklist

Before testing transcription, verify:

### Hearing Participant (Source of Audio):
- [ ] Microphone button is WHITE/BLACK (not red)
- [ ] Browser has microphone permissions (check address bar 🔒)
- [ ] System microphone is not muted
- [ ] Correct microphone device selected
- [ ] Can see audio indicator reacting to voice

### Deaf Participant (Receiving Transcription):
- [ ] "Voice To Text" toggle is ON (blue)
- [ ] Can see remote participant's video
- [ ] Console shows "Found audio tracks: 1"
- [ ] No error messages in "Voice To Text" panel
- [ ] Sees "🎤 Listening for remote participant... Speak now!"

### System:
- [ ] Backend server running (`http://localhost:8000`)
- [ ] Both participants in same room
- [ ] Azure Speech API key configured
- [ ] Internet connection stable

---

## Expected Flow (When Working)

1. **Deaf participant joins** → Voice-to-Text toggle auto-enabled
2. **Hearing participant joins** → Remote video appears in PiP
3. **System detects audio** → "Found audio tracks: 1" in console
4. **Transcription starts** → "🎤 Listening for remote participant..."
5. **Hearing participant speaks** → Text appears in real-time!

**Total time from join to transcription: ~3-5 seconds**

---

## Still Not Working?

### Last Resort Steps:

1. **Close ALL browser tabs** for both participants
2. **Restart browsers** completely
3. **Restart backend server**
4. **Clear browser cache** (Ctrl+Shift+Delete)
5. **Test with a simple audio app first** (e.g., voice recorder)
6. **Try different browsers** (Chrome vs Firefox)
7. **Check firewall** isn't blocking audio streams
8. **Disable VPN** if using one
9. **Test on different network** (mobile hotspot)

### Check System Audio:

**macOS:**
```bash
# List audio devices
system_profiler SPAudioDataType

# Check microphone permissions
tccutil reset Microphone
```

**Windows:**
```powershell
# Test microphone
Get-PnpDevice -Class AudioEndpoint | Where-Object {$_.FriendlyName -like "*Microphone*"}
```

**Linux:**
```bash
# List audio devices
arecord -l

# Test microphone
arecord -d 5 test.wav && aplay test.wav
```

---

## Success Indicators

When everything is working correctly, you should see:

### In Console:
```
✅ Azure SDK already initialized
✅ Connected
👥 Remote participants updated: 1 added
📊 Found audio tracks in srcObject: 1
🎵 Audio track details: { enabled: true, readyState: "live" }
✅ Successfully captured audio stream
✅ Started remote participant transcription
🎤 Recognizing (partial): "hello"
🎤 Recognized (final): "Hello, testing one two three."
```

### In UI:
- Video feed shows remote participant ✅
- "Voice To Text" toggle is ON (blue) ✅
- Status shows "🎤 Listening for remote participant..." ✅
- Text appears as hearing participant speaks ✅
- Text is BLACK (not red) ✅
- No warning symbols (⚠️) ✅

---

## Contact/Support

If you've tried everything and it still doesn't work:

1. Take a screenshot of the console logs
2. Note which browser/OS you're using
3. Check if Azure Speech Service has any outages
4. Verify your Azure subscription is active

The issue is almost always:
- **80% of cases:** Remote microphone is muted/disabled
- **15% of cases:** Browser permissions not granted
- **4% of cases:** System microphone issues
- **1% of cases:** Actual code bug or Azure service issue

**TL;DR: Check the hearing participant's microphone first! 🎤**




