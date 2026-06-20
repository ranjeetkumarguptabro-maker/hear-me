import React from "react";

/**
 * Message Bubble Component for Transcription
 * Displays messages in a chat-like interface with participant names
 */
const TranscriptionMessageBubble = ({ message, isPartial = false }) => {
  const styles = {
    messageContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      marginBottom: isPartial ? "8px" : "16px",
      animation: isPartial ? "none" : "slideIn 0.3s ease-out",
    },
    participantName: {
      fontSize: "12px",
      fontWeight: 600,
      color: "#6b7280",
      marginBottom: "4px",
      paddingLeft: "12px",
    },
    messageBubble: {
      maxWidth: "85%",
      padding: "12px 16px",
      borderRadius: "18px",
      backgroundColor: isPartial ? "#e5e7eb" : "#3b82f6",
      color: isPartial ? "#374151" : "#ffffff",
      fontSize: "14px",
      lineHeight: "1.5",
      wordWrap: "break-word",
      boxShadow: isPartial
        ? "0 1px 2px rgba(0, 0, 0, 0.05)"
        : "0 2px 8px rgba(59, 130, 246, 0.3)",
      position: "relative",
      fontFamily: "'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: "all 0.2s ease",
    },
    partialIndicator: {
      fontSize: "11px",
      color: "#9ca3af",
      marginTop: "4px",
      paddingLeft: "12px",
      fontStyle: "italic",
    },
    timestamp: {
      fontSize: "10px",
      color: "#9ca3af",
      marginTop: "2px",
      paddingLeft: "12px",
    },
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Debug log to check if participantName is present
  if (!message.participantName) {
    console.warn("⚠️ Message without participantName:", message);
  }

  return (
    <div style={styles.messageContainer}>
      <div style={styles.participantName}>{message.participantName || "Participant"}</div>
      <div style={styles.messageBubble}>{message.text}</div>
      {isPartial && <div style={styles.partialIndicator}>Speaking...</div>}
      {!isPartial && message.timestamp && (
        <div style={styles.timestamp}>{formatTime(message.timestamp)}</div>
      )}

      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default TranscriptionMessageBubble;

