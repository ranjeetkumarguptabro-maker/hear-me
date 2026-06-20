import React, { useState, useRef, useEffect } from "react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import {
  initMediaPipeHands,
  startMediaPipeCamera,
  processHandResults,
} from "./mediaPipeGesture";
import { flattenLandmarks, predictASL, checkAPIStatus } from "./api/aslApi";
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
const AZURE_ENDPOINT = import.meta.env.VITE_AZURE_ENDPOINT || "https://westeurope.api.cognitive.microsoft.com/";

// Debug: Log Azure config (first 4 chars only for security)
console.log("Azure Speech Config:", {
  region: AZURE_REGION,
  endpoint: AZURE_ENDPOINT,
  keySet: !!AZURE_SPEECH_KEY && AZURE_SPEECH_KEY.length > 0
});

export default function Communication() {
  // Video State
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(false);
  const participantName = "Raghav";

  // ASL Recognition State
  const [aslMode, setAslMode] = useState("alphabet");
  const [aslPrediction, setAslPrediction] = useState(null);
  const [aslLabel, setAslLabel] = useState("");
  const [isPredicting, setIsPredicting] = useState(false);
  const [aslError, setAslError] = useState("");
  const [handDetected, setHandDetected] = useState(false);
  const [isPredictionEnabled, setIsPredictionEnabled] = useState(true);

  // Handle prediction toggle
  const handlePredictionToggle = (enabled) => {
    setIsPredictionEnabled(enabled);
    isPredictionEnabledRef.current = enabled; // Update ref immediately
    if (!enabled) {
      // Clear predictions when disabled
      setAslPrediction(null);
      setAslLabel("");
      setAslError("");
      sequenceBufferRef.current = [];
      setHandDetected(false);
    }
  };

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [finalSpeechText, setFinalSpeechText] = useState(""); // Final recognized text for GIF playback
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
  const aslModeRef = useRef(aslMode); // Track current mode in ref
  const isPredictionEnabledRef = useRef(isPredictionEnabled); // Track prediction enabled state in ref
  const PREDICTION_THROTTLE_MS = 200;
  const SEQUENCE_LENGTH = 30;

  // Check backend API status on mount
  useEffect(() => {
    checkAPIStatus().then((status) => {
      if (!status.running) {
        console.warn("Backend API not running:", status.error);
        setAslError("Backend API not running. Please check your backend connection.");
      } else {
        console.log("Backend API connected:", status.data);
        setAslError("");
      }
    });
  }, []);

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

  // Update finalSpeechText when liveTranscription changes (for Sign Language GIF)
  useEffect(() => {
    if (liveTranscription) {
      setFinalSpeechText(liveTranscription);
    }
  }, [liveTranscription]);

  // Start camera with MediaPipe
  const handleStartCamera = async () => {
    if (!isVideoOn || !videoRef.current) return;

    try {
      const video = videoRef.current;

      const hands = await initMediaPipeHands(async (results) => {
        const hasHand =
          results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
        const handCount = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;
        const hasBothHands = handCount === 2;
        setHandDetected(hasHand);

        // Use ref to get the latest mode value (avoids closure issues)
        const currentMode = aslModeRef.current;

        // Check for two hands - show "BYE BYE" only in word mode and if prediction is enabled
        if (hasBothHands && currentMode === "word" && isPredictionEnabledRef.current) {
          setAslPrediction(null);
          setAslLabel("BYE BYE");
          setAslError("");
          setIsPredicting(false);
          // Clear sequence buffer
          sequenceBufferRef.current = [];
          // Process gestures (draw video and landmarks on canvas)
          if (canvasRef.current) {
            processHandResults(results, () => {}, canvasRef.current);
          }
          return; // Exit early when both hands detected in word mode
        }

        // Process gestures (draw video and landmarks on canvas) only if prediction is enabled
        if (canvasRef.current && isPredictionEnabledRef.current) {
          processHandResults(results, () => {}, canvasRef.current);
          if (!hasHand) {
            setAslPrediction(null);
            setAslLabel("");
            setAslError("");
          }
        } else if (canvasRef.current && !isPredictionEnabledRef.current) {
          // When prediction is disabled, only draw video frame without landmarks (optimized)
          const ctx = canvasRef.current.getContext("2d");
          if (results.image) {
            const newWidth = results.image.width;
            const newHeight = results.image.height;
            if (canvasRef.current.width !== newWidth || canvasRef.current.height !== newHeight) {
              canvasRef.current.width = newWidth;
              canvasRef.current.height = newHeight;
            }
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(
              results.image,
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );
          }
        }

        if (
          hasHand &&
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0 &&
          isPredictionEnabledRef.current
        ) {
          const landmarks = results.multiHandLandmarks[0];
          const flatLandmarks = flattenLandmarks(landmarks);

          if (flatLandmarks && !isPredicting) {
            // Use ref to get the latest mode value (avoids closure issues)
            const currentMode = aslModeRef.current;
            
            if (currentMode === "alphabet") {
              const now = Date.now();
              const timeSinceLastPrediction =
                now - lastPredictionTimeRef.current;

              if (timeSinceLastPrediction >= PREDICTION_THROTTLE_MS) {
                lastPredictionTimeRef.current = now;
                setIsPredicting(true);
                setAslError("");

                try {
                  const result = await predictASL("alphabet", flatLandmarks);
                  if (result && result.label) {
                    setAslPrediction(result.prediction);
                    setAslLabel(result.label);
                  } else {
                    setAslError("No prediction received. Check backend connection.");
                    setAslPrediction(null);
                    setAslLabel("");
                  }
                } catch (error) {
                  console.error("ASL prediction error:", error);
                  setAslError(error.message || "Prediction failed. Is backend running?");
                  setAslPrediction(null);
                  setAslLabel("");
                } finally {
                  setIsPredicting(false);
                }
              }
            } else if (currentMode === "word") {
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
                    if (result && result.label) {
                      setAslPrediction(result.prediction);
                      setAslLabel(result.label);
                    } else {
                      setAslError("No prediction received. Check backend connection.");
                      setAslPrediction(null);
                      setAslLabel("");
                    }
                  } catch (error) {
                    console.error("ASL prediction error:", error);
                    setAslError(error.message || "Prediction failed. Is backend running?");
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
          // Only clear sequence buffer in word mode
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
    return new Promise((resolve, reject) => {
      if (recognizerRef.current) {
        console.log("Speech recognition already running");
        resolve();
        return;
      }

      // Validate credentials
      if (!AZURE_SPEECH_KEY || AZURE_SPEECH_KEY.trim() === "") {
        const error = "Azure Speech API key not configured. Please check your credentials.";
        setSpeechError(error);
        console.error("Azure Speech API key is missing");
        reject(new Error(error));
        return;
      }

      if (!AZURE_REGION || AZURE_REGION.trim() === "") {
        const error = "Azure Speech region not configured. Please set region to 'westeurope'.";
        setSpeechError(error);
        console.error("Azure Speech region is missing");
        reject(new Error(error));
        return;
      }

      // Validate API key format (Azure keys are typically 32 characters)
      if (AZURE_SPEECH_KEY.length < 20) {
        const error = "Azure Speech API key appears to be invalid. Please check your key.";
        setSpeechError(error);
        console.error("Azure Speech API key format invalid");
        reject(new Error(error));
        return;
      }

      try {
      console.log("Starting Azure Speech recognition...");
      
      // Create speech config with subscription key and region
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        AZURE_SPEECH_KEY,
        AZURE_REGION
      );
      
      // Set recognition language
      speechConfig.speechRecognitionLanguage = "en-US";
      
      // Log configuration for debugging
      console.log("✅ Azure Speech Config:", {
        region: AZURE_REGION,
        endpoint: AZURE_ENDPOINT,
        keyLength: AZURE_SPEECH_KEY.length
      });

      // Get audio from default microphone
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      
      // Create recognizer
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      
      console.log("Speech recognizer created successfully");

      // Handle partial results (while speaking)
      recognizer.recognizing = (s, e) => {
        if (e.result && e.result.text) {
          console.log("Recognizing:", e.result.text);
          setLiveTranscription(e.result.text);
          setSpeechError(""); // Clear any previous errors
        }
      };

      // Handle final results (after speech ends)
      recognizer.recognized = (s, e) => {
        if (e.result) {
          console.log("Recognition result:", {
            reason: e.result.reason,
            text: e.result.text,
            reasonText: sdk.ResultReason[e.result.reason]
          });

          if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
            const text = e.result.text.trim();
            if (text) {
              console.log("Final recognized text:", text);
              setLiveTranscription(text);
              // Set final speech text for Sign Language GIF playback
              setFinalSpeechText(text);
              // Add to chat messages
              setChatMessages((prev) => [
                ...prev,
                { text, avatar: "👤", time: new Date() },
              ]);
              setSpeechError(""); // Clear errors on success
            }
          } else if (e.result.reason === sdk.ResultReason.NoMatch) {
            console.log("No speech could be recognized");
            setSpeechError("No speech detected. Please speak clearly.");
          }
        }
      };

      // Handle errors
      recognizer.canceled = (s, e) => {
        console.error("Speech recognition canceled:", {
          reason: e.reason,
          errorCode: e.errorCode,
          errorDetails: e.errorDetails,
          cancellationReason: sdk.CancellationReason[e.reason]
        });
        
        let errorMessage = "Speech recognition canceled";
        
        if (e.reason === sdk.CancellationReason.Error) {
          // Handle specific error codes
          if (e.errorCode === 401) {
            errorMessage = "Authentication failed. Please check your Azure Speech API key.";
          } else if (e.errorCode === 403) {
            errorMessage = "Access denied. Please check your Azure Speech API key permissions.";
          } else if (e.errorCode === 429) {
            errorMessage = "Rate limit exceeded. Please try again later.";
          } else if (e.errorCode === 500 || e.errorCode === 503) {
            errorMessage = "Azure Speech service unavailable. Please try again later.";
          } else if (e.errorDetails) {
            errorMessage = `Error ${e.errorCode}: ${e.errorDetails}`;
          } else {
            errorMessage = `Error ${e.errorCode}: Connection failed. Check your network and Azure credentials.`;
          }
        } else if (e.errorDetails) {
          errorMessage = e.errorDetails;
        }
        
        setSpeechError(errorMessage);
        setIsListening(false);
        recognizerRef.current = null;
      };

      // Handle session end
      recognizer.sessionStopped = (s, e) => {
        console.log("Speech recognition session stopped");
        setIsListening(false);
        recognizerRef.current = null;
      };

      // Start continuous recognition
      recognizer.startContinuousRecognitionAsync(
        () => {
          console.log("✅ Speech recognition started successfully");
          setIsListening(true);
          setSpeechError("");
          recognizerRef.current = recognizer;
          resolve(); // Resolve promise on success
        },
        (error) => {
          console.error("❌ Failed to start speech recognition:", error);
          const errorMsg = error.message || `Failed to start: ${error}`;
          setSpeechError(errorMsg);
          setIsListening(false);
          recognizerRef.current = null;
          reject(new Error(errorMsg)); // Reject promise on error
        }
      );
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
      const errorMsg = error.message || "Failed to initialize speech recognition. Check your Azure credentials.";
      setSpeechError(errorMsg);
      setIsListening(false);
      reject(error); // Reject promise on error
    }
    });
  };

  const handleStopListening = () => {
    if (recognizerRef.current) {
      console.log("Stopping speech recognition...");
      const recognizer = recognizerRef.current;
      
      // Immediately clear the ref to prevent any new operations
      recognizerRef.current = null;
      setIsListening(false);
      setLiveTranscription("");
      
      // Cancel any ongoing recognition first
      try {
        recognizer.canceled = null; // Remove cancel handler to prevent errors
        recognizer.recognizing = null; // Remove recognizing handler
        recognizer.recognized = null; // Remove recognized handler
        recognizer.sessionStopped = null; // Remove session stopped handler
      } catch (e) {
        console.warn("Error clearing recognizer handlers:", e);
      }
      
      // Stop continuous recognition
      recognizer.stopContinuousRecognitionAsync(
        () => {
          console.log("Speech recognition stopped successfully");
          try {
            recognizer.close();
          } catch (e) {
            console.warn("Error closing recognizer:", e);
          }
        },
        (error) => {
          console.error("Error stopping recognition:", error);
          // Force cleanup even if stop fails
          try {
            recognizer.close();
          } catch (e) {
            console.warn("Error force-closing recognizer:", e);
          }
        }
      );
    } else {
      setIsListening(false);
      setLiveTranscription("");
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

  // Handle voice-to-text toggle (from card)
  const handleVoiceToTextToggle = async (enabled) => {
    console.log("Voice to Text toggle called:", enabled);
    
    if (enabled) {
      // Start Azure Speech-to-Text when toggle is ON
      console.log("Starting Azure Speech-to-Text...");
      
      // First, make sure any existing recognizer is stopped
      if (recognizerRef.current) {
        console.log("Stopping existing recognizer before starting new one...");
        handleStopListening();
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!isListening && !recognizerRef.current) {
        try {
          setShowTranscription(true);
          await handleStartListening();
          setIsMicOn(true);
          setSpeechError(""); // Clear any previous errors
        } catch (error) {
          console.error("Failed to start speech recognition:", error);
          setSpeechError(error.message || "Failed to start speech recognition");
          setShowTranscription(false); // Revert toggle if failed
        }
      } else {
        console.log("Speech recognition already running");
        setShowTranscription(true);
      }
    } else {
      // Stop Azure Speech-to-Text when toggle is OFF
      console.log("Stopping Azure Speech-to-Text...");
      setShowTranscription(false);
      
      // Always call stop, even if state says it's not listening
      // This ensures cleanup happens
      handleStopListening();
      setIsMicOn(false);
      setLiveTranscription(""); // Clear live transcription
      setFinalSpeechText(""); // Clear final speech text
      setSpeechError(""); // Clear any errors
    }
  };

  // Handle mode change
  const handleModeChange = (newMode) => {
    console.log("Mode changing from", aslMode, "to", newMode);
    setAslMode(newMode);
    aslModeRef.current = newMode; // Update ref immediately
    // Clear sequence buffer when switching modes
    sequenceBufferRef.current = [];
    // Reset predictions
    setAslPrediction(null);
    setAslLabel("");
    setAslError("");
    // Reset prediction timer
    lastPredictionTimeRef.current = 0;
  };

  // Update ref when mode changes
  useEffect(() => {
    aslModeRef.current = aslMode;
  }, [aslMode]);

  // Update ref when prediction enabled state changes
  useEffect(() => {
    isPredictionEnabledRef.current = isPredictionEnabled;
  }, [isPredictionEnabled]);

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

  // Navigation state for header
  const [activeNav, setActiveNav] = useState("communicate");
  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const navItemsRef = useRef({});

  // Update indicator position when active nav changes
  useEffect(() => {
    if (indicatorRef.current && navItemsRef.current[activeNav]) {
      const activeItem = navItemsRef.current[activeNav];
      const navContainer = navRef.current;

      if (activeItem && navContainer) {
        const navRect = navContainer.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();

        indicatorRef.current.style.left = `${itemRect.left - navRect.left}px`;
        indicatorRef.current.style.width = `${itemRect.width}px`;
      }
    }
  }, [activeNav]);

  const handleNavClick = (navId) => {
    setActiveNav(navId);
  };

  return (
    <div className="comm-page-refactored">
      {/* Header Navigation */}
      <header className="comm-header-nav">
        <div className="comm-header-logo">
          <img
            src="https://res.cloudinary.com/drvllglbk/image/upload/f_png/cs_srgb/q_auto/hear_me_logo_jvyfgf.jpg"
            alt="He@r Me Logo"
            className="comm-header-logo-image"
            onError={(e) => {
              console.error("Logo failed to load from Cloudinary");
              if (!e.target.src.includes("hear_me_logo_jvyfgf.jpg")) {
                e.target.src =
                  "https://res.cloudinary.com/drvllglbk/image/upload/hear_me_logo_jvyfgf.jpg";
              } else if (!e.target.src.includes("/logo.png")) {
                e.target.src = "/logo.png";
              }
            }}
          />
        </div>
        <nav ref={navRef} className="comm-header-nav-menu">
          <div ref={indicatorRef} className="comm-nav-indicator" />
          <a
            ref={(el) => (navItemsRef.current.home = el)}
            href="#home"
            className={`comm-nav-link ${activeNav === "home" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("home");
            }}
          >
            HOME
          </a>
          <a
            ref={(el) => (navItemsRef.current.communicate = el)}
            href="#communicate"
            className={`comm-nav-link ${activeNav === "communicate" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("communicate");
            }}
          >
            Communicate
          </a>
          <a
            ref={(el) => (navItemsRef.current.features = el)}
            href="#features"
            className={`comm-nav-link ${activeNav === "features" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("features");
            }}
          >
            Features
          </a>
          <a
            ref={(el) => (navItemsRef.current.howitworks = el)}
            href="#howitworks"
            className={`comm-nav-link ${activeNav === "howitworks" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("howitworks");
            }}
          >
            How it Works
          </a>
        </nav>
        <button className="comm-contact-button">Contact</button>
      </header>

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

        {/* Bottom: 4 Cards Grid */}
        <div className="bottom-cards-grid">
          <AIPredictionCard
            isProcessing={isPredicting}
            predictionText={aslLabel || (handDetected && isPredicting ? "Processing gestures..." : "")}
            handDetected={handDetected}
            currentMode={aslMode}
            isEnabled={isPredictionEnabled}
            onToggle={handlePredictionToggle}
          />
          <ModeSelectorCard
            currentMode={aslMode}
            onModeChange={handleModeChange}
          />
          <VoiceToTextCard
            isEnabled={isListening}
            onToggle={handleVoiceToTextToggle}
            messages={chatMessages}
            currentMessage={showTranscription && liveTranscription ? liveTranscription : ""}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSendMessage={handleSendMessage}
            isListening={isListening}
          />
          <SignLanguageCard speechText={finalSpeechText} />
        </div>
      </div>
    </div>
  );
}
