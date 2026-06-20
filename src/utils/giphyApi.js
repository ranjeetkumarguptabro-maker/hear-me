/**
 * GIPHY API utility for Sign Language GIFs
 * Supports multiple sources with priority: @theaslgifs (primary), @signwithrobert (fallback)
 */

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || "";

// GIF sources in priority order (highest priority first)
const GIF_SOURCES = [
  "theaslgifs",      // Primary source (highest priority)
  "signwithrobert",  // Secondary source (existing fallback)
];

/**
 * Search GIPHY for a word from a specific username
 * @param {string} word - The word to search for
 * @param {string} username - The GIPHY username to search
 * @returns {Promise<string|null>} - GIF URL or null if not found
 */
const searchGiphyForWordFromSource = async (word, username) => {
  const apiKey = GIPHY_API_KEY || import.meta.env.VITE_GIPHY_API_KEY || "";
  
  if (!apiKey) {
    console.warn("GIPHY API key not configured");
    return null;
  }

  if (!word || word.trim() === "") {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(word)}&username=${username}&limit=10&rating=g`
    );

    if (!response.ok) {
      console.error(`GIPHY API error for ${username}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      // Filter to ensure it's from the specified username
      const sourceGifs = data.data.filter(
        (gif) => gif.user && gif.user.username === username
      );

      if (sourceGifs.length > 0) {
        // Return the first valid GIF URL from this source
        return sourceGifs[0].images.original.url;
      } else if (data.data.length > 0) {
        // If no exact match, try the first result (might still be from the source)
        return data.data[0].images.original.url;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error searching GIPHY for "${word}" from ${username}:`, error);
    return null;
  }
};

/**
 * Search GIPHY for a word with multi-source priority
 * Searches sources in priority order: @theaslgifs first, then @signwithrobert
 * @param {string} word - The word to search for
 * @returns {Promise<string|null>} - GIF URL or null if not found
 */
export const searchGiphyForWord = async (word) => {
  if (!word || word.trim() === "") {
    return null;
  }

  // Search sources in priority order
  for (const source of GIF_SOURCES) {
    const gifUrl = await searchGiphyForWordFromSource(word, source);
    if (gifUrl) {
      // Found in this source, return immediately (stop searching)
      return gifUrl;
    }
  }

  // Not found in any source
  return null;
};

/**
 * Process text and get GIF URLs for each word
 * @param {string} text - The text to process
 * @returns {Promise<Array<{word: string, gifUrl: string|null}>>} - Array of word-GIF pairs
 */
export const processTextToGIFs = async (text) => {
  if (!text || text.trim() === "") {
    return [];
  }

  // Convert to lowercase and split into words
  const textLower = text.toLowerCase().trim();
  const words = textLower.split(/\s+/).filter((word) => word.length > 0);

  if (words.length === 0) {
    return [];
  }

  // Fetch GIFs for each word (in parallel for better performance)
  const gifPromises = words.map(async (word) => {
    const gifUrl = await searchGiphyForWord(word);
    return { word, gifUrl };
  });

  return Promise.all(gifPromises);
};



