# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A two-way communication app bridging deaf and hearing users. The frontend runs on Vercel; the backend runs on Azure App Service. Features: Azure Communication Services video calling, MediaPipe hand gesture recognition (ASL), and Azure Cognitive Services speech-to-text/text-to-speech.

## Commands

### Frontend
```bash
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Build to /dist
npm run preview    # Preview production build
```

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py     # FastAPI at http://localhost:8000
```

### Environment Variables
- Frontend (`.env`): `VITE_AZURE_SPEECH_KEY`, `VITE_AZURE_REGION`, `VITE_GIPHY_API_KEY`, `VITE_BACKEND_URL` (dev override)
- Backend: `AZURE_COMMUNICATION_CONNECTION_STRING`, `CORS_ALLOWED_ORIGINS`

No test suite exists.

## Architecture

### Routing
`App.jsx` implements **manual pathname-based routing** — no React Router. It reads `window.location.pathname` and renders the matching page component. Key routes: `/` (HomePage), `/communication` (CommunicationLobby), `/communication/call/:roomId` (CommunicationCall), `/communication/deaf` (DeafCommunication standalone).

### Participant Split
The call experience is divided by participant type selected in the lobby:
- **Deaf** path: `DeafCommunication.jsx` → camera + MediaPipe gesture detection → POST gestures to backend relay → receives hearing-side transcriptions from relay
- **Hearing** path: `HearingCommunication.jsx` → Azure Speech SDK microphone → POST transcriptions to backend relay → receives deaf-side gestures from relay

Both paths share `CommunicationCall.jsx` as the orchestrator.

### Backend API Relay (in-memory)
The FastAPI backend (`backend/main.py`) acts as a message relay between participants. It stores up to 100 messages per room in plain Python dicts (not a database). Two relay channels per room:
- `/transcription/{room_id}` — hearing→deaf text relay
- `/gesture/{room_id}` — deaf→hearing gesture relay

Polling is done client-side; there is no WebSocket.

### Backend URL Resolution
`src/utils/apiConfig.js` auto-detects the backend URL:
1. `VITE_BACKEND_URL` env override (dev)
2. If on HTTPS/Vercel → `/api/backend` (Vercel serverless proxy to Azure App Service)
3. Otherwise → `http://localhost:8000`

The Vercel proxy lives in `api/` directory as serverless functions (catch-all route pattern).

### Gesture Recognition
`src/mediaPipeGesture.js` + `src/hooks/useGestureRecognition.js` initialize MediaPipe Hands from the existing video stream. Two modes:
- **Alphabet mode**: sends 63 landmarks to `POST /predict` → backend runs `asl_alphabet_model.h5`
- **Word mode**: accumulates 30 frames × 63 landmarks = 1890 input → `asl_dynamic_word_lstm.h5`

Models live in `../asl_project/` relative to `backend/main.py` (not in the repo; must be present locally to run predictions).

### Azure Communication Services
`src/hooks/useAzureWebRTC.js` lazily loads the Azure Calling SDK, fetches a token from `/token`, and manages the call lifecycle. Room creation/token generation happens in `backend/main.py` using `azure-communication-identity` and `azure-communication-rooms`. Rooms are valid for 24 hours; user IDs persist in `rooms_db` in-memory dict.

## Deployment

- **Frontend**: Vercel — auto-deploys on `main` push; SPA rewrite in `vercel.json`
- **Backend**: Azure App Service (`hearme-backend-api`) — GitHub Actions CI/CD in `.github/workflows/main_hearme-backend-api.yml`, Python 3.10, triggered on `main` push

## Key Constraints

- In-memory storage only — no database. Transcriptions/gestures are lost on backend restart. Not suitable for multi-instance or production scale.
- Azure services (STT, TTS, video calling) consume credits. MediaPipe is free/local. The UI shows red warning banners when credit-consuming features are active.
- The custom `CustomLSTM` layer in `backend/main.py` exists to handle TensorFlow version compatibility when loading the word model.
- `new-ui-clone/` and several legacy components (`VideoCall.jsx`, `AzureVideoCall.jsx`, `Communication.jsx`, `ASLRecognition.jsx`) are unused/legacy and may be removed.
