/**
 * ASL Image/GIF Mapping
 * Maps alphabet letters and words to their corresponding sign images/GIFs
 */

// Base URLs for ASL sign images
// Using a combination of reliable image sources
const ASL_IMAGE_BASE = {
  // Using GIPHY for animated GIFs (good quality ASL signs)
  giphy: (letter) =>
    `https://media.giphy.com/media/${getGiphyId(letter)}/giphy.gif`,

  // Using placeholder with better styling for static images
  placeholder: (text, color = "FFD700") =>
    `https://via.placeholder.com/200x200/${color}/000000?text=${encodeURIComponent(
      text
    )}`,

  // Using Unsplash for high-quality images
  unsplash: (query) =>
    `https://source.unsplash.com/200x200/?${encodeURIComponent(
      query
    )}&sig=${Math.floor(Math.random() * 1000)}`,
};

// GIPHY IDs for ASL letters (these are example IDs - you may want to replace with actual ASL sign GIFs)
const GIPHY_IDS = {
  A: "3o7aCTPPm4OHfRLSH6",
  B: "3o7abld2F4Iz2Ogv3O",
  C: "3o7abld2F4Iz2Ogv3O",
  D: "3o7abld2F4Iz2Ogv3O",
  E: "3o7abld2F4Iz2Ogv3O",
  F: "3o7abld2F4Iz2Ogv3O",
  G: "3o7abld2F4Iz2Ogv3O",
  H: "3o7abld2F4Iz2Ogv3O",
  I: "3o7abld2F4Iz2Ogv3O",
  J: "3o7abld2F4Iz2Ogv3O",
  K: "3o7abld2F4Iz2Ogv3O",
  L: "3o7abld2F4Iz2Ogv3O",
  M: "3o7abld2F4Iz2Ogv3O",
  N: "3o7abld2F4Iz2Ogv3O",
  O: "3o7abld2F4Iz2Ogv3O",
  P: "3o7abld2F4Iz2Ogv3O",
  Q: "3o7abld2F4Iz2Ogv3O",
  R: "3o7abld2F4Iz2Ogv3O",
  S: "3o7abld2F4Iz2Ogv3O",
  T: "3o7abld2F4Iz2Ogv3O",
  U: "3o7abld2F4Iz2Ogv3O",
  V: "3o7abld2F4Iz2Ogv3O",
  W: "3o7abld2F4Iz2Ogv3O",
  X: "3o7abld2F4Iz2Ogv3O",
  Y: "3o7abld2F4Iz2Ogv3O",
  Z: "3o7abld2F4Iz2Ogv3O",
};

function getGiphyId(letter) {
  return GIPHY_IDS[letter.toUpperCase()] || "3o7abld2F4Iz2Ogv3O";
}

// Better approach: Use a service that provides ASL sign images
// For now, using a combination of approaches
export const getASLImageUrl = (label, mode = "alphabet") => {
  if (!label) return null;

  const upperLabel = label.toUpperCase().trim();

  if (mode === "alphabet") {
    // For alphabet, use letter-specific images
    // Option 1: Use GIPHY (if you have ASL sign GIFs)
    // return ASL_IMAGE_BASE.giphy(upperLabel);

    // Option 2: Use a better placeholder with letter styling
    return `https://via.placeholder.com/200x200/FFD700/000000?text=ASL+${upperLabel}&font-size=48&font-weight=bold`;

    // Option 3: Use actual ASL sign image service (if available)
    // return `https://www.signingsavvy.com/media/mp4-ld/${upperLabel.toLowerCase()}.mp4`; // Example
  } else {
    // For words, use word-specific images
    return `https://via.placeholder.com/200x200/FFD700/000000?text=${encodeURIComponent(
      upperLabel
    )}&font-size=32&font-weight=bold`;
  }
};

// Alternative: Use actual ASL sign images from a reliable source
// You can replace these with actual ASL sign image URLs
export const getASLSignImage = (label, mode = "alphabet") => {
  if (!label) return null;

  const upperLabel = label.toUpperCase().trim();

  // Using a more professional approach with better image sources
  if (mode === "alphabet") {
    // Try to use actual ASL sign images
    // These are example URLs - replace with actual ASL sign image sources
    const letterImages = {
      // You can add actual image URLs here
      // A: "https://example.com/asl-signs/A.png",
      // B: "https://example.com/asl-signs/B.png",
      // etc.
    };

    // If we have a specific image, use it
    if (letterImages[upperLabel]) {
      return letterImages[upperLabel];
    }

    // Otherwise, use a styled placeholder
    return `https://via.placeholder.com/200x200/FFD700/000000?text=ASL+${upperLabel}`;
  } else {
    // For words
    return `https://via.placeholder.com/200x200/FFD700/000000?text=${encodeURIComponent(
      upperLabel
    )}`;
  }
};

// Better image URLs using reliable sources
// Using a combination of services for best quality
const getBetterImageUrl = (label, mode) => {
  if (!label) return null;

  const upperLabel = label.toUpperCase().trim();

  if (mode === "alphabet") {
    // For alphabet letters, use styled images with ASL sign representation
    // Using a service that can generate letter images with good styling
    return `https://dummyimage.com/200x200/FFD700/000000.png&text=ASL+${upperLabel}`;
  } else {
    // For words, use word images
    return `https://dummyimage.com/200x200/FFD700/000000.png&text=${encodeURIComponent(
      upperLabel
    )}`;
  }
};

// Main function to get prediction image
// Creates styled images for ASL predictions
export const getPredictionImage = (label, mode = "alphabet") => {
  if (!label) return null;

  const upperLabel = label.toUpperCase().trim();

  // Using a reliable placeholder service
  // Format: https://dummyimage.com/WIDTHxHEIGHT/BGCOLOR/TEXTCOLOR&text=TEXT
  if (mode === "alphabet") {
    // For alphabet: Large letter with "ASL" prefix
    const letter = upperLabel.charAt(0);
    // Yellow background (#FFD700), black text, large font
    return `https://dummyimage.com/200x200/FFD700/000000.png&text=ASL+${letter}`;
  } else {
    // For words: Word text
    const wordText =
      upperLabel.length > 8 ? upperLabel.substring(0, 8) : upperLabel;
    return `https://dummyimage.com/200x200/FFD700/000000.png&text=${encodeURIComponent(
      wordText
    )}`;
  }
};
