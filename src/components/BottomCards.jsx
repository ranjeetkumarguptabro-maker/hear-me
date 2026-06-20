import React, { useState, useEffect, useRef } from "react";
import { getPredictionImage } from "../utils/aslImages";
import { searchGiphyForWord, processTextToGIFs } from "../utils/giphyApi";

// Card 1: AI Prediction
export const AIPredictionCard = ({ isProcessing, predictionText, handDetected, currentMode, isEnabled, onToggle }) => {
  const displayText = predictionText || (isProcessing || handDetected ? "Processing gestures..." : "Waiting for gesture...");
  const hasPrediction = predictionText && predictionText.trim() !== "";
  const imageUrl = hasPrediction ? getPredictionImage(predictionText, currentMode) : null;
  
  return (
    <div className="bottom-card ai-prediction-card">
      <div className="card-header">
        <h3 className="card-title">
          AI Prediction
        </h3>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => {
              console.log("AI Prediction toggle:", e.target.checked);
              onToggle(e.target.checked);
            }}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
      <div className="card-content">
        {hasPrediction ? (
          <>
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt={predictionText}
                className="prediction-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <div className="ai-prediction-text-large">
              {predictionText}
            </div>
          </>
        ) : (
          <div className="ai-prediction-text">
            {!isEnabled ? "Prediction disabled" : displayText}
          </div>
        )}
      </div>
    </div>
  );
};

// Card 2: Mode Selector
export const ModeSelectorCard = ({ currentMode, onModeChange }) => {
  return (
    <div className="bottom-card mode-selector-card">
      <div className="card-header">
        <h3 className="card-title">
          <span className="card-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </span> Mode
        </h3>
      </div>
      <div className="card-content">
        <div className="mode-buttons">
          <button
            className={`mode-btn large ${currentMode === "word" ? "active" : ""}`}
            onClick={() => onModeChange("word")}
          >
            <span className="mode-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </span> Words
          </button>
          <button
            className={`mode-btn small ${currentMode === "alphabet" ? "active" : ""}`}
            onClick={() => onModeChange("alphabet")}
          >
            <span className="mode-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M4 7h16M4 7v10M20 7v10M4 17h16M4 17v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
              </svg>
            </span> Alphabet
          </button>
        </div>
      </div>
    </div>
  );
};

// Card 3: Voice to Text
export const VoiceToTextCard = ({ 
  isEnabled, 
  onToggle, 
  messages, 
  currentMessage,
  chatInput,
  onChatInputChange,
  onSendMessage,
  isListening
}) => {
  return (
    <div className="bottom-card voice-to-text-card">
      <div className="card-header">
        <h3 className="card-title">
          <span className="card-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </span> Voice to Text
          <span className="card-subtitle">(Azure Speech to Text API)</span>
        </h3>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => {
              console.log("Voice to Text toggle:", e.target.checked);
              onToggle(e.target.checked);
            }}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
      <div className="card-content chat-content">
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className="chat-message">
              <div className="message-avatar">
                {msg.avatar ? (
                  msg.avatar
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </div>
              <div className="message-text">{msg.text}</div>
            </div>
          ))}
          {currentMessage && (
            <div className="chat-message">
              <div className="message-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="message-text">{currentMessage}</div>
            </div>
          )}
        </div>
        <div className="chat-input-container">
          <input
            type="text"
            placeholder="Type here"
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
            className="chat-input"
          />
          <button onClick={onSendMessage} className="send-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Card 4: Sign Language (Now uses Speech-to-Text for GIF playback)
