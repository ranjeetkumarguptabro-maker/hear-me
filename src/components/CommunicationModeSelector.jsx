import React from "react";

/**
 * Communication Mode Selector - Entry Screen
 * Shows before any services are initialized
 * User must select a mode before camera/mic/Azure services start
 */
const CommunicationModeSelector = ({ onSelectMode }) => {
  return (
    <div className="communication-mode-selector">
      <div className="mode-selector-header">
        <h2 className="mode-selector-title">Choose Communication Mode</h2>
        <p className="mode-selector-subtitle">
          Select how you want to communicate
        </p>
      </div>

      <div className="mode-options-grid">
        {/* Option 1: Video Call */}
        <button
          className="mode-option-card"
          onClick={() => onSelectMode("video-call")}
        >
          <div className="mode-option-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <h3 className="mode-option-title">Enter Video Call</h3>
          <p className="mode-option-description">
            Azure WebRTC video calling with camera and microphone
          </p>
          <div className="mode-option-features">
            <span className="feature-tag">Camera</span>
            <span className="feature-tag">Microphone</span>
            <span className="feature-tag">Real-time</span>
          </div>
        </button>

        {/* Option 2: Communication Assistant */}
        <button
          className="mode-option-card"
          onClick={() => onSelectMode("assistant")}
        >
          <div className="mode-option-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <h3 className="mode-option-title">Communication Assistant</h3>
          <p className="mode-option-description">
            Azure Speech-to-Text with voice input and sign language output
          </p>
          <div className="mode-option-features">
            <span className="feature-tag">Voice Input</span>
            <span className="feature-tag">Transcription</span>
            <span className="feature-tag">Sign Language</span>
          </div>
        </button>

        {/* Option 3: Text / Gesture Mode */}
        <button
          className="mode-option-card"
          onClick={() => onSelectMode("gesture")}
        >
          <div className="mode-option-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11v-1a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v1" />
              <path d="M14 10V9a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v1" />
              <path d="M10 9.5V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v7" />
              <path d="M18 11a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0zM14 11a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0zM10 10.5a2 2 0 1 1-4 0v-6a2 2 0 1 1 4 0z" />
            </svg>
          </div>
          <h3 className="mode-option-title">Text / Gesture Mode</h3>
          <p className="mode-option-description">
            Hand gesture detection with text output. No audio or video call.
          </p>
          <div className="mode-option-features">
            <span className="feature-tag">Hand Tracking</span>
            <span className="feature-tag">ASL Recognition</span>
            <span className="feature-tag">Text Output</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default CommunicationModeSelector;

