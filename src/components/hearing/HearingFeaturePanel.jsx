import React, { useState, useEffect, useRef } from "react";
import { textToSpeechService } from "../../utils/azureTextToSpeech";

const HearingFeaturePanel = ({ 
  gestureMessages = [], // Array of gesture prediction messages
}) => {
  const [signLanguageEnabled, setSignLanguageEnabled] = useState(false);
  const [speechAssistantEnabled, setSpeechAssistantEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const lastSpokenTextRef = useRef("");
  const lastMessageIdRef = useRef(0);

  // Initialize Text-to-Speech service
  useEffect(() => {
    const AZURE_SPEECH_KEY =
      import.meta.env.VITE_AZURE_SPEECH_KEY ||
      "YOUR_AZURE_SPEECH_KEY_HERE";
    const AZURE_REGION = import.meta.env.VITE_AZURE_REGION || "westeurope";

    const initialized = textToSpeechService.initialize(AZURE_SPEECH_KEY, AZURE_REGION);
    if (!initialized) {
      console.warn("⚠️ TTS service initialization failed");
    }

    return () => {
      // CREDIT-SAFE: Cleanup on unmount - stop all TTS usage
      console.log("🧹 Cleaning up TTS service on unmount");
      textToSpeechService.stop();
      textToSpeechService.cleanup();
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [gestureMessages]);

  // CREDIT-SAFE: Text-to-Speech - Convert new gesture messages to speech when Sign Language Assistance is ON
  useEffect(() => {
    // CREDIT-SAFE RULE: Do NOT initialize or use TTS unless toggle is ON
    if (!signLanguageEnabled) {
      // HARD STOP: If toggle is turned OFF, stop any ongoing speech immediately
      if (textToSpeechService.isCurrentlySpeaking()) {
        console.log("⏹️ Sign Language Assistance toggle OFF - stopping TTS to save credits");
        textToSpeechService.stop();
        textToSpeechService.cleanup();
      }
      return;
    }

    // Check for new messages
    if (gestureMessages.length === 0) {
      return;
    }

    // Get the latest message
    const latestMessage = gestureMessages[gestureMessages.length - 1];
    
    // Skip if this message was already spoken
    if (latestMessage.id && latestMessage.id <= lastMessageIdRef.current) {
      return;
    }

    // Skip if message text is empty or same as last spoken
    const messageText = latestMessage.text?.trim() || "";
    if (!messageText || messageText === lastSpokenTextRef.current) {
      return;
    }

    // Update tracking refs
    lastMessageIdRef.current = latestMessage.id || 0;
    lastSpokenTextRef.current = messageText;

    // Speak the text
    console.log(`🔊 TTS: Converting "${messageText}" to speech`);
    textToSpeechService.speak(messageText, "en-US-JennyNeural").catch((error) => {
      console.error("❌ TTS error:", error);
      // Don't crash UI, just log the error
    });
  }, [gestureMessages, signLanguageEnabled]);

  // Stop speech when toggle is turned OFF
  useEffect(() => {
    if (!signLanguageEnabled && textToSpeechService.isCurrentlySpeaking()) {
      console.log("⏹️ Sign Language Assistance turned OFF - stopping speech");
      textToSpeechService.stop();
    }
  }, [signLanguageEnabled]);

  const styles = {
    container: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      paddingTop: "0",
      fontFamily: "'Bricolage Grotesque', sans-serif",
      overflow: "hidden",
      // Let cards sit directly on page background
      backgroundColor: "transparent",
    },
    header: {
      // Minimal header so it doesn't look like an extra card behind
      backgroundColor: "transparent",
      borderRadius: "0",
      padding: "0 0 8px 0",
      width: "fit-content",
      marginBottom: "8px",
    },
    headerText: {
      color: "white",
      fontWeight: 600,
      fontSize: "16px",
    },
    cardLarge: {
      minHeight: "400px",
      maxHeight: "400px",
      background: "linear-gradient(135deg, #050716 0%, #0B2CFF 25%, #1FE0FF 50%, #0B2CFF 75%, #050716 100%)",
      backgroundSize: "400% 400%",
      borderRadius: "80px",
      boxShadow: "0 10px 30px -5px rgba(31, 224, 255, 0.3), 0 4px 15px -2px rgba(0, 0, 0, 0.2), inset 0 0 50px rgba(31, 224, 255, 0.1)",
      padding: "0",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
      transition: "box-shadow 0.3s ease",
      animation: "waveGradient 6s ease-in-out infinite",
    },
    cardLargeHover: {
      boxShadow: "0 10px 40px -5px rgba(31, 224, 255, 0.4), 0 4px 20px -2px rgba(0, 0, 0, 0.3), inset 0 0 60px rgba(31, 224, 255, 0.15)",
    },
    cardSmall: {
      minHeight: "350px",
      maxHeight: "350px",
      background: "linear-gradient(180deg, #0574DF 0%, #F5F8F8 100%)",
      borderRadius: "80px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
    },
    cardHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      padding: "24px 24px 16px 24px",
      position: "relative",
      zIndex: 20,
      backgroundColor: "rgba(5, 7, 22, 0.3)",
      backdropFilter: "blur(10px)",
    },
    cardTitle: {
      color: "#1f2937",
      fontWeight: 600,
      fontSize: "18px",
      backgroundColor: "white",
      padding: "10px 20px",
      borderRadius: "9999px",
      display: "inline-block",
    },
    toggleContainer: {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      cursor: "pointer",
    },
    toggleInput: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0,
    },
    toggleSwitch: {
      width: "44px",
      height: "24px",
      backgroundColor: "white",
      borderRadius: "9999px",
      position: "relative",
      transition: "background-color 0.2s",
      border: "1px solid rgba(0, 0, 0, 0.2)",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
    },
    toggleSwitchActive: {
      backgroundColor: "white",
      border: "1px solid rgba(0, 0, 0, 0.3)",
    },
    toggleSlider: {
      position: "absolute",
      top: "2px",
      left: "2px",
      width: "20px",
      height: "20px",
      backgroundColor: "#1f2937",
      borderRadius: "50%",
      transition: "transform 0.2s",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
    },
    contentAreaLarge: {
      flex: 1,
      backgroundColor: "transparent",
      borderRadius: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "0",
      maxHeight: "none",
      overflow: "hidden",
      position: "relative",
      width: "100%",
      height: "100%",
    },
    videoContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
      transition: "opacity 0.5s ease, transform 0.5s ease",
    },
    videoContainerVisible: {
      opacity: 1,
      transform: "scale(1)",
      animation: "zoomIn 0.6s ease-out forwards",
    },
    videoContainerHidden: {
      opacity: 0,
      transform: "scale(0.95)",
      animation: "zoomOut 0.4s ease-in forwards",
      pointerEvents: "none",
    },
    videoElement: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      borderRadius: "0",
      pointerEvents: "none",
      WebkitAppearance: "none",
      appearance: "none",
      userSelect: "none",
      WebkitUserSelect: "none",
      MozUserSelect: "none",
      msUserSelect: "none",
    },
    contentAreaSmall: {
      flex: 1,
      // Remove inner white box behind Speech Assistant
      backgroundColor: "transparent",
      borderRadius: "0",
      backdropFilter: "none",
      display: "flex",
      flexDirection: "column",
      padding: "16px",
      minHeight: "230px",
      maxHeight: "230px",
      border: "none",
      overflowY: "auto",
      overflowX: "hidden",
    },
    messageBubble: {
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "12px 16px",
      marginBottom: "12px",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      maxWidth: "100%",
      wordWrap: "break-word",
    },
    messageText: {
      color: "#1f2937",
      fontSize: "14px",
      lineHeight: "1.5",
      margin: 0,
    },
    messageLabel: {
      color: "#6b7280",
      fontSize: "12px",
      marginBottom: "4px",
      fontWeight: 500,
    },
    placeholderText: {
      color: "rgba(31, 41, 55, 0.6)",
      fontSize: "14px",
    },
  };

  const toggleStyles1 = {
    ...styles.toggleSlider,
    transform: signLanguageEnabled ? "translateX(20px)" : "translateX(0)",
  };

  const toggleStyles2 = {
    ...styles.toggleSlider,
    transform: speechAssistantEnabled ? "translateX(20px)" : "translateX(0)",
  };

  const [isCardHovered, setIsCardHovered] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  // Handle video load, errors, and toggle state
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      // Ensure video source is set
      if (!video.src && !video.querySelector("source")) {
        const source = document.createElement("source");
        source.src = "https://res.cloudinary.com/drvllglbk/video/upload/v1767201005/assistant_video_1_qr6avj.mp4";
        source.type = "video/mp4";
        video.appendChild(source);
        video.load(); // Reload video with new source
      }
      
      const handleLoadedData = () => {
        if (video) {
          video.style.opacity = "1";
          setVideoError(false);
        }
      };
      
      const handleError = (e) => {
        console.error("Video load error:", e);
        if (video.error) {
          console.error("Video error code:", video.error.code);
          console.error("Video error message:", video.error.message);
        }
        setVideoError(true);
      };
      
      const handleCanPlay = () => {
        // Only play if toggle is enabled
        if (signLanguageEnabled && video.paused) {
          video.play().catch((err) => {
            console.warn("Video autoplay failed:", err);
          });
        }
      };
      
      video.addEventListener("loadeddata", handleLoadedData);
      video.addEventListener("error", handleError);
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("loadedmetadata", () => {
        console.log("✅ Video metadata loaded:", {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
        });
      });
      
      return () => {
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
        video.removeEventListener("canplay", handleCanPlay);
      };
    }
  }, []);

  // Handle video play/pause based on toggle state
  useEffect(() => {
    if (videoRef.current) {
      if (signLanguageEnabled) {
        // Toggle ON: Play video
        videoRef.current.play().catch((err) => {
          console.warn("Video play failed:", err);
        });
      } else {
        // Toggle OFF: Pause video
        videoRef.current.pause();
      }
    }
  }, [signLanguageEnabled]);

  return (
    <div style={styles.container}>
      {/* Add CSS animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes zoomOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.95);
          }
        }
        @keyframes waveGradient {
          0% {
            background-position: 0% 50%;
          }
          25% {
            background-position: 100% 50%;
          }
          50% {
            background-position: 200% 50%;
          }
          75% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        /* Hide video controls completely */
        video::-webkit-media-controls {
          display: none !important;
        }
        video::-webkit-media-controls-enclosure {
          display: none !important;
        }
        video::-webkit-media-controls-panel {
          display: none !important;
        }
        video::-webkit-media-controls-play-button {
          display: none !important;
        }
        video::-webkit-media-controls-start-playback-button {
          display: none !important;
        }
        video::--webkit-media-controls-overlay-play-button {
          display: none !important;
        }
      `}</style>

      {/* Hearing Section Header */}
      <div style={styles.header}>
        <h2 style={styles.headerText}>Hearing Section</h2>
      </div>

      {/* Feature Card 1 - Sign Language Assistance (LARGE) */}
      <div 
        style={{
          ...styles.cardLarge,
          ...(isCardHovered ? styles.cardLargeHover : {}),
        }}
        onMouseEnter={() => setIsCardHovered(true)}
        onMouseLeave={() => setIsCardHovered(false)}
      >
        {/* Header Row */}
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Sign Language Assistance</h3>
          
          {/* Toggle Switch */}
          <label style={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={signLanguageEnabled}
              onChange={(e) => setSignLanguageEnabled(e.target.checked)}
              style={styles.toggleInput}
            />
            <div
              style={{
                ...styles.toggleSwitch,
                ...(signLanguageEnabled ? styles.toggleSwitchActive : {}),
              }}
            >
              <div style={toggleStyles1} />
            </div>
          </label>
        </div>

        {/* Video fills entire card - Pure background animation */}
        <div style={styles.contentAreaLarge}>
          <div 
            style={{
              ...styles.videoContainer,
              ...(signLanguageEnabled ? styles.videoContainerVisible : styles.videoContainerHidden),
            }}
          >
            <video
              ref={videoRef}
              autoPlay={signLanguageEnabled}
              loop
              muted
              playsInline
              controls={false}
              disablePictureInPicture
              disableRemotePlayback
              preload="auto"
              style={styles.videoElement}
              onContextMenu={(e) => e.preventDefault()}
              onError={(e) => {
                console.error("Video error:", e);
                if (videoRef.current?.error) {
                  console.error("Video error code:", videoRef.current.error.code);
                  console.error("Video error message:", videoRef.current.error.message);
                }
                setVideoError(true);
              }}
              onLoadedData={() => {
                if (videoRef.current) {
                  videoRef.current.style.opacity = "1";
                  setVideoError(false);
                  // Only play if toggle is enabled
                  if (signLanguageEnabled) {
                    videoRef.current.play().catch((err) => {
                      console.warn("Video play failed:", err);
                    });
                  }
                }
              }}
              onCanPlay={() => {
                if (videoRef.current && signLanguageEnabled && videoRef.current.paused) {
                  videoRef.current.play().catch((err) => {
                    console.warn("Video autoplay blocked:", err);
                  });
                }
              }}
            >
              <source 
                src="https://res.cloudinary.com/drvllglbk/video/upload/v1767201005/assistant_video_1_qr6avj.mp4" 
                type="video/mp4" 
              />
            </video>
          </div>
          {/* Error fallback - only shown if video fails to load */}
          {videoError && signLanguageEnabled && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "rgba(255, 255, 255, 0.7)",
              textAlign: "center",
              zIndex: 10,
              pointerEvents: "none",
            }}>
              <p style={{ fontSize: "14px", margin: 0 }}>Video unavailable</p>
            </div>
          )}
        </div>
      </div>

      {/* Feature Card 2 - Speech Assistant (SMALL) */}
      <div style={styles.cardSmall}>
        {/* Header Row */}
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Speech Assistant</h3>
          
          {/* Toggle Switch */}
          <label style={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={speechAssistantEnabled}
              onChange={(e) => setSpeechAssistantEnabled(e.target.checked)}
              style={styles.toggleInput}
            />
            <div
              style={{
                ...styles.toggleSwitch,
                ...(speechAssistantEnabled ? styles.toggleSwitchActive : {}),
              }}
            >
              <div style={toggleStyles2} />
            </div>
          </label>
        </div>

        {/* Content Area - Gesture Predictions - SMALL */}
        <div style={styles.contentAreaSmall}>
          {speechAssistantEnabled ? (
            gestureMessages.length > 0 ? (
              <>
                {gestureMessages.map((msg, index) => (
                  <div key={msg.id || index} style={styles.messageBubble}>
                    <div style={styles.messageLabel}>
                      {msg.participantName || "Deaf participant"} signed:
                    </div>
                    <p style={styles.messageText}>{msg.text}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <p style={styles.placeholderText}>
                  Waiting for gesture predictions...
                </p>
                <p style={{ ...styles.placeholderText, fontSize: "12px", marginTop: "8px", opacity: 0.7 }}>
                  Make sure the deaf participant has gesture recognition enabled
                </p>
              </div>
            )
          ) : (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <p style={styles.placeholderText}>
                Enable Speech Assistant to see gesture predictions
              </p>
              <p style={{ ...styles.placeholderText, fontSize: "12px", marginTop: "8px", opacity: 0.7 }}>
                Toggle the switch above to enable
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HearingFeaturePanel;