export const SignLanguageCard = ({ speechText }) => {
  const [currentGifUrl, setCurrentGifUrl] = useState(null);
  const [currentWord, setCurrentWord] = useState("");
  const [isLoadingGif, setIsLoadingGif] = useState(false);
  const [gifError, setGifError] = useState("");
  const timeoutRef = useRef(null);
  const gifQueueRef = useRef([]);
  const currentIndexRef = useRef(0);
  const gifImageRef = useRef(null);
  const gifPlayedRef = useRef(false);

  // GIPHY utilities are imported at the top

  // Process speech text and play GIFs automatically
  useEffect(() => {
    if (!speechText || speechText.trim() === "") {
      setCurrentGifUrl(null);
      setCurrentWord("");
      setGifError("");
      return;
    }

    // Debounce: Wait 400ms before processing to avoid excessive API calls
    const debounceTimer = setTimeout(async () => {
      setIsLoadingGif(true);
      setGifError("");

      try {
        // Process text to get GIFs for each word
        const gifResults = await processTextToGIFs(speechText);
        
        if (gifResults.length === 0) {
          setGifError("No words to process");
          setIsLoadingGif(false);
          return;
        }

        // Filter out words without GIFs
        const validGifs = gifResults.filter((item) => item.gifUrl !== null);
        
        if (validGifs.length === 0) {
          setGifError("No sign language GIFs found for this text");
          setIsLoadingGif(false);
          return;
        }

        // Store GIFs in queue
        gifQueueRef.current = validGifs;
        currentIndexRef.current = 0;

        // Start playing GIFs sequentially
        playNextGif();
      } catch (error) {
        console.error("Error processing text to GIFs:", error);
        setGifError("Failed to load sign language GIFs");
        setIsLoadingGif(false);
      }
    }, 400);

    return () => {
      clearTimeout(debounceTimer);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [speechText]);

  // Play GIFs sequentially
  const playNextGif = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (currentIndexRef.current >= gifQueueRef.current.length) {
      // All GIFs played
      setIsLoadingGif(false);
      return;
    }

    const currentItem = gifQueueRef.current[currentIndexRef.current];
    // Reset the played flag for the new GIF
    gifPlayedRef.current = false;
    // Create a unique URL with timestamp to force fresh load
    const uniqueGifUrl = `${currentItem.gifUrl}${currentItem.gifUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    setCurrentGifUrl(uniqueGifUrl);
    setCurrentWord(currentItem.word.toUpperCase());
    setGifError("");
    setIsLoadingGif(false);

    // Move to next GIF after 3 seconds (enough time for one play)
    currentIndexRef.current++;
    timeoutRef.current = setTimeout(() => {
      playNextGif();
    }, 3000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="sign-language-display">
      {isLoadingGif ? (
        <div className="sign-language-loading">
          <div className="sign-language-loading-text">Loading sign language...</div>
        </div>
      ) : currentGifUrl ? (
        <div className="sign-language-gif-container">
          <div className="sign-language-word-label-large">
            {currentWord}
          </div>
          <div className="sign-language-gif-wrapper">
            <img 
              key={`gif-${currentWord}-${currentIndexRef.current}-${Date.now()}`}
              ref={gifImageRef}
              src={currentGifUrl} 
              alt={`Sign language for ${currentWord}`}
              className="sign-language-gif-large"
              onLoad={(e) => {
                // Reset the played flag when a new GIF loads
                gifPlayedRef.current = false;
                const img = e.target;
                
                // After the GIF has had time to play once (typically 2-3 seconds for sign language GIFs),
                // replace it with a static frame to prevent looping
                setTimeout(() => {
                  if (img && img.src === currentGifUrl && !gifPlayedRef.current) {
                    gifPlayedRef.current = true;
                    try {
                      // Create a canvas to capture the current frame
                      const canvas = document.createElement('canvas');
                      const naturalWidth = img.naturalWidth || img.width || 400;
                      const naturalHeight = img.naturalHeight || img.height || 300;
                      canvas.width = naturalWidth;
                      canvas.height = naturalHeight;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
                      // Replace animated GIF with static frame
                      img.src = canvas.toDataURL('image/png');
                    } catch (err) {
                      console.warn("Could not capture GIF frame:", err);
                    }
                  }
                }, 3000); // Wait 3 seconds for one play cycle
              }}
              onError={(e) => {
                console.error("Failed to load GIF:", currentGifUrl);
                setGifError("Failed to load GIF");
                e.target.style.display = 'none';
              }}
            />
          </div>
          {gifError && (
            <div className="sign-language-error">{gifError}</div>
          )}
        </div>
      ) : gifError ? (
        <div className="sign-language-placeholder">
          <div className="sign-language-placeholder-text">{gifError}</div>
        </div>
      ) : (
        <div className="sign-language-placeholder">
          <div className="sign-language-placeholder-text">
            {speechText ? "Waiting for speech..." : "Speak to see sign language"}
          </div>
        </div>
      )}
    </div>
  );
};

