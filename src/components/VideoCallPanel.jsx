import React from "react";

const VideoCallPanel = ({
  videoRef,
  canvasRef,
  participantName,
  isLocal = false,
  onToggleMic,
  onToggleVideo,
  onEndCall,
  isMicOn = true,
  isVideoOn = true,
}) => {
  return (
    <div className={`video-panel ${isLocal ? "main-video" : "side-video"}`}>
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="video-element"
          style={isLocal && canvasRef ? { display: "none" } : {}}
        />
        {canvasRef && isLocal && (
          <canvas
            ref={canvasRef}
            className="video-canvas-overlay"
          />
        )}
        {!isVideoOn && (
          <div className="video-off-overlay">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 16l1.5-1.5m0 0L21 10.5m-3.5 3.5L13.5 13m3 3L12 21.5" />
              <path d="M8 8l-1.5 1.5m0 0L3 13.5m3.5-3.5L10.5 11m-3-3L12 2.5" />
            </svg>
          </div>
        )}
        <div className="video-label">{participantName}</div>
      </div>

      {isLocal && (
        <>
          {/* Video Controls */}
          <div className="video-controls">
            <button
              className={`control-btn ${isMicOn ? "active" : ""}`}
              onClick={onToggleMic}
            >
              {isMicOn ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>

            <button
              className={`control-btn ${isVideoOn ? "active" : ""}`}
              onClick={onToggleVideo}
            >
              {isVideoOn ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 16l1.5-1.5m0 0L21 10.5m-3.5 3.5L13.5 13m3 3L12 21.5" />
                  <path d="M8 8l-1.5 1.5m0 0L3 13.5m3.5-3.5L10.5 11m-3-3L12 2.5" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              )}
            </button>

            <button className="control-btn end-call" onClick={onEndCall}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.71 16.29l-3.4-3.39 3.4-3.29a1 1 0 1 0-1.42-1.42L18 11.29l-3.29-3.4a1 1 0 1 0-1.42 1.42l3.29 3.4-3.4 3.29a1 1 0 0 0 0 1.42 1 1 0 0 0 1.42 0l3.39-3.4 3.4 3.4a1 1 0 0 0 1.42 0 1 1 0 0 0 .11-1.42z" />
              </svg>
            </button>
          </div>

          {/* Reaction Icons */}
          <div className="reaction-icons">
            <button className="reaction-btn">
              <span>👍</span>
            </button>
            <button className="reaction-btn">
              <span>❤️</span>
            </button>
            <button className="reaction-btn">
              <span>👏</span>
            </button>
            <button className="reaction-btn">
              <span>😮</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VideoCallPanel;

