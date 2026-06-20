import React, { useState, useRef, useEffect } from "react";
import "./SignGifTest.css";

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || "";
const GIPHY_USERNAME = "signwithrobert";
const GIF_DISPLAY_DURATION = 3000; // 3 seconds per GIF

// Debug: Log API key status (first 4 chars only for security)
console.log("GIPHY API Key loaded:", GIPHY_API_KEY ? `${GIPHY_API_KEY.substring(0, 4)}...` : "NOT FOUND");

const SignGifTest = () => {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [gifUrls, setGifUrls] = useState([]);
  const [words, setWords] = useState([]);
  const [error, setError] = useState("");
  const timeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Search GIPHY for a word from Sign with Robert
  const searchGiphyForWord = async (word) => {
    // Check both the constant and import.meta.env directly (in case of hot reload issues)
    const apiKey = GIPHY_API_KEY || import.meta.env.VITE_GIPHY_API_KEY || "";
    
    if (!apiKey) {
      throw new Error("GIPHY API key not found. Please add VITE_GIPHY_API_KEY to your .env file and restart the dev server");
    }

    try {
      const apiKey = GIPHY_API_KEY || import.meta.env.VITE_GIPHY_API_KEY || "";
      
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(word)}&username=${GIPHY_USERNAME}&limit=10&rating=g`
      );

      if (!response.ok) {
        throw new Error(`GIPHY API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.data && data.data.length > 0) {
        // Filter to ensure it's from signwithrobert
        const robertGifs = data.data.filter(
          (gif) => gif.user && gif.user.username === GIPHY_USERNAME
        );

        if (robertGifs.length > 0) {
          // Return the first valid GIF URL
          return robertGifs[0].images.original.url;
        } else {
          // If no exact match, try the first result (might still be from Robert)
          return data.data[0].images.original.url;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error searching GIPHY for "${word}":`, error);
      throw error;
    }
  };

  // Process text and fetch GIFs
  const handlePlaySignLanguage = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text");
      return;
    }

    // Check API key (try both sources)
    const apiKey = GIPHY_API_KEY || import.meta.env.VITE_GIPHY_API_KEY || "";
    
    if (!apiKey) {
      setError("GIPHY API key not configured. Please add VITE_GIPHY_API_KEY to your .env file and restart the dev server");
      return;
    }

    setIsLoading(true);
    setError("");
    setCurrentWordIndex(-1);
    setGifUrls([]);

    try {
      // Convert to lowercase and split into words
      const textLower = inputText.toLowerCase().trim();
      const wordArray = textLower.split(/\s+/).filter((word) => word.length > 0);
      setWords(wordArray);

      if (wordArray.length === 0) {
        setError("No valid words found");
        setIsLoading(false);
        return;
      }

      // Fetch GIFs for each word
      const gifArray = [];
      for (const word of wordArray) {
        try {
          const gifUrl = await searchGiphyForWord(word);
          if (gifUrl) {
            gifArray.push(gifUrl);
          } else {
            console.warn(`No GIF found for word: ${word}`);
            gifArray.push(null); // Placeholder for missing GIFs
          }
        } catch (error) {
          console.error(`Failed to fetch GIF for "${word}":`, error);
          gifArray.push(null);
        }
      }

      setGifUrls(gifArray);

      // Start playing GIFs sequentially
      if (gifArray.length > 0 && gifArray.some((url) => url !== null)) {
        playGifSequence(0, gifArray);
      } else {
        setError("No GIFs found for the entered text");
      }
    } catch (error) {
      console.error("Error processing text:", error);
      setError(error.message || "Failed to process text");
    } finally {
      setIsLoading(false);
    }
  };

  // Play GIFs sequentially
  const playGifSequence = (index, gifArray) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Find next valid GIF
    let nextIndex = index;
    while (nextIndex < gifArray.length && gifArray[nextIndex] === null) {
      nextIndex++;
    }

    if (nextIndex >= gifArray.length) {
      // All GIFs played
      setCurrentWordIndex(-1);
      return;
    }

    // Set current word
    setCurrentWordIndex(nextIndex);

    // Schedule next GIF
    timeoutRef.current = setTimeout(() => {
      playGifSequence(nextIndex + 1, gifArray);
    }, GIF_DISPLAY_DURATION);
  };

  // Stop playing
  const handleStop = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setCurrentWordIndex(-1);
  };

  const currentGifUrl = currentWordIndex >= 0 && currentWordIndex < gifUrls.length
    ? gifUrls[currentWordIndex]
    : null;

  const currentWord = currentWordIndex >= 0 && currentWordIndex < words.length
    ? words[currentWordIndex].toUpperCase()
    : null;

  return (
    <div className="sign-gif-test-page">
      <div className="sign-gif-test-container">
        <h1 className="sign-gif-test-title">Text → Sign Language GIF Test</h1>
        <p className="sign-gif-test-subtitle">
          Experimental page - Converts text to Sign with Robert GIFs
        </p>

        <div className="sign-gif-test-input-section">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handlePlaySignLanguage()}
            placeholder="Type text here (e.g., hello how are you)"
            className="sign-gif-test-input"
            disabled={isLoading}
          />
          <div className="sign-gif-test-buttons">
            <button
              onClick={handlePlaySignLanguage}
              disabled={isLoading || !inputText.trim()}
              className="sign-gif-test-button sign-gif-test-button-primary"
            >
              {isLoading ? "Loading..." : "Play Sign Language"}
            </button>
            {currentWordIndex >= 0 && (
              <button
                onClick={handleStop}
                className="sign-gif-test-button sign-gif-test-button-secondary"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="sign-gif-test-error">
            <div className="sign-gif-test-error-title">⚠️ Setup Required</div>
            <div className="sign-gif-test-error-message">{error}</div>
            <div className="sign-gif-test-error-steps">
              <strong>Quick Setup:</strong>
              <ol>
                <li>Get a free API key from <a href="https://developers.giphy.com/" target="_blank" rel="noopener noreferrer">GIPHY Developers</a></li>
                <li>Create a <code>.env</code> file in the project root</li>
                <li>Add: <code>VITE_GIPHY_API_KEY=your_key_here</code></li>
                <li>Restart your dev server</li>
              </ol>
            </div>
          </div>
        )}

        <div className="sign-gif-test-display">
          {currentGifUrl ? (
            <>
              <div className="sign-gif-test-current-word">
                Now signing: <strong>{currentWord}</strong>
              </div>
              <div className="sign-gif-test-gif-container">
                <img
                  src={currentGifUrl}
                  alt={`Sign language for ${currentWord}`}
                  className="sign-gif-test-gif"
                />
              </div>
              <div className="sign-gif-test-progress">
                Word {currentWordIndex + 1} of {words.length}
              </div>
            </>
          ) : (
            <div className="sign-gif-test-placeholder">
              {isLoading ? (
                <div className="sign-gif-test-loading">Loading GIFs...</div>
              ) : (
                <div className="sign-gif-test-placeholder-text">
                  Enter text and click "Play Sign Language" to see GIFs
                </div>
              )}
            </div>
          )}
        </div>

        {words.length > 0 && (
          <div className="sign-gif-test-word-list">
            <h3>Words to sign:</h3>
            <div className="sign-gif-test-words">
              {words.map((word, index) => (
                <span
                  key={index}
                  className={`sign-gif-test-word-badge ${
                    index === currentWordIndex ? "active" : ""
                  } ${gifUrls[index] ? "" : "missing"}`}
                >
                  {word}
                  {!gifUrls[index] && " (no GIF)"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignGifTest;

