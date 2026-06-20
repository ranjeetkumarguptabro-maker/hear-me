import React, { useState, useEffect, useRef, useCallback } from "react";
import TranscriptionMessageBubble from "../TranscriptionMessageBubble";
import { searchGiphyForWord } from "../../utils/giphyApi";
import { processTextWithPriority } from "../../utils/textProcessor";
import { MicIcon } from "../Icons";

const DeafFeaturePanel = ({ 
  remoteTranscription = "", 
  transcriptionMessages = [], 
  onClearTranscription,
  mode = "word", // "alphabet" or "word" (from parent, for backward compatibility)
  gestureRecognitionEnabled = false,
  onGestureRecognitionToggle = null,
  gesturePrediction = "",
  gestureHandDetected = false,
  isGesturePredicting = false,
}) => {
  const [textToSignEnabled, setTextToSignEnabled] = useState(true);
  // Voice to Text should be enabled by default for deaf participants
  const [voiceToTextEnabled, setVoiceToTextEnabled] = useState(true);
  // NEW: Sign Mode selector (Sentence or Word)
  const [signMode, setSignMode] = useState("sentence"); // "sentence" or "word"
  const messagesEndRef = useRef(null);

  // GIF playback state
  const [currentGifUrl, setCurrentGifUrl] = useState(null);
  const [currentUnit, setCurrentUnit] = useState("");
  const [isLoadingGif, setIsLoadingGif] = useState(false);
  const [gifError, setGifError] = useState("");

  // GIF queue and playback management
  const gifQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const gifCacheRef = useRef(new Map()); // Cache: word/char -> GIF URL
  const lastApiCallRef = useRef(0);
  const processingTimeoutRef = useRef(null);
  const gifTimeoutRef = useRef(null);
  const processedMessageIdsRef = useRef(new Set()); // Track processed messages

  // Clear transcription when voice-to-text is toggled off
  useEffect(() => {
    if (!voiceToTextEnabled && onClearTranscription) {
      onClearTranscription();
      // Also clear GIF state
      setCurrentGifUrl(null);
      setCurrentUnit("");
      setGifError("");
      gifQueueRef.current = [];
      isPlayingRef.current = false;
      if (gifTimeoutRef.current) {
        clearTimeout(gifTimeoutRef.current);
      }
    }
  }, [voiceToTextEnabled, onClearTranscription]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptionMessages]);

  // Rate limiting: minimum 500ms between API calls
  const rateLimitedGifFetch = useCallback(async (unit) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallRef.current;
    const minDelay = 500; // 500ms minimum between calls

    if (timeSinceLastCall < minDelay) {
      await new Promise((resolve) => setTimeout(resolve, minDelay - timeSinceLastCall));
    }

    lastApiCallRef.current = Date.now();
    return await searchGiphyForWord(unit);
  }, []);

  // Play next GIF in queue
  const playNextGif = useCallback(() => {
    if (!textToSignEnabled || gifQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    const nextItem = gifQueueRef.current.shift();
    if (!nextItem) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    setCurrentUnit(nextItem.unit);
    setGifError("");

    if (nextItem.gifUrl) {
      setCurrentGifUrl(nextItem.gifUrl);
      setIsLoadingGif(false);
      
      // Estimate GIF duration (default 3 seconds, adjust based on actual GIF)
      const gifDuration = 3000; // 3 seconds per GIF
      
      // Schedule next GIF after current one finishes
      gifTimeoutRef.current = setTimeout(() => {
        playNextGif();
      }, gifDuration);
    } else {
      // No GIF found for this unit
      setCurrentGifUrl(null);
      setIsLoadingGif(false);
      setGifError(`Sign not available for "${nextItem.unit}"`);
      
      // Continue to next GIF after short delay
      gifTimeoutRef.current = setTimeout(() => {
        playNextGif();
      }, 1000); // 1 second delay for missing GIFs
    }
  }, [textToSignEnabled]);

  // Process FINAL transcription messages and queue GIFs
  // CREDIT-SAFE: Process transcription messages and convert to GIFs when Text to Virtual Sign is enabled
  useEffect(() => {
    // CREDIT-SAFE RULE: Do NOT call GIF API unless toggle is ON
    if (!textToSignEnabled || !voiceToTextEnabled) {
      // Clear any pending processing
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      // Clear GIF state when toggle is OFF
      if (!textToSignEnabled) {
        setCurrentGifUrl(null);
        setCurrentUnit("");
        setGifError("");
        setIsLoadingGif(false);
        gifQueueRef.current = [];
        isPlayingRef.current = false;
        if (gifTimeoutRef.current) {
          clearTimeout(gifTimeoutRef.current);
          gifTimeoutRef.current = null;
        }
      }
      return;
    }

    // Clear any pending processing
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    // Debounce processing: wait 400ms after last message before processing
    processingTimeoutRef.current = setTimeout(async () => {
      // Get only FINAL messages (ignore partial)
      const finalMessages = transcriptionMessages.filter(
        (msg) => msg.type === "final" && !processedMessageIdsRef.current.has(msg.timestamp)
      );

      if (finalMessages.length === 0) {
        return;
      }

      // Process each final message
      for (const message of finalMessages) {
        // Mark as processed
        processedMessageIdsRef.current.add(message.timestamp);

        const text = message.text || "";
        if (!text.trim()) continue;

        // Process text with priority: sentence → word → alphabet
        const priorityUnits = processTextWithPriority(text, signMode);

        if (priorityUnits.length === 0) continue;

        setIsLoadingGif(true);
        setGifError("");

        // Group units by priority
        const unitsByPriority = {};
        priorityUnits.forEach((item) => {
          if (!unitsByPriority[item.priority]) {
            unitsByPriority[item.priority] = [];
          }
          unitsByPriority[item.priority].push(item);
        });

        // Helper function to fetch GIF with caching
        // CREDIT-SAFE: Only fetch if toggle is still ON
        const fetchGifWithCache = async (unit, type) => {
          // Double-check toggle is still ON before API call
          if (!textToSignEnabled) {
            console.log("⏹️ Text to Virtual Sign toggle turned OFF - aborting GIF fetch");
            return null;
          }

          const cacheKey = `${type}:${unit}`;
          let gifUrl = gifCacheRef.current.get(cacheKey);
          
          if (!gifUrl) {
            try {
              gifUrl = await rateLimitedGifFetch(unit);
              if (gifUrl) {
                gifCacheRef.current.set(cacheKey, gifUrl);
              }
            } catch (error) {
              console.error(`Error fetching GIF for "${unit}":`, error);
              gifUrl = null;
            }
          }
          
          return gifUrl;
        };

        if (signMode === "sentence") {
          // SENTENCE MODE: Try sentence first, then words, then alphabets per word
          
          // Priority 1: Try full sentence
          const sentenceUnits = unitsByPriority[1] || [];
          let sentenceFound = false;
          if (sentenceUnits.length > 0) {
            const sentenceItem = sentenceUnits[0]; // Only one sentence
            const gifUrl = await fetchGifWithCache(sentenceItem.unit, sentenceItem.type);
            if (gifUrl) {
              gifQueueRef.current.push({
                unit: sentenceItem.unit,
                gifUrl,
                type: sentenceItem.type
              });
              sentenceFound = true;
            }
          }
          
          // Priority 2 & 3: Try words (and alphabet fallback per word) if sentence not found
          if (!sentenceFound) {
            const wordUnits = unitsByPriority[2] || [];
            const charUnits = unitsByPriority[3] || [];
            
            for (const wordItem of wordUnits) {
              let gifUrl = await fetchGifWithCache(wordItem.unit, wordItem.type);
              
              if (gifUrl) {
                // Word found, add to queue
                gifQueueRef.current.push({
                  unit: wordItem.unit,
                  gifUrl,
                  type: wordItem.type
                });
              } else {
                // Word not found, try alphabet fallback for this specific word
                const wordLower = wordItem.unit.toLowerCase();
                const wordChars = charUnits.filter(item => {
                  // Check if this character is part of the current word
                  return wordLower.includes(item.unit.toLowerCase());
                });
                
                // Process characters in order they appear in the word
                for (let i = 0; i < wordLower.length; i++) {
                  const char = wordLower[i];
                  if (/[a-z0-9]/.test(char)) {
                    const charItem = charUnits.find(item => 
                      item.unit.toLowerCase() === char
                    );
                    if (charItem) {
                      const charGifUrl = await fetchGifWithCache(charItem.unit, charItem.type);
                      if (charGifUrl) {
                        gifQueueRef.current.push({
                          unit: charItem.unit,
                          gifUrl: charGifUrl,
                          type: charItem.type
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          // WORD MODE: Try words first, then alphabets per word
          
          const wordUnits = unitsByPriority[1] || [];
          const charUnits = unitsByPriority[2] || [];
          
          for (const wordItem of wordUnits) {
            let gifUrl = await fetchGifWithCache(wordItem.unit, wordItem.type);
            
            if (gifUrl) {
              // Word found, add to queue
              gifQueueRef.current.push({
                unit: wordItem.unit,
                gifUrl,
                type: wordItem.type
              });
            } else {
              // Word not found, try alphabet fallback for this specific word
              const wordLower = wordItem.unit.toLowerCase();
              
              // Process characters in order they appear in the word
              for (let i = 0; i < wordLower.length; i++) {
                const char = wordLower[i];
                if (/[a-z0-9]/.test(char)) {
                  const charItem = charUnits.find(item => 
                    item.unit.toLowerCase() === char
                  );
                  if (charItem) {
                    const charGifUrl = await fetchGifWithCache(charItem.unit, charItem.type);
                    if (charGifUrl) {
                      gifQueueRef.current.push({
                        unit: charItem.unit,
                        gifUrl: charGifUrl,
                        type: charItem.type
                      });
                    }
                  }
                }
              }
            }
          }
        }

        setIsLoadingGif(false);

        setIsLoadingGif(false);
      }

      // Start playing if not already playing
      if (!isPlayingRef.current && gifQueueRef.current.length > 0) {
        playNextGif();
      }
    }, 400); // 400ms debounce

    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [transcriptionMessages, textToSignEnabled, voiceToTextEnabled, signMode, playNextGif, rateLimitedGifFetch]);

  // Cleanup on unmount or when feature is disabled
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (gifTimeoutRef.current) {
        clearTimeout(gifTimeoutRef.current);
      }
    };
  }, []);

  // Clear GIF state when toggle is turned off
  useEffect(() => {
    if (!textToSignEnabled) {
      setCurrentGifUrl(null);
      setCurrentUnit("");
      setGifError("");
      setIsLoadingGif(false);
      gifQueueRef.current = [];
      isPlayingRef.current = false;
      if (gifTimeoutRef.current) {
        clearTimeout(gifTimeoutRef.current);
      }
    }
  }, [textToSignEnabled]);

  const styles = {
    container: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      paddingTop: "0",
      fontFamily: "'Bricolage Grotesque', sans-serif",
      overflow: "hidden",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "transparent",
      padding: "10px 0",
      width: "fit-content",
      marginBottom: "4px",
    },
    headerText: {
      color: "#4b5563",
      fontWeight: 700,
      fontSize: "13px",
      textTransform: "uppercase",
      letterSpacing: "1px",
      borderBottom: "2px solid #A85CFF",
      paddingBottom: "4px",
    },
    cardLarge: {
      flex: "1.2 1 auto",
      minHeight: "250px",
      background: "#ffffff",
      border: "1px solid rgba(0, 0, 0, 0.06)",
      borderRadius: "24px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
    },
    cardSmall: {
      flex: "1 1 auto",
      minHeight: "200px",
      background: "#ffffff",
      border: "1px solid rgba(0, 0, 0, 0.06)",
      borderRadius: "24px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    },
    cardHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "20px",
      gap: "12px",
    },
    cardTitle: {
      color: "#111827",
      fontWeight: 700,
      fontSize: "16px",
      background: "transparent",
      padding: "0",
      borderRadius: "0",
      border: "none",
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
      width: "48px",
      height: "26px",
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      borderRadius: "100px",
      position: "relative",
      transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
      border: "1px solid transparent",
    },
    toggleSwitchActive: {
      backgroundColor: "#A85CFF",
      border: "1px solid #903ef0",
    },
    toggleSlider: {
      position: "absolute",
      top: "2px",
      left: "2px",
      width: "20px",
      height: "20px",
      backgroundColor: "#fff",
      borderRadius: "50%",
      transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
      transform: textToSignEnabled ? "translateX(22px)" : "translateX(0)",
      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.15)",
    },
    contentAreaLarge: {
      flex: 1,
      backgroundColor: "#ffffff",
      borderRadius: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 0,
      border: "1px dashed rgba(168, 85, 247, 0.4)",
      overflow: "hidden",
    },
    contentAreaSmall: {
      flex: 1,
      backgroundColor: "#ffffff",
      borderRadius: "20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 0,
      border: "1px solid rgba(0, 0, 0, 0.05)",
      overflow: "hidden",
    },
    placeholderText: {
      color: "#6b7280",
      fontSize: "14px",
      fontWeight: 500,
    },
  };

  const toggleStyles2 = {
    ...styles.toggleSlider,
    transform: voiceToTextEnabled ? "translateX(20px)" : "translateX(0)",
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          /* Custom scrollbar for transcription messages */
          .transcription-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .transcription-scroll::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
          }
          .transcription-scroll::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 3px;
          }
          .transcription-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.3);
          }

          /* Loading spinner animation */
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      {/* Deaf Section Header */}
      <div style={styles.header}>
        <h2 style={styles.headerText}>Deaf Section</h2>
      </div>

      {/* Feature Card 1 - Text to Virtual Sign (LARGE) */}
      <div style={styles.cardLarge}>
        {/* Header Row */}
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Text To Virtual Sign</h3>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Sign Mode Selector */}
            {textToSignEnabled && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 500,
              }}>
                <span style={{ color: "#1f2937" }}>Sign Mode:</span>
                <select
                  value={signMode}
                  onChange={(e) => setSignMode(e.target.value)}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#1f2937",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="sentence">Sentence</option>
                  <option value="word">Word</option>
                </select>
              </div>
            )}
            
            {/* Toggle Switch */}
            <label style={styles.toggleContainer}>
              <input
                type="checkbox"
                checked={textToSignEnabled}
                onChange={(e) => setTextToSignEnabled(e.target.checked)}
                style={styles.toggleInput}
              />
              <div
                style={{
                  ...styles.toggleSwitch,
                  ...(textToSignEnabled ? styles.toggleSwitchActive : {}),
                }}
              >
                <div style={styles.toggleSlider} />
              </div>
            </label>
          </div>
        </div>

        {/* Content Area - GIF Display - LARGE */}
        <div style={styles.contentAreaLarge}>
          {textToSignEnabled ? (
            isLoadingGif ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid rgba(31, 41, 55, 0.2)",
                  borderTop: "4px solid #0574DF",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}></div>
                <p style={styles.placeholderText}>Loading sign language GIF...</p>
              </div>
            ) : currentGifUrl ? (
              <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "16px",
              }}>
                <img
                  src={currentGifUrl}
                  alt={`Sign for "${currentUnit}"`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "220px",
                    objectFit: "contain",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                  onError={(e) => {
                    console.error("Error loading GIF:", currentGifUrl);
                    setGifError(`Failed to load sign for "${currentUnit}"`);
                    setCurrentGifUrl(null);
                  }}
                />
                {currentUnit && (
                  <p style={{
                    color: "#1f2937",
                    fontSize: "16px",
                    fontWeight: 600,
                    margin: 0,
                  }}>
                    {currentUnit.toUpperCase()}
                  </p>
                )}
              </div>
            ) : gifError ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "16px",
                textAlign: "center",
              }}>
                <p style={{
                  ...styles.placeholderText,
                  color: "#ef4444",
                }}>
                  {gifError}
                </p>
                {gifQueueRef.current.length > 0 && (
                  <p style={styles.placeholderText}>
                    Continuing with next sign...
                  </p>
                )}
              </div>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}>
                <p style={styles.placeholderText}>
                  👋 Waiting for transcription...
                </p>
                <p style={{
                  ...styles.placeholderText,
                  fontSize: "12px",
                }}>
                  Sign language GIFs will appear here when hearing participant speaks
                </p>
              </div>
            )
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <p style={styles.placeholderText}>Enable to see sign language GIFs</p>
            </div>
          )}
        </div>
      </div>

      {/* Feature Card 2 - Voice to Text (SMALL) */}
      <div style={styles.cardSmall}>
        {/* Header Row */}
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Voice To Text</h3>
          
          {/* Toggle Switch */}
          <label style={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={voiceToTextEnabled}
              onChange={(e) => setVoiceToTextEnabled(e.target.checked)}
              style={styles.toggleInput}
            />
            <div
              style={{
                ...styles.toggleSwitch,
                ...(voiceToTextEnabled ? styles.toggleSwitchActive : {}),
              }}
            >
              <div style={toggleStyles2} />
            </div>
          </label>
        </div>

        {/* Content Area - Show transcription messages or placeholder (SMALL) */}
        <div style={styles.contentAreaSmall}>
          {voiceToTextEnabled ? (
            transcriptionMessages.length > 0 ? (
              <div 
                className="transcription-scroll"
                style={{
                  width: "100%",
                  height: "100%",
                  padding: "16px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  boxSizing: "border-box",
                }}
              >
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
              <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px"
              }}>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '40px', justifyContent: 'center', marginBottom: '24px' }}>
                  {[6, 10, 16, 10, 24, 14, 32, 18, 10, 14, 28, 16, 10, 18, 26, 14, 8, 20, 12, 6, 14, 24, 12, 8, 16, 30, 20, 12, 18, 24, 14, 8, 6, 10, 16, 10, 24, 14, 32, 18, 10, 14, 28, 16].map((h, i) => (
                    <div key={i} style={{ width: '3px', height: `${h}px`, backgroundColor: '#A85CFF', borderRadius: '2px', opacity: h > 20 ? 1 : 0.6 }} />
                  ))}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MicIcon size={20} color="#A85CFF" />
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#4b5563' }}>Listening for speech...</span>
                </div>
                <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>Speak clearly for better recognition</span>
              </div>
            )
          ) : (
            <div style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <p style={styles.placeholderText}>Transcribed text will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Good Connection Pill */}
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        width: "100%",
        marginTop: "auto"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.04)",
          borderRadius: "100px",
          padding: "8px 16px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
        }}>
          <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", height: "12px" }}>
            <div style={{ width: "3px", height: "4px", background: "#22c55e", borderRadius: "1px" }}></div>
            <div style={{ width: "3px", height: "8px", background: "#22c55e", borderRadius: "1px" }}></div>
            <div style={{ width: "3px", height: "12px", background: "#22c55e", borderRadius: "1px" }}></div>
          </div>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Good Connection</span>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: "100px" }}>85 ms</span>
        </div>
      </div>
    </div>
  );
};

export default DeafFeaturePanel;

