import React from "react";

const MainVideoArea = ({
  videoRef,
  canvasRef,
  participantName,
  isVideoOn,
  isMicOn,
  onToggleVideo,
  onToggleMic,
  onScreenShare,
  onRaiseHand,
  onEndCall,
}) => {
  return (
    <div className="main-video-area">
      <div className="main-video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="main-video-element"
        />
        {canvasRef && <canvas ref={canvasRef} className="main-video-canvas" />}

        {!isVideoOn && (
          <div className="video-off-overlay">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M16 16l1.5-1.5m0 0L21 10.5m-3.5 3.5L13.5 13m3 3L12 21.5" />
              <path d="M8 8l-1.5 1.5m0 0L3 13.5m3.5-3.5L10.5 11m-3-3L12 2.5" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
        )}

        {/* User Name Label */}
        <div className="video-user-label">
          <div className="user-avatar-small"></div>
          <span>{participantName}</span>
        </div>

        {/* Bottom Center: Record and Thumbs Up */}
        <div className="video-bottom-center-reactions">
          <button className="reaction-btn record-btn" title="Record">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="#FF4444"
              stroke="#FF4444"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
          </button>
          <button className="reaction-btn thumbs-up-btn" title="Thumbs Up">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="#FFD700"
              stroke="#FFD700"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 22V11M2 13v2c0 3.3 2.7 6 6 6h1M22 9h-4a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h4v-5zM15 9V7a2 2 0 0 0-2-2h-1M9 9H7a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h2" />
            </svg>
          </button>
        </div>

        {/* Reaction Buttons (Right Side) */}
        <div className="video-reactions">
          <button className="reaction-btn" title="Star">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
          <button className="reaction-btn" title="Heart">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button className="reaction-btn" title="Wave">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 11v-1a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v1" />
              <path d="M14 10V9a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v1" />
              <path d="M10 9.5V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v7" />
              <path d="M18 11a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0zM14 11a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0zM10 10.5a2 2 0 1 1-4 0v-6a2 2 0 1 1 4 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="video-control-bar">
        <button
          className={`control-icon-btn ${isMicOn ? "active" : ""}`}
          onClick={onToggleMic}
          title={isMicOn ? "Mute" : "Unmute"}
        >
          {isMicOn ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>

        <button
          className={`control-icon-btn ${isVideoOn ? "active" : ""}`}
          onClick={onToggleVideo}
          title={isVideoOn ? "Turn off camera" : "Turn on camera"}
        >
          {isVideoOn ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M16 16l1.5-1.5m0 0L21 10.5m-3.5 3.5L13.5 13m3 3L12 21.5" />
              <path d="M8 8l-1.5 1.5m0 0L3 13.5m3.5-3.5L10.5 11m-3-3L12 2.5" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          )}
        </button>

        <button
          className="control-icon-btn"
          onClick={onScreenShare}
          title="Share screen"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </button>

        <button
          className="control-icon-btn"
          onClick={onRaiseHand}
          title="Raise hand"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 11v-1a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v1" />
            <path d="M14 10V9a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v1" />
            <path d="M10 9.5V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v7" />
            <path d="M18 11a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0zM14 11a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0zM10 10.5a2 2 0 1 1-4 0v-6a2 2 0 1 1 4 0z" />
            <path d="M5 22l14-4" />
          </svg>
        </button>

        <button
          className={`control-icon-btn ${!isMicOn ? "muted" : ""}`}
          onClick={onToggleMic}
          title="Mute/Unmute"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
          </svg>
        </button>

        <button className="control-icon-btn chat-btn" title="Chat (3)">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="notification-badge">3</span>
        </button>

        <button
          className="control-icon-btn participants-btn"
          title="Participants"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>

        <button className="control-icon-btn more-btn" title="More options">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MainVideoArea;
