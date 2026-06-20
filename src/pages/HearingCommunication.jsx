import React, { useState, useRef, useEffect } from "react";
import DeafVideoPanel from "../components/deaf/DeafVideoPanel";
import HearingFeaturePanel from "../components/hearing/HearingFeaturePanel";
import HearingTranscriptionPanel from "../components/HearingTranscriptionPanel";
import { PhoneOffIcon } from "../components/Icons";
import { gestureRelay } from "../utils/gestureRelay";

const HearingCommunication = ({
  roomId,
  callState,
  isMuted: externalIsMuted,
  isCameraOn: externalIsCameraOn,
  onToggleMute,
  onToggleCamera,
  onLeaveCall,
  localVideoRef: externalLocalVideoRef,
  remoteParticipants = [],
  statusMessage,
  error,
  localParticipantName = "Participant",
  transcriptionText = "",
  transcriptionMessages = [],
  showTranscription = true,
  onToggleTranscription,
  transcriptionError = null,
}) => {
  const participantName = localParticipantName;
  const [isMuted, setIsMuted] = useState(externalIsMuted || false);
  const [isCameraOn, setIsCameraOn] = useState(externalIsCameraOn || true);
  const [showMyTranscription, setShowMyTranscription] = useState(showTranscription);
  const [gestureMessages, setGestureMessages] = useState([]);

  // Initialize gesture relay for hearing participant
  useEffect(() => {
    if (roomId && participantName) {
      gestureRelay.initialize(roomId, "hearing", participantName, (message) => {
        console.log(`🤲 Received gesture prediction: "${message.text}" from ${message.participantName}`);
        setGestureMessages((prev) => {
          // Avoid duplicates
          const exists = prev.some((msg) => msg.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });
      });
      console.log("🤲 Gesture relay initialized for hearing participant");
    }

    return () => {
      gestureRelay.cleanup();
    };
  }, [roomId, participantName]);

  // Use external ref if provided, otherwise create internal one
  const internalLocalVideoRef = useRef(null);
  const localVideoRef = externalLocalVideoRef || internalLocalVideoRef;

  // Sync with external state
  useEffect(() => {
    if (externalIsMuted !== undefined) {
      setIsMuted(externalIsMuted);
    }
  }, [externalIsMuted]);

  useEffect(() => {
    if (externalIsCameraOn !== undefined) {
      setIsCameraOn(externalIsCameraOn);
    }
  }, [externalIsCameraOn]);

  const handleMuteToggle = () => {
    if (onToggleMute) {
      onToggleMute();
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleCameraToggle = () => {
    if (onToggleCamera) {
      onToggleCamera();
    } else {
      setIsCameraOn(!isCameraOn);
    }
  };

  const handleTranscriptionToggle = () => {
    const newValue = !showMyTranscription;
    setShowMyTranscription(newValue);
    if (onToggleTranscription) {
      onToggleTranscription(newValue);
    }
  };

  const [activeNav, setActiveNav] = useState("communicate");
  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const navItemsRef = useRef({});

  // Update indicator position when active nav changes
  useEffect(() => {
    if (indicatorRef.current && navItemsRef.current[activeNav]) {
      const activeItem = navItemsRef.current[activeNav];
      const navContainer = navRef.current;

      if (activeItem && navContainer) {
        const navRect = navContainer.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();

        indicatorRef.current.style.left = `${itemRect.left - navRect.left}px`;
        indicatorRef.current.style.width = `${itemRect.width}px`;
      }
    }
  }, [activeNav]);

  const handleNavClick = (navId) => {
    setActiveNav(navId);
    if (navId === "home") {
      window.location.href = "/";
    }
  };

  const styles = {
    container: {
      height: "100vh",
      maxHeight: "100vh",
      backgroundColor: "#060214",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 48px",
      position: "relative",
      zIndex: 100,
      flexShrink: 0,
      backgroundColor: "rgba(6, 2, 20, 0.8)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(168, 85, 247, 0.15)",
      gap: "20px",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "24px",
    },
    logo: {
      display: "flex",
      alignItems: "center",
      height: "40px",
      backgroundColor: "transparent",
    },
    logoImage: {
      height: "40px",
      width: "auto",
      objectFit: "contain",
      display: "block",
    },
    nav: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
      position: "relative",
      background: "rgba(255, 255, 255, 0.05)",
      padding: "4px",
      borderRadius: "100px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
    },
    navIndicator: {
      position: "absolute",
      bottom: "4px",
      height: "calc(100% - 8px)",
      background: "linear-gradient(135deg, #8B2FF8 0%, #A85CFF 100%)",
      borderRadius: "100px",
      transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
      boxShadow: "0 4px 15px rgba(139, 47, 248, 0.4)",
      zIndex: 1,
    },
    navLink: {
      color: "#b3adca",
      textDecoration: "none",
      fontSize: "13px",
      fontWeight: 600,
      transition: "all 0.3s ease",
      cursor: "pointer",
      padding: "8px 20px",
      borderRadius: "100px",
      position: "relative",
      zIndex: 2,
      fontFamily: "'Inter', sans-serif",
      letterSpacing: "0.02em",
    },
    navLinkActive: {
      color: "#ffffff",
    },
    contactButton: {
      padding: "10px 24px",
      background: "linear-gradient(135deg, #8B2FF8 0%, #A85CFF 100%)",
      color: "white",
      border: "none",
      borderRadius: "100px",
      fontSize: "13px",
      fontWeight: "700",
      cursor: "pointer",
      transition: "all 0.3s",
      fontFamily: "'Inter', sans-serif",
      boxShadow: "0 4px 15px rgba(139, 47, 248, 0.3)",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },
    mainContent: {
      flex: 1,
      display: "flex",
      gap: "24px",
      padding: "24px",
      maxWidth: "1600px",
      margin: "0 auto",
      width: "100%",
      minHeight: 0,
      overflow: "hidden",
      position: "relative",
      zIndex: 10,
    },
    leftPanel: {
      flex: "0.7",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      gap: "20px",
    },
    videoWrapper: {
      flex: 1,
      minHeight: 0,
      position: "relative",
      background: "#0b0820",
      borderRadius: "24px",
      border: "1px solid rgba(168, 85, 247, 0.1)",
      overflow: "hidden",
      boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
    },
    statusIndicator: {
      position: "absolute",
      bottom: "100px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      backgroundColor: "rgba(6, 2, 20, 0.8)",
      backdropFilter: "blur(12px)",
      padding: "8px 20px",
      borderRadius: "100px",
      zIndex: 50,
      fontFamily: "'Inter', sans-serif",
      fontSize: "13px",
      fontWeight: 600,
      border: "1px solid rgba(168, 85, 247, 0.2)",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
    },
    statusDot: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
    },
    statusText: {
      color: "#fff",
    },
    transcriptionToggleWrapper: {
      display: "flex",
      justifyContent: "center",
      padding: "16px",
      background: "rgba(255, 255, 255, 0.03)",
      borderRadius: "20px",
      border: "1px solid rgba(255, 255, 255, 0.05)",
    },
    transcriptionToggle: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      background: "rgba(255, 255, 255, 0.05)",
      padding: "12px 24px",
      borderRadius: "100px",
      fontFamily: "'Inter', sans-serif",
      fontSize: "14px",
      fontWeight: 600,
      color: "#fff",
      cursor: "pointer",
      border: "1px solid rgba(168, 85, 247, 0.2)",
      transition: "all 0.3s",
    },
    transcriptionToggleLabel: {
      color: "#fff",
    },
    transcriptionSwitch: {
      position: "relative",
      width: "48px",
      height: "26px",
      backgroundColor: showMyTranscription ? "#8B2FF8" : "rgba(255, 255, 255, 0.1)",
      borderRadius: "100px",
      transition: "background-color 0.3s",
      cursor: "pointer",
    },
    transcriptionSwitchKnob: {
      position: "absolute",
      top: "3px",
      left: showMyTranscription ? "25px" : "3px",
      width: "20px",
      height: "20px",
      backgroundColor: "white",
      borderRadius: "50%",
      transition: "left 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.3)",
    },
    rightPanel: {
      flex: "0.3",
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
    },
    roomCodeBadge: {
      background: "rgba(168, 85, 247, 0.1)",
      color: "#A85CFF",
      padding: "6px 14px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: 700,
      fontFamily: "'Bricolage Grotesque', sans-serif",
      border: "1px solid rgba(168, 85, 247, 0.2)",
      letterSpacing: "1px",
    },
    callEndButton: {
      position: "absolute",
      top: "16px",
      right: "16px",
      backgroundColor: "#ea4335",
      color: "white",
      border: "none",
      borderRadius: "50%",
      width: "48px",
      height: "48px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      boxShadow: "0 8px 20px rgba(234, 67, 53, 0.4)",
      transition: "all 0.3s",
      zIndex: 100,
    },
  };

  const handleEndCall = () => {
    if (onLeaveCall) {
      onLeaveCall();
    } else {
      window.location.href = "/test-communication";
    }
  };

  return (
    <div style={styles.container}>
      {/* Header/Navbar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <img
              src="https://res.cloudinary.com/drvllglbk/image/upload/f_png/cs_srgb/q_auto/hear_me_logo_jvyfgf.jpg"
              alt="He@r Me Logo"
              style={styles.logoImage}
              onError={(e) => {
                console.error("Logo failed to load from Cloudinary");
                if (!e.target.src.includes("hear_me_logo_jvyfgf.jpg")) {
                  e.target.src =
                    "https://res.cloudinary.com/drvllglbk/image/upload/hear_me_logo_jvyfgf.jpg";
                } else if (!e.target.src.includes("/logo.png")) {
                  e.target.src = "/logo.png";
                }
              }}
            />
          </div>
          {/* Room Code Badge - Top Left */}
          {roomId && (
            <div style={styles.roomCodeBadge}>
              Room: {roomId}
            </div>
          )}
        </div>
        <nav ref={navRef} style={styles.nav}>
          {activeNav === "communicate" && <div ref={indicatorRef} style={styles.navIndicator} />}
          <a
            ref={(el) => (navItemsRef.current.home = el)}
            href="#home"
            style={{
              ...styles.navLink,
              ...(activeNav === "home" ? styles.navLinkActive : {}),
            }}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("home");
            }}
          >
            HOME
          </a>
          <a
            ref={(el) => (navItemsRef.current.communicate = el)}
            href="#communicate"
            style={{
              ...styles.navLink,
              ...(activeNav === "communicate" ? styles.navLinkActive : {}),
            }}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("communicate");
            }}
          >
            Communicate
          </a>
          <a
            ref={(el) => (navItemsRef.current.features = el)}
            href="#features"
            style={{
              ...styles.navLink,
              ...(activeNav === "features" ? styles.navLinkActive : {}),
            }}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("features");
            }}
          >
            Features
          </a>
          <a
            ref={(el) => (navItemsRef.current.howitworks = el)}
            href="#howitworks"
            style={{
              ...styles.navLink,
              ...(activeNav === "howitworks" ? styles.navLinkActive : {}),
            }}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("howitworks");
            }}
          >
            How it Works
          </a>
        </nav>
        <button style={styles.contactButton}>Contact me</button>
      </header>

      {/* Main Content Area */}
      <div style={styles.mainContent}>
        {/* Left Panel - Video (70%) */}
        <div style={styles.leftPanel}>
          <div style={styles.videoWrapper}>
            <DeafVideoPanel
              participantName={participantName}
              isMuted={isMuted}
              isCameraOn={isCameraOn}
              onMuteToggle={handleMuteToggle}
              onCameraToggle={handleCameraToggle}
              localVideoRef={localVideoRef}
              remoteParticipants={remoteParticipants}
              onEndCall={handleEndCall}
            />
          </div>
          
          {/* Status Indicator */}
          {statusMessage && (
            <div style={styles.statusIndicator}>
              <div 
                style={{
                  ...styles.statusDot,
                  backgroundColor: 
                    statusMessage.includes("Error") || statusMessage.includes("Failed") ? "#ef4444" :
                    statusMessage.includes("Connected") || statusMessage.includes("initialized") ? "#10b981" :
                    "#fbbf24"
                }}
              />
              <span style={styles.statusText}>{statusMessage}</span>
            </div>
          )}
          
          {/* Transcription Toggle at Bottom (replaces Mode Toggle) */}
          <div style={styles.transcriptionToggleWrapper}>
            <div style={styles.transcriptionToggle} onClick={handleTranscriptionToggle}>
              <span style={styles.transcriptionToggleLabel}>🎤 My Transcription</span>
              <div style={styles.transcriptionSwitch}>
                <div style={styles.transcriptionSwitchKnob}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Features (30%) */}
        <div style={styles.rightPanel}>
          <HearingFeaturePanel gestureMessages={gestureMessages} />
        </div>
      </div>

      {/* Transcription Panel - Show/Hide based on toggle */}
      {showMyTranscription && (
        <HearingTranscriptionPanel
          transcriptionText={transcriptionText}
          transcriptionMessages={transcriptionMessages}
          isEnabled={showMyTranscription}
          onToggle={handleTranscriptionToggle}
          error={transcriptionError}
        />
      )}
    </div>
  );
};

export default HearingCommunication;

