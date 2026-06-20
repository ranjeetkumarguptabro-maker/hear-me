# Hear-Me

A two-way communication MVP for deaf and hearing users using Azure Cognitive Services Speech SDK.

## Features

- **Real-Time Hand Gesture Detection**: Uses MediaPipe Hands to detect hand gestures (HELP, YES, NO)
- **Continuous Speech-to-Text**: Real-time live subtitles for hearing users
- **Text-to-Speech**: Convert typed text to audible speech for deaf users
- **Split-Screen UI**: Simple two-panel interface for easy communication

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure Azure Speech Service credentials (optional - already configured):

   - Create a `.env` file in the root directory
   - Add your credentials:
     ```
     VITE_AZURE_SPEECH_KEY=your_key_here
     VITE_AZURE_REGION=westeurope
     ```
   - Or edit `src/App.jsx` directly (credentials are already set as fallback)

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to the URL shown in the terminal (typically http://localhost:5173)

## Usage

### For Deaf Person (Left Panel):

- Camera automatically starts on page load (FREE - runs locally)
- Show hand gestures to the camera:
  - **HELP**: Open palm with all fingers extended
  - **YES**: Thumbs up gesture
  - **NO**: Thumbs down gesture
- Detected gestures appear below the camera feed (FREE - MediaPipe runs locally)
- **⚠️ Azure TTS:** Type messages and click "🔊 Speak Text (Test Azure TTS)" to convert to speech (uses credits)
- Click "🚨 EMERGENCY" for emergency alert (uses credits)

### For Hearing Person (Right Panel):

- **⚠️ IMPORTANT:** Only use when testing to save Azure credits!
- Click "▶️ Start Listening (Test Azure STT)" to begin speech recognition (uses credits)
- Speak into your microphone - live subtitles appear in real-time
- Visual sign representations appear for detected keywords
- **Click "⏹️ Stop Listening" immediately after testing** to stop consuming credits
- Red warning banner shows when Azure credits are being consumed

## 💰 Azure Credit Management

**IMPORTANT:** This app uses Azure Cognitive Services which consume credits:

### What Uses Credits:

- ✅ **Speech-to-Text (STT)**: Only when "Start Listening" is active
- ✅ **Text-to-Speech (TTS)**: Only when "Speak Text" button is clicked
- ❌ **Hand Gesture Detection**: FREE (runs locally with MediaPipe)
- ❌ **Camera Feed**: FREE (runs locally)

### How to Save Credits:

1. **Only click "Start Listening" when actively testing** - don't leave it running
2. **Stop Listening immediately** after testing
3. The app shows **red warning banners** when consuming credits
4. Hand gesture detection works without any Azure credits

### Getting Azure Credentials:

You need an Azure Speech Service subscription key and region. Get one at [Azure Portal](https://portal.azure.com/).

- Free tier includes: 5 hours of Speech-to-Text and 0.5 million characters of Text-to-Speech per month.
