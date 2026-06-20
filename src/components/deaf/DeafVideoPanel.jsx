import React, { useState, useEffect, useRef } from "react";
import { MicIcon, CameraIcon, PhoneOffIcon } from "../Icons";

const DeafVideoPanel = ({
  participantName,
  isMuted,
  isCameraOn,
  onMuteToggle,
  onCameraToggle,
  localVideoRef,
  remoteParticipants = [],
  onEndCall = null,
}) => {
  // Create styles object that updates with state
  const getStyles = () => ({
    container: {
      position: "relative",
      width: "100%",
      height: "100%",
      backgroundColor: "transparent",
      borderRadius: "24px",
      overflow: "hidden",
      minHeight: "600px",
      fontFamily: "'Inter', sans-serif",
    },
    videoContainer: {
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "hidden",
    },
    placeholderVideo: {
      width: "100%",
      height: "100%",
      backgroundColor: "#f9fafb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderContent: {
      textAlign: "center",
      color: "#374151",
    },
    placeholderIcon: {
      fontSize: "64px",
      marginBottom: "16px",
    },
    placeholderText: {
      color: "#6b7280",
      fontSize: "16px",
      fontWeight: 500,
    },
    participantText: {
      color: "#9ca3af",
      fontSize: "14px",
      marginTop: "8px",
    },
    pipVideo: {
      position: "absolute",
      top: "24px",
      right: "24px",
      width: "240px",
      height: "160px",
      backgroundColor: "#f3f4f6",
      borderRadius: "20px",
      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
      border: "1px solid rgba(0, 0, 0, 0.05)",
      overflow: "hidden",
    },
    pipContent: {
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.02)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    pipIcon: {
      fontSize: "24px",
      marginBottom: "8px",
    },
    pipText: {
      fontSize: "12px",
      color: "#6b7280",
    },
    bottomOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      background: "linear-gradient(to top, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 100%)",
      padding: "16px",
      zIndex: 10,
      pointerEvents: "none",
    },
    overlayContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      pointerEvents: "auto",
    },
    leftSection: {
      display: "flex",
      alignItems: "center",
    },
    centerSection: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      position: "absolute",
      left: "50%",
      transform: "translateX(-50%)",
    },
    rightSection: {
      display: "flex",
      alignItems: "center",
    },
    nameBadge: {
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(12px)",
      padding: "8px 20px",
      borderRadius: "100px",
      border: "1px solid rgba(0, 0, 0, 0.05)",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
    },
    nameText: {
      color: "#111827",
      fontWeight: 600,
      fontSize: "14px",
    },
    controls: {
      display: "flex",
      gap: "12px",
    },
    controlButton: {
      padding: "12px",
      transition: "all 0.2s",
      cursor: "pointer",
      border: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    micButton: {
      backgroundColor: isMuted ? "#ef4444" : "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(0, 0, 0, 0.05)",
      borderRadius: "50%",
      width: "50px",
      height: "50px",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: isMuted ? "white" : "#374151",
    },
    cameraButton: {
      backgroundColor: !isCameraOn ? "#ef4444" : "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(0, 0, 0, 0.05)",
      borderRadius: "50%",
      width: "50px",
      height: "50px",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: !isCameraOn ? "white" : "#374151",
    },
    callEndButton: {
      backgroundColor: "#ef4444",
      color: "white",
      border: "none",
      borderRadius: "50%",
      width: "50px",
      height: "50px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      boxShadow: "0 4px 15px rgba(239, 68, 68, 0.2)",
      transition: "all 0.3s",
    },
  });

  const styles = getStyles();

  // PiP / Main view state
  const [mainView, setMainView] = useState("local"); // 'local' or 'remote'
  const prevHadRemoteRef = useRef(false);

  const hasRemote = remoteParticipants && remoteParticipants.length > 0;

  // Auto-switch behavior:
  // - When first remote joins → make remote main
  // - When all remote leave → revert to local main
  useEffect(() => {
    const hadRemoteBefore = prevHadRemoteRef.current;
    const hasRemoteNow = hasRemote;

    if (hasRemoteNow && !hadRemoteBefore) {
      // First time a remote participant appears → show them as main video
      setMainView("remote");
    }
    if (!hasRemoteNow) {
      // No remote participants → always show local as main
      setMainView("local");
    }

    prevHadRemoteRef.current = hasRemoteNow;
  }, [hasRemote]);

  const isLocalMain = !hasRemote || mainView === "local";

  // Shared base styles for main vs PiP video areas
  const mainVideoStyle = {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1,
    minHeight: "400px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const pipBaseStyle = {
    ...styles.pipVideo,
    zIndex: 5,
    cursor: "pointer",
  };

  const localContainerStyle = isLocalMain ? mainVideoStyle : pipBaseStyle;

  return (
    <div style={styles.container}>
      {/* Main Video Container */}
      <div style={styles.videoContainer}>
        {/* Local Video Container - Always present (can be main or PiP) */}
        <div 
          ref={localVideoRef} 
          id="local-video-container"
          style={{
            ...localContainerStyle,
          }}
          // Click on PiP local video → make local main
          onClick={() => {
            if (!isLocalMain && hasRemote) {
              setMainView("local");
            }
          }}
        />
        {/* Video element styling - applied via CSS */}
        <style>{`
          #local-video-container video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            object-position: center !important;
            transform: none !important;
          }
        `}</style>
        {/* Video element styling - applied via CSS class */}
        <style>{`
          ${localVideoRef.current ? `#${localVideoRef.current.id || ''}` : ''} video,
          ${localVideoRef.current ? `#${localVideoRef.current.id || ''}` : ''} > div > video,
          ${localVideoRef.current ? `#${localVideoRef.current.id || ''}` : ''} > video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            object-position: center !important;
            transform: none !important;
          }
        `}</style>
        {/* Placeholder when camera is off - only on main local video */}
        {!isCameraOn && isLocalMain && (
          <div style={{
            ...styles.placeholderVideo,
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 2, // Above video but below controls
            background: "linear-gradient(135deg, #0b0820 0%, #060214 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{...styles.placeholderContent, maxWidth: "300px"}}>
              <div style={{...styles.placeholderIcon, fontSize: "40px", marginBottom: "20px"}}>📽️</div>
              <p style={{...styles.placeholderText, color: "#fff", marginBottom: "12px", fontSize: "18px"}}>Camera Access Restricted</p>
              <p style={{...styles.participantText, color: "#b3adca", marginBottom: "24px", lineHeight: "1.5"}}>
                Please click the camera icon in your browser's address bar to allow access, then refresh the page.
              </p>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #8B2FF8 0%, #A85CFF 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "100px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(139, 47, 248, 0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "1px"
                }}
              >
                Retry Camera Access
              </button>
            </div>
          </div>
        )}

        {/* Remote Participant Video - can be main or PiP */}
        {hasRemote ? (
          remoteParticipants.slice(0, 1).map((participant, index) => {
            const participantId =
              participant.identifier?.communicationUserId ||
              participant.identifier?.rawId ||
              String(participant.identifier) ||
              `participant-${index}`;

            // Remote container is main when mainView === 'remote', otherwise PiP
            const remoteContainerStyle = mainView === "remote"
              ? mainVideoStyle
              : pipBaseStyle;

            return (
              <div
                key={participantId}
                data-participant-id={participantId}
                style={remoteContainerStyle}
                // Click on PiP remote video → make remote main
                onClick={() => {
                  if (mainView !== "remote") {
                    setMainView("remote");
                  }
                }}
              >
                <div
                  className="video-element"
                  data-participant-id={participantId}
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#000000",
                    objectFit: "cover",
                  }}
                ></div>
              </div>
            );
          })
        ) : (
          // No remote participant yet → show waiting PiP
          <div style={{...styles.pipVideo, zIndex: 5}}>
            <div style={styles.pipContent}>
              <div style={{ textAlign: "center", color: "white" }}>
                <div style={styles.pipIcon}>👤</div>
                <p style={styles.pipText}>Waiting for participant...</p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Overlay */}
        <div style={styles.bottomOverlay}>
          <div style={styles.overlayContent}>
            {/* Left Section - Participant Name */}
            <div style={styles.leftSection}>
              <div style={styles.nameBadge}>
                <span style={styles.nameText}>{participantName}</span>
              </div>
            </div>

            {/* Center Section - Mic and Camera (No Background) */}
            <div style={styles.centerSection}>
              {/* Mic Toggle */}
              <button
                onClick={onMuteToggle}
                disabled={false}
                style={{
                  ...styles.controlButton,
                  ...styles.micButton,
                  backgroundColor: isMuted ? "#ef4444" : "rgba(255, 255, 255, 0.9)",
                  cursor: "pointer",
                  pointerEvents: "auto",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = isMuted ? "#dc2626" : "#f3f4f6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = isMuted ? "#ef4444" : "rgba(255, 255, 255, 0.9)";
                  }
                }}
                title={isMuted ? "Unmute" : "Mute"}
              >
                <MicIcon muted={isMuted} size={20} color={isMuted ? "white" : "#374151"} />
              </button>

              {/* Camera Toggle */}
              <button
                onClick={onCameraToggle}
                disabled={false}
                style={{
                  ...styles.controlButton,
                  ...styles.cameraButton,
                  backgroundColor: !isCameraOn ? "#ef4444" : "rgba(255, 255, 255, 0.9)",
                  cursor: "pointer",
                  pointerEvents: "auto",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = !isCameraOn ? "#dc2626" : "#f3f4f6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = !isCameraOn ? "#ef4444" : "rgba(255, 255, 255, 0.9)";
                  }
                }}
                title={isCameraOn ? "Turn off camera" : "Turn on camera"}
              >
                <CameraIcon off={!isCameraOn} size={20} color={!isCameraOn ? "white" : "#374151"} />
              </button>
            </div>

            {/* Right Section - Call End Button */}
            <div style={styles.rightSection}>
              {onEndCall ? (
                <button
                  onClick={onEndCall}
                  style={styles.callEndButton}
                  title="End Call"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#dc2626";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ef4444";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeafVideoPanel;

