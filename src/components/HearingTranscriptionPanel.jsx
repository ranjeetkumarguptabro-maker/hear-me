import React, { useState, useRef, useEffect } from "react";
import TranscriptionMessageBubble from "./TranscriptionMessageBubble";

/**
 * Transcription Panel for Hearing Participant
 * Shows what Azure is transcribing in real-time (for debugging/verification)
 */
const HearingTranscriptionPanel = ({ 
  transcriptionText = "",
  transcriptionMessages = [],
  isEnabled = true, 
  onToggle,
  error = null 
}) => {
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptionMessages]);
  const styles = {
    container: {
      position: "fixed",
      bottom: "80px",
      right: "20px",
      width: "350px",
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
      zIndex: 1000,
      fontFamily: "'Bricolage Grotesque', sans-serif",
      overflow: "hidden",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px",
      backgroundColor: "#1a1a1a",
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    },
    title: {
      color: "white",
      fontSize: "14px",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    indicator: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      backgroundColor: isEnabled ? "#10b981" : "#6b7280",
      animation: isEnabled ? "pulse 2s ease-in-out infinite" : "none",
    },
    toggle: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    toggleLabel: {
      color: "#9ca3af",
      fontSize: "12px",
    },
    switch: {
      position: "relative",
      width: "40px",
      height: "22px",
      backgroundColor: isEnabled ? "#10b981" : "#374151",
      borderRadius: "11px",
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
    switchKnob: {
      position: "absolute",
      top: "2px",
      left: isEnabled ? "20px" : "2px",
      width: "18px",
      height: "18px",
      backgroundColor: "white",
      borderRadius: "50%",
      transition: "left 0.2s",
    },
    content: {
      padding: "16px",
      height: "200px",
      minHeight: "200px",
      maxHeight: "200px",
      overflowY: "auto",
      overflowX: "hidden",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    text: {
      color: "white",
      fontSize: "13px",
      lineHeight: "1.6",
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
    },
    placeholder: {
      color: "#6b7280",
      fontSize: "13px",
      fontStyle: "italic",
    },
    error: {
      color: "#ef4444",
      fontSize: "12px",
      padding: "12px 16px",
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderTop: "1px solid rgba(239, 68, 68, 0.3)",
    },
    status: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 16px",
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      borderTop: "1px solid rgba(16, 185, 129, 0.3)",
      fontSize: "12px",
      color: "#10b981",
    },
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          /* Custom scrollbar for hearing transcription panel */
          .hearing-transcription-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .hearing-transcription-scroll::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
          }
          .hearing-transcription-scroll::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
          }
          .hearing-transcription-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
          }
        `}
      </style>
      
      <div style={styles.header}>
        <div style={styles.title}>
          <div style={styles.indicator}></div>
          <span>🎤 My Transcription</span>
        </div>
        <div style={styles.toggle}>
          <span style={styles.toggleLabel}>Show</span>
          <div style={styles.switch} onClick={onToggle}>
            <div style={styles.switchKnob}></div>
          </div>
        </div>
      </div>

      {isEnabled && (
        <>
          <div 
            className="hearing-transcription-scroll"
            style={styles.content}
          >
            {transcriptionMessages.length > 0 ? (
              <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}>
                {transcriptionMessages.map((msg, index) => (
                  <TranscriptionMessageBubble
                    key={`${msg.timestamp}-${index}`}
                    message={msg}
                    isPartial={msg.type === "partial"}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div style={styles.placeholder}>
                Speak to see your transcription here...
              </div>
            )}
          </div>

          {error && (
            <div style={styles.error}>
              ⚠️ {error}
            </div>
          )}

          {!error && isEnabled && (
            <div style={styles.status}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="6" cy="6" r="5" stroke="#10b981" strokeWidth="2" />
                <circle cx="6" cy="6" r="2" fill="#10b981" />
              </svg>
              <span>Transcription active - your voice is being sent to deaf participant</span>
            </div>
          )}
        </>
      )}

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
    </div>
  );
};

export default HearingTranscriptionPanel;

