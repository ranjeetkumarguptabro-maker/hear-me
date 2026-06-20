import React from "react";

const ModeToggle = ({ mode, onModeChange }) => {
  const styles = {
    container: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      padding: "4px 8px",
      fontFamily: "'Inter', sans-serif",
    },
    label: {
      color: "#4b5563",
      fontWeight: 600,
      fontSize: "13px",
      paddingLeft: "8px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    toggleContainer: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.04)",
      borderRadius: "100px",
      padding: "4px",
      border: "1px solid rgba(0, 0, 0, 0.05)",
    },
    slider: {
      position: "absolute",
      top: "4px",
      bottom: "4px",
      left: "4px",
      width: "calc(50% - 4px)",
      background: "#ffffff",
      borderRadius: "100px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
      transform: mode === "alphabet" ? "translateX(0)" : "translateX(calc(100% + 4px))",
    },
    button: {
      position: "relative",
      zIndex: 10,
      padding: "8px 20px",
      borderRadius: "100px",
      fontWeight: 700,
      fontSize: "12px",
      letterSpacing: "0.5px",
      transition: "all 0.3s ease",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      flex: 1,
      minWidth: "80px",
    },
    buttonActive: {
      color: "#8B2FF8",
    },
    buttonInactive: {
      color: "#9ca3af",
    },
  };

  return (
    <div style={styles.container}>
      {/* Left Label */}
      <span style={styles.label}>Mode</span>

      {/* Toggle Container */}
      <div style={styles.toggleContainer}>
        {/* Slider Indicator */}
        <div style={styles.slider} />

        {/* Toggle Buttons */}
        <button
          onClick={() => onModeChange("alphabet")}
          style={{
            ...styles.button,
            ...(mode === "alphabet" ? styles.buttonActive : styles.buttonInactive),
          }}
        >
          ALPHABET
        </button>
        <button
          onClick={() => onModeChange("word")}
          style={{
            ...styles.button,
            ...(mode === "word" ? styles.buttonActive : styles.buttonInactive),
          }}
        >
          WORD
        </button>
      </div>
    </div>
  );
};

export default ModeToggle;

