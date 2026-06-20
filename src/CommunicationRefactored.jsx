import React, { useState, useRef, useEffect } from "react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import {
  initMediaPipeHands,
  startMediaPipeCamera,
  processHandResults,
} from "./mediaPipeGesture";
import { flattenLandmarks, predictASL } from "./api/aslApi";
import MainVideoArea from "./components/MainVideoArea";
import ParticipantsSidebar from "./components/ParticipantsSidebar";
import {
  AIPredictionCard,
  ModeSelectorCard,
  VoiceToTextCard,
  SignLanguageCard,
} from "./components/BottomCards";
import "./CommunicationRefactored.css";

// Azure Speech Service credentials
const AZURE_SPEECH_KEY =
  import.meta.env.VITE_AZURE_SPEECH_KEY ||
  "YOUR_AZURE_SPEECH_KEY_HERE";
const AZURE_REGION = import.meta.env.VITE_AZURE_REGION || "westeurope";
const AZURE_ENDPOINT = "https://westeurope.api.cognitive.microsoft.com/";

export default function Communication() {
  // Video State
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(false);
  const participantName = "Raghav"; // You can make this dynamic

  // ASL Recognition State
  const [aslMode, setAslMode] = useState("alphabet"); // "alphabet" or "word"
  const [aslPrediction, setAslPrediction] = useState(null);
  const [aslLabel, setAslLabel] = useState("");
  const [isPredicting, setIsPredicting] = useState(false);
  const [aslError, setAslError] = useState("");
  const [handDetected, setHandDetected] = useState(false);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [speechError, setSpeechError] = useState("");
  const [showTranscription, setShowTranscription] = useState(true);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const recognizerRef = useRef(null);
  const lastPredictionTimeRef = useRef(0);
  const sequenceBufferRef = useRef([]);
  const PREDICTION_THROTTLE_MS = 200;
  const SEQUENCE_LENGTH = 30;

  // Auto-start camera on mount
  useEffect(() => {
    if (isVideoOn) {
      handleStartCamera();
    }
    return () => {
      handleStopCamera();
      handleStopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start camera with MediaPipe
  const handleStartCamera = async () => {
    if (!isVideoOn || !videoRef.current) return;

    try {
      const video = videoRef.current;

      const hands = await initMediaPipeHands(async (results) => {
        const hasHand =
          results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
        setHandDetected(hasHand);

        if (canvasRef.current) {
          processHandResults(results, setAslLabel, canvasRef.current);
          if (!hasHand) {
            setAslPrediction(null);
            setAslLabel("");
            setAslError("");
          }
        }

        if (
          hasHand &&
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0
        ) {
          const landmarks = results.multiHandLandmarks[0];
          const flatLandmarks = flattenLandmarks(landmarks);

          if (flatLandmarks && !isPredicting) {
            if (aslMode === "alphabet") {
              const now = Date.now();
              const timeSinceLastPrediction =
                now - lastPredictionTimeRef.current;

              if (timeSinceLastPrediction >= PREDICTION_THROTTLE_MS) {
                lastPredictionTimeRef.current = now;
                setIsPredicting(true);
                setAslError("");

                try {
                  const result = await predictASL("alphabet", flatLandmarks);
                  setAslPrediction(result.prediction);
                  setAslLabel(result.label || String(result.prediction));
                } catch (error) {
                  console.error("ASL prediction error:", error);
                  setAslError(error.message || "Prediction failed");
                  setAslPrediction(null);
                } finally {
                  setIsPredicting(false);
                }
              }
            } else if (aslMode === "word") {
              sequenceBufferRef.current.push(...flatLandmarks);

              if (sequenceBufferRef.current.length > SEQUENCE_LENGTH * 63) {
                sequenceBufferRef.current = sequenceBufferRef.current.slice(
                  -SEQUENCE_LENGTH * 63
                );
              }

              if (sequenceBufferRef.current.length >= SEQUENCE_LENGTH * 63) {
                const now = Date.now();
                const timeSinceLastPrediction =
                  now - lastPredictionTimeRef.current;

                if (timeSinceLastPrediction >= PREDICTION_THROTTLE_MS * 5) {
                  lastPredictionTimeRef.current = now;
                  setIsPredicting(true);
                  setAslError("");

                  const sequenceBuffer = [...sequenceBufferRef.current];

                  try {
                    const result = await predictASL("word", sequenceBuffer);
                    setAslPrediction(result.prediction);
                    setAslLabel(result.label || String(result.prediction));
                  } catch (error) {
                    console.error("ASL prediction error:", error);
                    setAslError(error.message || "Prediction failed");
                    setAslPrediction(null);
                    setAslLabel("");
                  } finally {
                    setIsPredicting(false);
                  }
                }
              }
            }
          }
        } else {
          setAslPrediction(null);
          setAslLabel("");
          setAslError("");
          if (aslMode === "word") {
            sequenceBufferRef.current = [];
          }
        }
      });

      handsRef.current = hands;
      const camera = await startMediaPipeCamera(hands, video);
      cameraRef.current = camera;
    } catch (error) {
      console.error("Error starting camera:", error);
      alert("Failed to start camera. Please check permissions.");
    }
  };

  // Stop camera
  const handleStopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
    if (videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }
    setHandDetected(false);
  };

  // Toggle video
  const handleToggleVideo = () => {
    const newState = !isVideoOn;
    setIsVideoOn(newState);
    if (!newState) {
      handleStopCamera();
    } else {
      handleStartCamera();
    }
  };

  // Speech Recognition
  const handleStartListening = async () => {
    if (recognizerRef.current) {
      return;
    }

    try {
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        AZURE_SPEECH_KEY,
        AZURE_REGION
      );
      speechConfig.speechRecognitionLanguage = "en-US";

      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      recognizer.recognizing = (s, e) => {
        if (e.result.text) {
          setLiveTranscription(e.result.text);
        }
      };

      recognizer.recognized = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          const text = e.result.text;
          setLiveTranscription(text);
          if (text.trim()) {
            setChatMessages((prev) => [
              ...prev,
              { text, avatar: "👤", time: new Date() },
            ]);
          }
        }
      };

      recognizer.canceled = (s, e) => {
        console.error("Speech recognition canceled:", e.errorDetails);
        setSpeechError(e.errorDetails);
        setIsListening(false);
      };

      recognizer.sessionStopped = (s, e) => {
        setIsListening(false);
        recognizerRef.current = null;
      };

      await recognizer.startContinuousRecognitionAsync();
      recognizerRef.current = recognizer;
      setIsListening(true);
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setSpeechError(error.message);
    }
  };

  const handleStopListening = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync(
        () => {
          recognizerRef.current.close();
          recognizerRef.current = null;
          setIsListening(false);
        },
        (error) => {
          console.error("Error stopping recognition:", error);
        }
      );
    }
  };

  // Toggle mic
  const handleToggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    if (newState) {
      handleStartListening();
    } else {
      handleStopListening();
    }
  };

  // Handle mode change
  const handleModeChange = (newMode) => {
    setAslMode(newMode);
    sequenceBufferRef.current = [];
    setAslPrediction(null);
    setAslLabel("");
  };

  // Chat handlers
  const handleSendMessage = () => {
    if (chatInput.trim()) {
      setChatMessages([
        ...chatMessages,
        { text: chatInput, avatar: "👤", time: new Date() },
      ]);
      setChatInput("");
    }
  };

  // Placeholder handlers
  const handleScreenShare = () => {
    console.log("Screen share clicked");
  };

  const handleRaiseHand = () => {
    console.log("Raise hand clicked");
  };

  const handleEndCall = () => {
    handleStopCamera();
    handleStopListening();
    console.log("End call clicked");
  };

  return (
    <div className="comm-page-refactored">
      {/* Left Navigation Sidebar */}
      <div className="left-nav-sidebar">
        <div className="nav-logo">🎙️</div>
        <div className="nav-menu">
          <button className="nav-item active">🏠</button>
          <button className="nav-item">⊞</button>
          <button className="nav-item">💬</button>
          <button className="nav-item">⚙️</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content-wrapper">
        {/* Top: Main Video Area */}
        <div className="top-section">
          <MainVideoArea
            videoRef={videoRef}
            canvasRef={canvasRef}
            participantName={participantName}
            isVideoOn={isVideoOn}
            isMicOn={isMicOn}
            onToggleVideo={handleToggleVideo}
            onToggleMic={handleToggleMic}
            onScreenShare={handleScreenShare}
            onRaiseHand={handleRaiseHand}
            onEndCall={handleEndCall}
          />

          {/* Right Sidebar: Participants */}
          <ParticipantsSidebar />
        </div>

        {/* Bottom: 4 Cards */}
        <div className="bottom-cards-grid">
          <AIPredictionCard
            isProcessing={isPredicting}
            predictionText={aslLabel || (handDetected ? "Processing..." : "")}
          />
          <ModeSelectorCard
            currentMode={aslMode}
            onModeChange={handleModeChange}
          />
          <VoiceToTextCard
            isEnabled={showTranscription}
            onToggle={setShowTranscription}
            messages={chatMessages}
            currentMessage={liveTranscription}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSendMessage={handleSendMessage}
          />
          <SignLanguageCard predictionLabel={aslLabel} />
        </div>
      </div>
    </div>
  );
}


