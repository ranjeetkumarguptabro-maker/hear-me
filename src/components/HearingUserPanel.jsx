import React from "react";
import VideoFrame from "./VideoFrame";
import SpeechToText from "./SpeechToText";

const MessageSquareTextIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" fill={color} />
  </svg>
);

const HearingUserPanel = ({
  rightVideoRef,
  isRightVideoOn,
  handleToggleRightVideo,
  isMicOn,
  handleToggleMic,
  isListening,
  showTranscription,
  setShowTranscription,
  liveTranscription,
  speechError,
}) => {
  return (
    <div className="glass-card-glow animate-fade-in" style={{ animationDelay: "0.1s" }}>
      {/* Header */}
      <div className="panel-header">
        <div className="pill-badge glow-accent">
          <span className="pill-badge-dot bg-accent animate-pulse-soft"></span>
          <span className="text-accent">Hearing Section</span>
        </div>
        {isListening && (
          <div className="pill-badge glow-danger">
            <span className="pill-badge-dot bg-red-500 animate-pulse-soft"></span>
            <span className="text-red-400">Live 🔴</span>
          </div>
        )}
      </div>

      {/* Video Section */}
      <div className="panel-video-section">
        <VideoFrame
          videoRef={rightVideoRef}
          canvasRef={null}
          isCameraOn={isRightVideoOn}
          isMicOn={isMicOn}
          onToggleCamera={handleToggleRightVideo}
          onToggleMic={handleToggleMic}
          isLive={isListening}
        />
      </div>

      {/* Speech to Text */}
      <div className="panel-content-section">
        <h3 className="panel-section-title">Speech Recognition</h3>
        {speechError && (
          <div style={{
            padding: "0.75rem",
            marginBottom: "0.75rem",
            borderRadius: "0.5rem",
            background: "hsla(0, 70%, 50%, 0.2)",
            border: "1px solid hsla(0, 70%, 60%, 0.5)",
            color: "hsl(0, 70%, 75%)",
            fontSize: "0.875rem"
          }}>
            ⚠️ {speechError}
          </div>
        )}
        <SpeechToText
          showTranscription={showTranscription}
          setShowTranscription={setShowTranscription}
          liveTranscription={liveTranscription}
          isListening={isListening}
        />
      </div>

      {/* Input Bar */}
      <div className="panel-footer-section">
        <h3 className="panel-section-title">Transcription Output</h3>
        <div className="input-bar">
          <MessageSquareTextIcon size={20} color="currentColor" />
          <input
            type="text"
            placeholder="Live transcription output..."
            className="input-bar-input"
            value={liveTranscription}
            readOnly
          />
          <div className="input-bar-indicator">
            <span className="input-bar-dot" style={{ animationDelay: "0s" }}></span>
            <span className="input-bar-dot" style={{ animationDelay: "0.15s" }}></span>
            <span className="input-bar-dot" style={{ animationDelay: "0.3s" }}></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HearingUserPanel;

