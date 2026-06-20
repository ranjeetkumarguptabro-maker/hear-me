import React from "react";

const GestureRecognitionToggle = ({ enabled, onToggle }) => {
  const styles = {
    container: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      padding: "4px 8px",
      fontFamily: "'Inter', sans-serif",
      cursor: "pointer",
      transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
    },
    label: {
      color: "#4b5563",
      fontWeight: 600,
      fontSize: "13px",
      userSelect: "none",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    toggleSwitch: {
      position: "relative",
      width: "48px",
      height: "26px",
      backgroundColor: enabled ? "#A85CFF" : "rgba(0, 0, 0, 0.1)",
      borderRadius: "100px",
      transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
      cursor: "pointer",
      border: "1px solid transparent",
    },
    toggleSlider: {
      position: "absolute",
      top: "2px",
      left: enabled ? "22px" : "2px",
      width: "20px",
      height: "20px",
      backgroundColor: "white",
      borderRadius: "50%",
      transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.15)",
    },
  };

  return (
    <div style={styles.container} onClick={onToggle}>
      <span style={styles.label}>Gesture Recognition</span>
      <div style={styles.toggleSwitch}>
        <div style={styles.toggleSlider} />
      </div>
    </div>
  );
};

export default GestureRecognitionToggle;




