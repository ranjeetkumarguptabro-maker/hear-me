import React, { useState, useRef, useEffect, useCallback } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import VideoCall from "./components/VideoCall";
import "./ASLRecognition.css";

const ASLRecognition = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [predictionLabel, setPredictionLabel] = useState("");
  const [mode, setMode] = useState("alphabet"); // "alphabet" or "word"
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [handDetected, setHandDetected] = useState(false);
  const [handCount, setHandCount] = useState(0);

  // Ref to track current mode (so callback always uses latest mode)
  const modeRef = useRef(mode);

  // Update mode ref whenever mode changes
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Prediction buffer to prevent flickering (like Python deque(maxlen=15))
  const predictionBufferRef = useRef([]);
  const BUFFER_SIZE = 15; // Same as Python: deque(maxlen=15)

  // Throttling for API calls (reduced to get more predictions per second)
  const lastPredictionTimeRef = useRef(0);
  const PREDICTION_THROTTLE_MS = 100; // Reduced from 200ms - more frequent predictions

  // Word mode: buffer for 30 frames
  const sequenceBufferRef = useRef([]);
  const SEQUENCE_LENGTH = 30;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, []);

  const initializeMediaPipe = useCallback(() => {
    if (!videoRef.current) return;

    // Don't re-initialize if already initialized
    if (handsRef.current && cameraRef.current) {
      return;
    }

    // Match Python MediaPipe configuration
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    // Allow up to 2 hands (to detect "BYE BYE" gesture)
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      if (canvasRef.current && videoRef.current) {
        const canvasCtx = canvasRef.current.getContext("2d");
        canvasCtx.save();
        canvasCtx.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        canvasCtx.drawImage(
          results.image,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );

        // Check if hand(s) is detected
        const detectedHandCount = results.multiHandLandmarks
          ? results.multiHandLandmarks.length
          : 0;
        const hasHand = detectedHandCount > 0;
        const hasBothHands = detectedHandCount === 2;
        setHandDetected(hasHand);
        setHandCount(detectedHandCount);

        // Draw landmarks for all detected hands (supports both single and both hands)
        if (
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0
        ) {
          const connections = [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4], // Thumb
            [0, 5],
            [5, 6],
            [6, 7],
            [7, 8], // Index
            [5, 9],
            [9, 10],
            [10, 11],
            [11, 12], // Middle
            [9, 13],
            [13, 14],
            [14, 15],
            [15, 16], // Ring
            [13, 17],
            [17, 18],
            [18, 19],
            [19, 20],
            [17, 0], // Pinky & wrist
          ];

          // Draw all detected hands in WHITE
          results.multiHandLandmarks.forEach((handLandmarks) => {
            // Draw connections
            canvasCtx.strokeStyle = "#FFFFFF";
            canvasCtx.lineWidth = 2;
            connections.forEach(([start, end]) => {
              canvasCtx.beginPath();
              canvasCtx.moveTo(
                handLandmarks[start].x * canvasRef.current.width,
                handLandmarks[start].y * canvasRef.current.height
              );
              canvasCtx.lineTo(
                handLandmarks[end].x * canvasRef.current.width,
                handLandmarks[end].y * canvasRef.current.height
              );
              canvasCtx.stroke();
            });

            // Draw landmarks
            canvasCtx.fillStyle = "#FFFFFF";
            handLandmarks.forEach((point) => {
              canvasCtx.beginPath();
              canvasCtx.arc(
                point.x * canvasRef.current.width,
                point.y * canvasRef.current.height,
                3,
                0,
                2 * Math.PI
              );
              canvasCtx.fill();
            });
          });
        }

        // Special case: Both hands detected = "BYE BYE"
        if (hasBothHands) {
          setPrediction(null);
          setPredictionLabel("BYE BYE");
          // Clear buffers when showing bye bye
          predictionBufferRef.current = [];
          sequenceBufferRef.current = [];
          setError("");
        }
        // Only process single hand gestures for prediction
        else if (hasHand && detectedHandCount === 1) {
          // Extract landmarks (21 points × 3 coords = 63 values)
          const landmarks = results.multiHandLandmarks[0];
          const flatLandmarks = [];

          for (const point of landmarks) {
            flatLandmarks.push(point.x, point.y, point.z);
          }

          // Predict based on mode (matches Python: predicts every frame when hand detected)
          // Use current mode from ref (always up-to-date)
          const currentMode = modeRef.current;
          if (currentMode === "alphabet") {
            predictAlphabet(flatLandmarks);
          } else {
            predictWord(flatLandmarks);
          }
        } else {
          // No hand detected - clear predictions and buffers
          const currentMode = modeRef.current;
          if (currentMode === "word") {
            sequenceBufferRef.current = [];
          }
          // Clear prediction buffer when no hand (like Python - buffer only accumulates when hand is present)
          predictionBufferRef.current = [];
          setPrediction(null);
          setPredictionLabel("");
          setError("");
        }
        canvasCtx.restore();
      }
    });

    handsRef.current = hands;

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current && handsRef.current) {
          await handsRef.current.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });

    cameraRef.current = camera;
  }, []); // No dependencies - initialize once, use refs for dynamic values

  // Update displayed prediction from buffer
  const updatePredictionFromBuffer = () => {
    if (predictionBufferRef.current.length === 0) {
      setPredictionLabel("");
      return;
    }

    // Get most common prediction (like Python: Counter(prediction_buffer).most_common(1)[0][0])
    const counts = {};
    predictionBufferRef.current.forEach((label) => {
      counts[label] = (counts[label] || 0) + 1;
    });

    // Find most common
    let mostCommonLabel = "";
    let maxCount = 0;
    Object.entries(counts).forEach(([label, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonLabel = label;
      }
    });

    if (mostCommonLabel) {
      setPredictionLabel(mostCommonLabel);
      // Convert label to prediction number (A=0, B=1, ..., Z=25)
      setPrediction(mostCommonLabel.charCodeAt(0) - 65);
    }
  };

  // Predict alphabet with buffering to prevent flickering (matches Python exactly)
  const predictAlphabet = async (landmarks) => {
    // Throttle API calls (but still allow frequent predictions)
    const now = Date.now();
    const shouldPredict =
      now - lastPredictionTimeRef.current >= PREDICTION_THROTTLE_MS;

    // Always update display from buffer (like Python shows most common every frame)
    updatePredictionFromBuffer();

    if (!shouldPredict) {
      return; // Skip API call if too soon
    }

    if (isLoading) return;

    // Don't await - fire and forget, update buffer when response comes
    lastPredictionTimeRef.current = now;

    // Use the simple test API endpoint (working version)
    const { getApiUrl } = await import('./utils/apiConfig');
    fetch(getApiUrl('/predict/alphabet'), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(landmarks), // Send landmarks array directly
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((errorText) => {
            throw new Error(`API error: ${response.status} - ${errorText}`);
          });
        }
        return response.json();
      })
      .then((data) => {
        // Simple API returns: {prediction, label, confidence}
        const predictedLabel = data.label || String(data.prediction);

        // Add to buffer (like Python: prediction_buffer.append(predicted))
        // deque automatically limits to maxlen=15
        predictionBufferRef.current.push(predictedLabel);

        // Keep buffer size limited to BUFFER_SIZE (deque maxlen behavior - automatically limits)
        if (predictionBufferRef.current.length > BUFFER_SIZE) {
          predictionBufferRef.current = predictionBufferRef.current.slice(
            -BUFFER_SIZE
          );
        }

        // Update displayed prediction from buffer (like Python: displays most common)
        updatePredictionFromBuffer();
      })
      .catch((err) => {
        console.error("Prediction error:", err);
        setError(err.message || "Prediction failed");
      });
  };

  const predictWord = async (landmarks) => {
    // Add to buffer (like Python: sequence.append(landmarks))
    sequenceBufferRef.current.push(...landmarks);

    // Keep only last 30 frames (like Python deque maxlen behavior)
    if (sequenceBufferRef.current.length > SEQUENCE_LENGTH * 63) {
      sequenceBufferRef.current = sequenceBufferRef.current.slice(
        -SEQUENCE_LENGTH * 63
      );
    }

    // Predict when buffer has enough frames (at least 30 frames)
    // Use >= instead of === to allow rolling window predictions
    const now = Date.now();
    const hasEnoughFrames =
      sequenceBufferRef.current.length >= SEQUENCE_LENGTH * 63;
    const canPredict = !isLoading && hasEnoughFrames;
    const throttled =
      now - lastPredictionTimeRef.current >= PREDICTION_THROTTLE_MS * 5; // Slower for word mode

    if (canPredict && throttled) {
      try {
        setIsLoading(true);
        setError("");
        lastPredictionTimeRef.current = now;

        // Get exactly 30 frames for prediction (last 1890 values)
        const bufferForPrediction = sequenceBufferRef.current.slice(
          -SEQUENCE_LENGTH * 63
        );

        console.log(
          `🔤 Word prediction: Buffer size ${sequenceBufferRef.current.length}, sending ${bufferForPrediction.length} values`
        );

        // Use the simple test API endpoint (working version)
        const { getApiUrl } = await import('./utils/apiConfig');
        const response = await fetch(getApiUrl('/predict/word'), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bufferForPrediction), // Send exactly 1890 values (30 frames × 63)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`✅ Word prediction result:`, data);

        // Simple API returns: {prediction, label, confidence}
        setPrediction(data.prediction);
        setPredictionLabel(data.label || String(data.prediction));

        // Don't clear buffer - keep rolling window for continuous predictions
      } catch (err) {
        console.error("❌ Word prediction error:", err);
        setError(err.message || "Word prediction failed");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleStartCamera = async () => {
    if (!videoRef.current || !handsRef.current) {
      await initializeMediaPipe();
    }

    if (cameraRef.current && videoRef.current) {
      cameraRef.current.start();
      setIsCameraOn(true);
    }
  };

  const handleStopCamera = () => {
    try {
      if (cameraRef.current) {
        cameraRef.current.stop();
        setIsCameraOn(false);
        // Clear buffers when stopping
        predictionBufferRef.current = [];
        sequenceBufferRef.current = [];
        setPrediction(null);
        setPredictionLabel("");
        setError("");
      }
    } catch (error) {
      console.error("Error stopping camera:", error);
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setPrediction(null);
    setPredictionLabel("");
    predictionBufferRef.current = [];
    sequenceBufferRef.current = [];
  };

  const [showVideoCall, setShowVideoCall] = useState(false);
  const [remoteTranscription, setRemoteTranscription] = useState("");

  const handleRemoteTranscription = (text) => {
    setRemoteTranscription(text);
  };

  return (
    <div className="asl-recognition-page">
      <div className="asl-container">
        <div className="header-section">
          <h1 className="asl-title">ASL Recognition</h1>
          <button
            onClick={() => setShowVideoCall(!showVideoCall)}
            className="video-call-toggle-btn"
          >
            {showVideoCall ? "Hide Video Call" : "Start Video Call"}
          </button>
        </div>

        {showVideoCall && (
          <div className="video-call-section">
            <VideoCall onRemoteTranscription={handleRemoteTranscription} />
          </div>
        )}

        {remoteTranscription && (
          <div className="remote-transcription-display">
            <h3>Remote Participant Speech:</h3>
            <p>{remoteTranscription}</p>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="asl-mode-toggle">
          <button
            className={`mode-btn ${mode === "alphabet" ? "active" : ""}`}
            onClick={() => handleModeChange("alphabet")}
            disabled={isLoading}
          >
            Alphabet (A-Z)
          </button>
          <button
            className={`mode-btn ${mode === "word" ? "active" : ""}`}
            onClick={() => handleModeChange("word")}
            disabled={isLoading}
          >
            Word Recognition
          </button>
        </div>

        {/* Camera Controls */}
        <div className="asl-controls">
          <button
            className="control-btn start"
            onClick={handleStartCamera}
            disabled={isCameraOn}
          >
            Start Camera
          </button>
          <button
            className="control-btn stop"
            onClick={handleStopCamera}
            disabled={!isCameraOn}
          >
            Stop Camera
          </button>
        </div>

        {/* Video Feed */}
        <div className="asl-video-container">
          <video
            ref={videoRef}
            className="asl-video"
            autoPlay
            playsInline
            style={{ display: "none" }}
          />
          <canvas
            ref={canvasRef}
            className="asl-canvas"
            width={640}
            height={480}
          />
        </div>

        {/* Status */}
        <div className="asl-status">
          <span
            className={`status-indicator ${
              handDetected ? "detected" : "not-detected"
            }`}
          >
            {handDetected
              ? `✓ ${handCount === 2 ? "Both Hands" : "Hand"} Detected`
              : "✗ No Hand"}
          </span>
          {mode === "word" && (
            <span className="buffer-status">
              Buffer:{" "}
              {Math.floor((sequenceBufferRef.current?.length || 0) / 63)}/
              {SEQUENCE_LENGTH}
            </span>
          )}
        </div>

        {/* Prediction Display */}
        <div className="asl-prediction-container">
          <h2 className="prediction-title">Prediction</h2>
          {error ? (
            <div className="prediction-error">Error: {error}</div>
          ) : isLoading ? (
            <div className="prediction-loading">Processing...</div>
          ) : predictionLabel ? (
            <div className="prediction-result">
              <div className="prediction-label">{predictionLabel}</div>
              {prediction !== null && predictionLabel !== "BYE BYE" && (
                <div className="prediction-index">Class: {prediction}</div>
              )}
            </div>
          ) : (
            <div className="prediction-placeholder">
              {handDetected
                ? mode === "word"
                  ? `Show word gesture (HELLO, YES, NO, SORRY, THANKYOU)... Buffer: ${Math.floor(
                      (sequenceBufferRef.current?.length || 0) / 63
                    )}/${SEQUENCE_LENGTH}`
                  : "Show hand gesture (A-Z)..."
                : "No hand detected"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ASLRecognition;
