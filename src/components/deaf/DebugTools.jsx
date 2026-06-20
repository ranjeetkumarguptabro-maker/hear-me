import React from "react";

const DebugTools = ({
  showLandmarks,
  onToggleLandmarks,
  predictionLabel,
  handDetected,
  isPredicting,
  error, // Added error prop
}) => {
  const styles = {
    container: {
      position: "absolute",
      top: "16px",
      left: "16px",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(20px)",
      borderRadius: "16px",
      padding: "16px",
      zIndex: 100,
      fontFamily: "'Inter', sans-serif",
      minWidth: "220px",
      border: "1px solid rgba(0, 0, 0, 0.06)",
      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
    },
    title: {
      color: "#4b5563",
      fontSize: "11px",
      fontWeight: 800,
      marginBottom: "12px",
      textTransform: "uppercase",
      letterSpacing: "1.5px",
    },
    toggleRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "12px",
    },
    toggleLabel: {
      color: "#111827",
      fontSize: "12px",
      fontWeight: 600,
    },
    toggleSwitch: {
      position: "relative",
      width: "36px",
      height: "20px",
      backgroundColor: showLandmarks ? "#10b981" : "rgba(0, 0, 0, 0.1)",
      borderRadius: "9999px",
      transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
      cursor: "pointer",
      border: "1px solid transparent",
    },
    toggleSlider: {
      position: "absolute",
      top: "2px",
      left: showLandmarks ? "18px" : "2px",
      width: "14px",
      height: "14px",
      backgroundColor: "white",
      borderRadius: "50%",
      transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
    predictionRow: {
      marginTop: "12px",
      paddingTop: "12px",
      borderTop: "1px solid rgba(0, 0, 0, 0.05)",
    },
    predictionLabel: {
      color: "#9ca3af",
      fontSize: "10px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "1px",
      marginBottom: "6px",
    },
    predictionText: {
      color: "#10b981",
      fontSize: "16px",
      fontWeight: 800,
      fontFamily: "'Bricolage Grotesque', sans-serif",
    },
    statusText: {
      color: handDetected ? "#10b981" : "#ef4444",
      fontSize: "11px",
      fontWeight: 600,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.title}>System Diagnostics</div>
      
      <div style={styles.toggleRow}>
        <span style={styles.toggleLabel}>Live Tracking</span>
        <div style={styles.toggleSwitch} onClick={onToggleLandmarks}>
          <div style={styles.toggleSlider} />
        </div>
      </div>

      <div style={styles.predictionRow}>
        <div style={styles.predictionLabel}>Detected:</div>
        {predictionLabel ? (
          <div style={styles.predictionText}>{predictionLabel}</div>
        ) : isPredicting ? (
          <div style={{ ...styles.predictionText, color: "#A85CFF" }}>Analyzing...</div>
        ) : (
          <div style={{ ...styles.predictionText, color: "rgba(255, 255, 255, 0.3)" }}>—</div>
        )}
        
        <div style={{
          ...styles.statusText,
          marginTop: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{handDetected ? "✓ Hand Tracking" : "✗ No Hand"}</span>
          <span style={{ 
            width: "6px", 
            height: "6px", 
            borderRadius: "50%", 
            backgroundColor: handDetected ? "#10b981" : "#616161",
            boxShadow: handDetected ? "0 0 10px #10b981" : "none"
          }} />
        </div>

        {error && (
          <div style={{
            marginTop: "12px",
            padding: "8px 10px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderRadius: "8px",
            fontSize: "10px",
            color: "#ff8080",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            lineHeight: "1.5"
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugTools;




