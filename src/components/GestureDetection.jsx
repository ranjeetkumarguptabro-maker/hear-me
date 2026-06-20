import React from "react";

const HandIcon = ({ size = 40, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z"
      fill={color}
    />
  </svg>
);

const GestureDetection = ({
  showLandmarks,
  setShowLandmarks,
  handDetected,
  detectedGesture,
  isModelLoading,
  aslMode,
  setAslMode,
  aslPrediction,
  aslLabel,
  isPredicting,
  aslError,
  sequenceBufferRef,
}) => {
  return (
    <div className="gesture-detection">
      {/* Toggle and Status Row */}
      <div className="gesture-detection-header">
        <div className="gesture-detection-toggle">
          <label className="switch">
            <input
              type="checkbox"
              checked={showLandmarks}
              onChange={(e) => setShowLandmarks(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
          <span className="gesture-detection-toggle-label">
            Show Hand Landmarks
          </span>
        </div>

        {/* Status Indicator */}
        <div
          className={`pill-badge ${
            handDetected ? "glow-success" : "glow-danger"
          }`}
        >
          <span
            className={`pill-badge-dot ${
              handDetected ? "bg-success" : "bg-danger"
            } animate-pulse-soft`}
          ></span>
          <span className={handDetected ? "text-success" : "text-danger"}>
            {isModelLoading
              ? "Loading..."
              : handDetected
              ? "Hand Detected"
              : "No Hand Detected"}
          </span>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="asl-mode-toggle">
        <label className="asl-mode-label">Mode:</label>
        <div className="asl-mode-buttons">
          <button
            className={`asl-mode-btn ${aslMode === "alphabet" ? "active" : ""}`}
            onClick={() => setAslMode("alphabet")}
            disabled={isPredicting}
            title="Recognize single letters (A-Z)"
          >
            Alphabet
          </button>
          <button
            className={`asl-mode-btn ${aslMode === "word" ? "active" : ""}`}
            onClick={() => setAslMode("word")}
            disabled={isPredicting}
            title="Recognize words (requires 30-frame sequence)"
          >
            Word
          </button>
        </div>
      </div>

      {/* Gesture Display (Old) */}
      <div className="gesture-detection-box">
        {showLandmarks && (
          <HandIcon
            size={40}
            className="gesture-detection-icon animate-pulse-soft"
          />
        )}
        <div className="gesture-detection-content">
          <p className="gesture-detection-label">Detected Gesture (Legacy)</p>
          <p className="gesture-detection-text">{detectedGesture || "—"}</p>
        </div>
      </div>

      {/* ASL Prediction Display */}
      <div className="asl-prediction-box">
        <div className="asl-prediction-header">
          <span className="asl-prediction-label">
            ASL Prediction ({aslMode} mode)
            {aslMode === "word" && sequenceBufferRef && (
              <span className="asl-buffer-status">
                {" "}
                • Buffer:{" "}
                {Math.floor((sequenceBufferRef.current?.length || 0) / 63)}/30
              </span>
            )}
          </span>
          {isPredicting && (
            <span className="asl-predicting-indicator">Processing...</span>
          )}
        </div>
        <div className="asl-prediction-content">
          {aslError ? (
            <div className="asl-error">
              <span className="asl-error-icon">⚠️</span>
              <span className="asl-error-text">{aslError}</span>
            </div>
          ) : aslPrediction !== null ? (
            <div className="asl-prediction-result">
              <p className="asl-prediction-value">
                {aslLabel || aslPrediction}
              </p>
              {aslLabel && aslLabel !== String(aslPrediction) && (
                <p className="asl-prediction-index">Class: {aslPrediction}</p>
              )}
            </div>
          ) : (
            <p className="asl-prediction-placeholder">
              {aslMode === "word"
                ? handDetected
                  ? `Show gesture sequence... (${
                      sequenceBufferRef
                        ? Math.floor(
                            (sequenceBufferRef.current?.length || 0) / 63
                          )
                        : 0
                    }/30 frames)`
                  : "No hand detected"
                : handDetected
                ? "Show hand gesture..."
                : "No hand detected"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GestureDetection;
