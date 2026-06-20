import React from "react";
import VideoFrame from "./VideoFrame";
import GestureDetection from "./GestureDetection";
import AudioBar from "./AudioBar";

const DeafUserPanel = ({
  leftVideoRef,
  canvasRef,
  isLeftVideoOn,
  handleToggleLeftVideo,
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
    <div className="glass-card-glow animate-fade-in">
      {/* Header */}
      <div className="panel-header">
        <div className="pill-badge glow-primary">
          <span className="pill-badge-dot bg-primary animate-pulse-soft"></span>
          <span className="text-primary-foreground">You</span>
        </div>
      </div>

      {/* Video Section */}
      <div className="panel-video-section">
        <VideoFrame
          videoRef={leftVideoRef}
          canvasRef={canvasRef}
          isCameraOn={isLeftVideoOn}
          isMicOn={false}
          onToggleCamera={handleToggleLeftVideo}
          onToggleMic={() => {}}
          showLandmarks={showLandmarks}
        />
      </div>

      {/* Gesture Detection */}
      <div className="panel-content-section">
        <h3 className="panel-section-title">Hand Gesture Detection</h3>
        <GestureDetection
          showLandmarks={showLandmarks}
          setShowLandmarks={setShowLandmarks}
          handDetected={handDetected}
          detectedGesture={detectedGesture}
          isModelLoading={isModelLoading}
          aslMode={aslMode}
          setAslMode={setAslMode}
          aslPrediction={aslPrediction}
          aslLabel={aslLabel}
          isPredicting={isPredicting}
          aslError={aslError}
          sequenceBufferRef={sequenceBufferRef}
        />
      </div>

      {/* Audio Bar */}
      <div className="panel-footer-section">
        <h3 className="panel-section-title">Audio Output</h3>
        <AudioBar />
      </div>
    </div>
  );
};

export default DeafUserPanel;
