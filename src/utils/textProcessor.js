/**
 * Text Processing Utility for Sign Language GIF Playback
 * Cleans and processes text before sending to GIF API
 */

// Common filler words to remove
const FILLER_WORDS = new Set([
  "uh",
  "um",
  "er",
  "ah",
  "oh",
  "hmm",
  "like",
  "you know",
  "well",
  "so",
  "actually",
  "basically",
  "literally",
  "just",
  "really",
  "very",
  "quite",
]);

/**
 * Clean text: lowercase, remove punctuation, trim
 * @param {string} text - Raw text input
 * @returns {string} - Cleaned text
 */
export const cleanText = (text) => {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
};

/**
 * Remove filler words from text
 * @param {string} text - Cleaned text
 * @returns {string} - Text without filler words
 */
export const removeFillerWords = (text) => {
  if (!text) return "";

  const words = text.split(/\s+/);
  const filtered = words.filter(
    (word) => !FILLER_WORDS.has(word.toLowerCase())
  );
  return filtered.join(" ").trim();
};

/**
 * Split text based on mode (alphabet or word)
 * @param {string} text - Cleaned text
 * @param {string} mode - "alphabet" or "word"
 * @returns {string[]} - Array of units (characters or words)
 */
export const splitByMode = (text, mode) => {
  if (!text) return [];

  if (mode === "alphabet") {
    // Split into individual characters (excluding spaces)
    return text
      .split("")
      .filter((char) => char.trim() !== "")
      .filter((char) => /[a-z0-9]/i.test(char)); // Only letters and numbers
  } else {
    // Split into words
    return text.split(/\s+/).filter((word) => word.length > 0);
  }
};

/**
 * Process text for GIF API: clean, remove fillers, split by mode
 * @param {string} rawText - Raw transcription text
 * @param {string} mode - "alphabet" or "word"
 * @returns {string[]} - Array of processed units ready for GIF API
 */
export const processTextForGIFs = (rawText, mode = "word") => {
  if (!rawText || typeof rawText !== "string") {
    return [];
  }

  // Step 1: Clean text
  let cleaned = cleanText(rawText);

  // Step 2: Remove filler words (only in word mode)
  if (mode === "word") {
    cleaned = removeFillerWords(cleaned);
  }

  // Step 3: Split by mode
  const units = splitByMode(cleaned, mode);

  // Step 4: Filter out empty units
  return units.filter((unit) => unit && unit.trim().length > 0);
};

/**
 * Process text with priority-based search: sentence → word → alphabet
 * Returns an array of search units in priority order
 * @param {string} rawText - Raw transcription text
 * @param {string} signMode - "sentence" or "word"
 * @returns {Array<{unit: string, type: 'sentence'|'word'|'alphabet', priority: number}>}
 */
export const processTextWithPriority = (rawText, signMode = "sentence") => {
  if (!rawText || typeof rawText !== "string") {
    return [];
  }

  // Step 1: Clean text (but keep sentence structure)
  let cleaned = cleanText(rawText);

  // Remove filler words
  cleaned = removeFillerWords(cleaned);

  if (!cleaned || cleaned.trim().length === 0) {
    return [];
  }

  const units = [];

  if (signMode === "sentence") {
    // Priority 1: Full sentence
    units.push({
      unit: cleaned.trim(),
      type: "sentence",
      priority: 1,
    });

    // Priority 2: Individual words
    const words = cleaned.split(/\s+/).filter((word) => word.length > 0);
    words.forEach((word) => {
      units.push({
        unit: word.trim(),
        type: "word",
        priority: 2,
      });
    });

    // Priority 3: Individual characters (fallback only)
    const chars = cleaned
      .split("")
      .filter((char) => char.trim() !== "")
      .filter((char) => /[a-z0-9]/i.test(char));
    chars.forEach((char) => {
      units.push({
        unit: char,
        type: "alphabet",
        priority: 3,
      });
    });
  } else {
    // Word mode: Skip sentence, start with words
    // Priority 1: Individual words
    const words = cleaned.split(/\s+/).filter((word) => word.length > 0);
    words.forEach((word) => {
      units.push({
        unit: word.trim(),
        type: "word",
        priority: 1,
      });
    });

    // Priority 2: Individual characters (fallback only)
    const chars = cleaned
      .split("")
      .filter((char) => char.trim() !== "")
      .filter((char) => /[a-z0-9]/i.test(char));
    chars.forEach((char) => {
      units.push({
        unit: char,
        type: "alphabet",
        priority: 2,
      });
    });
  }

  return units;
};
