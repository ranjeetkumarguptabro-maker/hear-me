import React, { useState } from "react";

// SVG Icons
const VideoIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 10L19.553 7.276C19.832 7.107 20.162 7 20.5 7C21.328 7 22 7.672 22 8.5V15.5C22 16.328 21.328 17 20.5 17C20.162 17 19.832 16.893 19.553 16.724L15 14V10Z" fill={color} />
    <rect x="2" y="5" width="13" height="14" rx="2" fill={color} />
  </svg>
);

const VideoOffIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 10L19.553 7.276C19.832 7.107 20.162 7 20.5 7C21.328 7 22 7.672 22 8.5V15.5C22 16.328 21.328 17 20.5 17C20.162 17 19.832 16.893 19.553 16.724L15 14V10Z" fill={color} />
    <rect x="2" y="5" width="13" height="14" rx="2" fill={color} />
    <line x1="2" y1="2" x2="22" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MicIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 14.5C13.3807 14.5 14.5 13.3807 14.5 12V6C14.5 4.61929 13.3807 3.5 12 3.5C10.6193 3.5 9.5 4.61929 9.5 6V12C9.5 13.3807 10.6193 14.5 12 14.5Z" fill={color} />
    <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10H6.5V12C6.5 15.0376 8.96243 17.5 12 17.5C15.0376 17.5 17.5 15.0376 17.5 12V10H19Z" fill={color} />
    <path d="M11 20.5H13V23H11V20.5Z" fill={color} />
  </svg>
);

const MicOffIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 14.5C13.3807 14.5 14.5 13.3807 14.5 12V6C14.5 4.61929 13.3807 3.5 12 3.5C10.6193 3.5 9.5 4.61929 9.5 6V12C9.5 13.3807 10.6193 14.5 12 14.5Z" fill={color} />
    <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10H6.5V12C6.5 15.0376 8.96243 17.5 12 17.5C15.0376 17.5 17.5 15.0376 17.5 12V10H19Z" fill={color} />
    <path d="M11 20.5H13V23H11V20.5Z" fill={color} />
    <line x1="4" y1="4" x2="20" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const VideoFrame = ({ 
  videoRef, 
  canvasRef, 
  isCameraOn, 
  isMicOn, 
  onToggleCamera, 
  onToggleMic, 
  isLive = false,
  showLandmarks = true 
}) => {
  return (
    <div className="video-frame">
      {/* Video background */}
      <div className="video-frame-bg">
        {isCameraOn ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video-frame-video"
            />
            {canvasRef && (
              <canvas
                ref={canvasRef}
                className="video-frame-canvas"
                style={{ display: showLandmarks ? "block" : "none" }}
              />
            )}
          </>
        ) : (
          <div className="video-frame-off">
            <VideoOffIcon size={64} color="rgba(255,255,255,0.4)" />
            <span className="video-frame-off-text">Camera Off</span>
          </div>
        )}
      </div>

      {/* Live indicator */}
      {isLive && (
        <div className="video-frame-live">
          <span className="video-frame-live-dot"></span>
          <span>Live</span>
        </div>
      )}

      {/* Glass control buttons */}
      <div className="video-frame-controls">
        {/* Camera Toggle Button */}
        <button
          onClick={onToggleCamera}
          className={`glass-control-btn ${isCameraOn ? "glass-control-active" : "glass-control-off"}`}
          title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
        >
          {isCameraOn ? (
            <VideoIcon size={20} color="currentColor" />
          ) : (
            <VideoOffIcon size={20} color="currentColor" />
          )}
        </button>

        {/* Mic Toggle Button */}
        <button
          onClick={onToggleMic}
          className={`glass-control-btn ${isMicOn ? "glass-control-mic-on" : "glass-control-off"}`}
          title={isMicOn ? "Mute Mic" : "Unmute Mic"}
        >
          {isMicOn ? (
            <MicIcon size={20} color="currentColor" />
          ) : (
            <MicOffIcon size={20} color="currentColor" />
          )}
        </button>
      </div>

      {/* Status labels */}
      <div className="video-frame-status">
        <div className={`glass-status-pill ${isCameraOn ? "glass-status-active" : "glass-status-off"}`}>
          <VideoIcon size={12} color="currentColor" />
          <span>{isCameraOn ? "Camera On" : "Camera Off"}</span>
        </div>

        <div className={`glass-status-pill ${isMicOn ? "glass-status-mic" : "glass-status-off"}`}>
          <MicIcon size={12} color="currentColor" />
          <span>{isMicOn ? "Mic On" : "Mic Off"}</span>
        </div>
      </div>
    </div>
  );
};

export default VideoFrame;

