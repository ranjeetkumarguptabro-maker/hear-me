# 🤟 HearMe — AI-Powered Real-Time Accessible Communication Platform

[![React](https://img.shields.io/badge/React-18-blue.svg?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.10-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Azure](https://img.shields.io/badge/Azure-ACS_%26_Speech_SDK-0078D4.svg?logo=microsoftazure)](https://azure.microsoft.com/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands_%26_Holistic-FF6F00.svg?logo=google)](https://mediapipe.dev/)

> **HearMe** is an advanced, bi-directional accessibility platform built to seamlessly bridge the communication gap between **Deaf / Hard of Hearing** participants and **Hearing** participants in real-time WebRTC video calls. Combining computer vision gesture recognition, live speech transcription, AI sign language GIF translation, and neural text-to-speech synthesis.

---

## 🌟 Key Features & Capabilities

### 🎥 1. Real-Time WebRTC Video Calling
* **Azure Communication Services Integration**: Room-based video calls with zero latency and high-definition video feeds.
* **Dual-Role Lobby & Routing**: Dedicated join flows (`/communication`) for **Deaf** and **Hearing** participants (`/communication/call/:roomId?type=deaf|hearing`).
* **Interactive Picture-in-Picture (PiP) Layout**: Google Meet / Zoom style video panel with seamless 1-click main video & PiP swapping.

---

### 🦻 2. Deaf Participant Suite
* **🎙️ Voice-to-Text Transcription**: Hearing user speech is transcribed live via Microsoft Cognitive Speech SDK, relayed to the Deaf user's interface in a real-time, scrollable chat ledger.
* **🤟 Text-to-Virtual Sign Language (GIF Engine)**: Translates incoming speech into sequential ASL (American Sign Language) GIFs from curated channels (`@theaslgifs` and `@signwithrobert`). Includes **Sentence Mode**, **Word Mode**, and **Alphabet Spelling Fallback**.
* **🖐️ Real-Time ASL Gesture Recognition**: Uses browser-side **MediaPipe Hands** landmark extraction paired with a Python / FastAPI machine learning model to recognize ASL alphabet letters, words, and multi-hand gestures (e.g., *"BYE BYE"*).

---

### 🗣️ 3. Hearing Participant Suite
* **🔊 Gesture-to-Voice (Neural Text-to-Speech)**: Converts incoming hand sign predictions signed by the Deaf user into spoken audio using Azure Neural Voice synthesis (`en-US-JennyNeural`).
* **📜 Speech Assistant Card**: Displays a live text log of detected ASL gestures signed by the Deaf participant.
* **✨ Sign Language Assistance Visuals**: Interactive, animated UI card with background media and instructional visual aids to assist hearing users in learning sign language on the fly.

---

### 🛡️ 4. Credit-Safe API Control System
* **Hard Power Switches**: Independent toggles for Speech-to-Text, Sign Language GIFs, MediaPipe landmark tracking, and Neural TTS.
* **Automatic Resource Cleanup**: Switching toggles to OFF immediately stops mic listeners, cancels pending HTTP polling queues, disposes recognizers, and frees up API credits.

---

## 🏗️ System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               HEARME PLATFORM                               │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                                       │
   [ DEAF PARTICIPANT ]                                  [ HEARING PARTICIPANT ]
          │                                                       │
  • MediaPipe Camera Feed                                • Microphone Audio Input
  • Extract Hand Landmarks                               • Azure Speech-to-Text
          │                                                       │
          ▼                                                       ▼
  ┌──────────────┐   POST /gesture/{roomId}             ┌──────────────────┐
  │ FastAPI ASL  ├────────────────────────────────────► │ Hearing Speech   │
  │ ML Model     │                                      │ Assistant Card   │
  └──────────────┘                                      └────────┬─────────┘
          │                                                      │
          │                                            Azure Neural TTS Spoken Voice
          │                                                      │
          │          POST /transcription/{roomId}                ▼
          └───────────────────────────────────────────► ┌──────────────────┐
                                                        │ Deaf Voice-to-   │
                                                        │ Text Subtitles   │
                                                        └────────┬─────────┘
                                                                 │
                                                    Drives ASL GIF Translation Engine
                                                                 ▼
                                                        ┌──────────────────┐
                                                        │ Virtual Sign     │
                                                        │ Language GIFs    │
                                                        └──────────────────┘
```

---

## 📂 Repository Structure

```
hear-me/
├── src/                          # React Frontend Source Code
│   ├── components/               # Deaf & Hearing UI Components, Video Panels, Cards
│   ├── lib/                      # Azure Speech, ACS, GIPHY & MediaPipe Integrations
│   ├── pages/                    # Lobby (/communication) & Call Pages (/communication/call)
│   └── App.jsx                   # Main Router & Application Entry
├── backend/                      # Python FastAPI Async Backend
│   ├── main.py                   # Transcription & Gesture Relays, ASL Model Endpoints
│   ├── requirements.txt          # Python Dependencies (FastAPI, Uvicorn, Pydantic)
│   └── start_server.sh           # Backend Startup Script
├── asl_project/                  # ASL Machine Learning Model & Landmark Processors
├── asl_training/                 # Dataset Collectors & Training Scripts
├── public/                       # Static Assets & Fallback Media
├── API_ROUTES.json               # Full API Route Specification
├── package.json                  # Frontend Dependencies & Scripts
└── README.md                     # Documentation
```

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
* **Node.js**: v18.x or higher
* **Python**: v3.10 or higher
* **Azure Subscriptions**:
  * Azure Speech Service (Key & Region)
  * Azure Communication Services (Connection String)

---

### 2. Frontend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ranjeetkumarguptabro-maker/hear-me.git
   cd hear-me
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the project root:
   ```env
   VITE_AZURE_SPEECH_KEY=your_azure_speech_key
   VITE_AZURE_REGION=your_azure_region
   VITE_AZURE_COMMUNICATION_CONNECTION_STRING=your_acs_connection_string
   VITE_GIPHY_API_KEY=your_giphy_api_key
   VITE_BACKEND_URL=http://localhost:8000
   ```

4. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   *Frontend will run on `http://localhost:5173`*

---

### 3. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start FastAPI Backend Server**:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *Backend API will run on `http://localhost:8000`*

---

## 📡 API Endpoints Reference

### 🎙️ Transcription Relay (Hearing → Deaf)
* `POST /transcription/{room_id}` — Submits partial or final speech-to-text transcriptions.
* `GET /transcription/{room_id}?since={id}` — Polls new transcriptions since a given timestamp ID.

### 🖐️ Gesture Relay (Deaf → Hearing)
* `POST /gesture/{room_id}` — Submits predicted ASL gestures signed by the Deaf user.
* `GET /gesture/{room_id}?since={id}` — Polls new gesture predictions for Hearing Speech Assistant.

### 🤖 ASL Prediction Model
* `POST /predict/asl` — Processes MediaPipe hand landmark arrays and returns predicted sign letters/words.

---

## 📜 License & Acknowledgments

* **License**: Private / All Rights Reserved © 2026 HearMe Team.
* **Special Thanks**: Microsoft Azure Speech & Communication Services, Google MediaPipe, and ASL Content Creators (`@theaslgifs` and `@signwithrobert`).
