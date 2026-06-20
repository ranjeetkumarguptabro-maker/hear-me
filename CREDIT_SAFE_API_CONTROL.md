# Credit-Safe API Usage Control

## Overview

This document describes the strict API usage control implemented to prevent unnecessary credit consumption. **All features are toggle-controlled** - when a toggle is OFF, the corresponding API/service is completely stopped, not just paused.

## Global Rule

**UI Toggle OFF = Backend Feature OFF (Hard Stop)**

This means:
- ❌ No API calls
- ❌ No SDK initialization
- ❌ No background listeners
- ❌ No silent processing
- ✅ Complete cleanup and disposal

## Feature-by-Feature Control

### 1. Gesture Recognition (Deaf Page)

**Toggle**: `Gesture Recognition` toggle

**When OFF**:
- ❌ MediaPipe Hands is NOT initialized
- ❌ Camera frames are NOT processed for ML
- ❌ AI model (test_model.py) is NOT called
- ❌ No predictions sent to backend
- ❌ No landmarks drawn
- ✅ Camera stays active only for WebRTC video (no ML processing)
- ✅ All MediaPipe resources are cleaned up
- ✅ Gesture relay is stopped

**When ON**:
- ✅ MediaPipe Hands initialized
- ✅ Camera frames processed
- ✅ AI model runs
- ✅ Predictions sent to backend
- ✅ Landmarks drawn (if "Show Landmarks" toggle is ON)

**Implementation**: `src/hooks/useGestureRecognition.js`

---

### 2. Azure Speech-to-Text (Hearing → Deaf)

**Toggle**: `Voice to Text` toggle (Hearing participant)

**When OFF**:
- ❌ Azure SpeechRecognizer is NOT initialized
- ❌ Microphone stream is NOT opened for STT
- ❌ No audio frames sent to Azure
- ❌ Recognizer is completely stopped and disposed
- ❌ No automatic retries or reconnections

**When ON**:
- ✅ Azure SpeechRecognizer initialized
- ✅ Continuous recognition started
- ✅ Transcription sent to deaf participant via relay

**Implementation**: 
- `src/utils/azureSpeechTranscription.js`
- `src/pages/CommunicationCall.jsx` (toggle-controlled initialization)

---

### 3. Azure Text-to-Speech (Hearing Page)

**Toggle**: `Sign Language Assistance` toggle

**When OFF**:
- ❌ Azure TTS synthesizer is NOT initialized
- ❌ No text-to-speech conversion
- ❌ No audio synthesis queued
- ❌ Any ongoing speech is immediately stopped
- ✅ Synthesizer is cleaned up

**When ON**:
- ✅ New gesture messages converted to speech
- ✅ Audio plays automatically
- ✅ Stops immediately if toggle turned OFF mid-speech

**Implementation**: 
- `src/utils/azureTextToSpeech.js`
- `src/components/hearing/HearingFeaturePanel.jsx`

---

### 4. GIF / Sign Language API (Deaf Page)

**Toggle**: `Text to Virtual Sign` toggle

**When OFF**:
- ❌ No GIF API calls made
- ❌ No fallback searches attempted
- ❌ No preloading of assets
- ❌ GIF queue is cleared
- ❌ All pending processing is cancelled

**When ON**:
- ✅ GIF searches performed only for FINAL transcription messages
- ✅ Priority order: @theaslgifs → @signwithrobert → word → alphabet
- ✅ Caching used to avoid duplicate API calls
- ✅ Rate limiting enforced (500ms minimum between calls)

**Implementation**: `src/components/deaf/DeafFeaturePanel.jsx`

---

## Lifecycle Management

### Component Mount
- Services are initialized ONLY when their toggle is ON
- No "just in case" initialization

### Toggle State Change
- **ON → OFF**: Immediate hard stop
  - Stop all processing
  - Close streams
  - Dispose SDK objects
  - Clear state
  - Remove listeners

- **OFF → ON**: Start service
  - Initialize SDK
  - Start processing
  - Set up listeners

### Component Unmount
- All services cleaned up regardless of toggle state
- Logs cleanup actions for debugging
- Prevents memory leaks and background usage

## Verification

To verify credit-safe behavior:

1. **Check Azure Dashboard**: 
   - API calls should drop to zero when toggles are OFF
   - No background calls should appear

2. **Check Browser Console**:
   - Look for "⏹️" messages when toggles turn OFF
   - Look for "✅" messages when toggles turn ON
   - Look for "🧹" messages on cleanup

3. **Check CPU Usage**:
   - CPU should drop when gesture recognition is OFF
   - No background processing should occur

4. **Network Tab**:
   - No API calls to GIF endpoints when toggle is OFF
   - No Azure API calls when transcription/TTS toggles are OFF

## Anti-Patterns (Avoided)

The following anti-patterns are explicitly avoided:

- ❌ Initializing APIs on page load "just in case"
- ❌ Keeping recognizers running when UI is hidden
- ❌ Muting output but keeping API running
- ❌ Using intervals/polling when feature is OFF
- ❌ Auto-restarting services without user action
- ❌ Background retries when toggle is OFF

## Files Modified

1. `src/pages/CommunicationCall.jsx` - Toggle-controlled transcription
2. `src/hooks/useGestureRecognition.js` - Toggle-controlled gesture recognition
3. `src/components/deaf/DeafFeaturePanel.jsx` - Toggle-controlled GIF API
4. `src/components/hearing/HearingFeaturePanel.jsx` - Toggle-controlled TTS
5. `src/utils/azureTextToSpeech.js` - Enhanced cleanup
6. `src/utils/azureSpeechTranscription.js` - Already has proper stop/cleanup

## Summary

All features now follow the **hard power switch** model:
- Toggle OFF = Complete shutdown
- Toggle ON = Full initialization
- No middle ground, no background usage, no credit waste

This ensures the application scales cost-effectively and respects API credit limits.




