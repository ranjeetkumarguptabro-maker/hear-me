import React from "react";

const MessageSquareIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" fill={color} />
  </svg>
);

const SpeechToText = ({ 
  showTranscription, 
  setShowTranscription, 
  liveTranscription,
  isListening 
}) => {
  return (
    <div className="speech-to-text">
      {/* Toggle */}
      <div className="speech-to-text-toggle">
        <label className="switch">
          <input
            type="checkbox"
            checked={showTranscription}
            onChange={(e) => setShowTranscription(e.target.checked)}
          />
          <span className="slider slider-accent"></span>
        </label>
        <span className="speech-to-text-toggle-label">Show Speech-to-Text</span>
      </div>

      {/* Transcription Display */}
      {showTranscription && (
        <div className="transcription-box">
          <div className="transcription-box-header">
            <MessageSquareIcon size={16} color="currentColor" />
            <span className="transcription-box-label">Live Subtitles</span>
          </div>

          <div className="transcription-box-content">
            {liveTranscription ? (
              <p className="transcription-text">{liveTranscription}</p>
            ) : (
              <p className="transcription-placeholder">
                {isListening ? "Listening... Speak now" : "Click the microphone button to start"}
              </p>
            )}
          </div>

          {/* Typing indicator */}
          {!liveTranscription && isListening && (
            <div className="transcription-indicator">
              <div className="transcription-dots">
                <span className="transcription-dot" style={{ animationDelay: "0s" }}></span>
                <span className="transcription-dot" style={{ animationDelay: "0.2s" }}></span>
                <span className="transcription-dot" style={{ animationDelay: "0.4s" }}></span>
              </div>
              <span className="transcription-indicator-text">Listening...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpeechToText;

