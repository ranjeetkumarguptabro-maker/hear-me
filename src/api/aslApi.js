/**
 * ASL Recognition API Client
 * Sends hand landmarks to FastAPI backend for prediction
 */

import { getApiBaseUrl, getApiUrl } from '../utils/apiConfig';

const API_BASE_URL = getApiBaseUrl();

/**
 * Convert MediaPipe landmarks array to flat array of 63 values (21 points × 3 coords)
 * @param {Array} landmarks - MediaPipe landmarks array (21 points with x, y, z)
 * @returns {Array<number>} Flat array of 63 float values [x1, y1, z1, x2, y2, z2, ...]
 */
export const flattenLandmarks = (landmarks) => {
  if (!landmarks || landmarks.length !== 21) {
    console.warn(
      "Invalid landmarks array. Expected 21 points, got:",
      landmarks?.length
    );
    return null;
  }

  const flatArray = [];
  for (const point of landmarks) {
    flatArray.push(point.x, point.y, point.z);
  }

  return flatArray;
};

/**
 * Check if backend API is running
 */
export const checkAPIStatus = async () => {
  try {
    const response = await fetch(getApiUrl('/'), {
      method: "GET",
    });
    if (response.ok) {
      const data = await response.json();
      return { running: true, data };
    }
    return { running: false, error: `Status: ${response.status}` };
  } catch (error) {
    return { running: false, error: error.message };
  }
};

/**
 * Send landmarks to FastAPI backend for prediction
 * Supports both /predict (main.py) and /predict/alphabet, /predict/word (simple_test_api.py)
 * @param {string} mode - "alphabet" or "word"
 * @param {Array<number>} landmarks - For alphabet: 63 values, For word: 30×63 = 1890 values (sequence buffer)
 * @returns {Promise<{prediction: number, label: string}>} Prediction result with label
 */
export const predictASL = async (mode, landmarks) => {
  if (mode !== "alphabet" && mode !== "word") {
    throw new Error("Invalid mode: must be 'alphabet' or 'word'");
  }

  // Validate landmarks based on mode
  if (mode === "alphabet") {
    if (!landmarks || landmarks.length !== 63) {
      console.warn(`Invalid landmarks for alphabet: got ${landmarks?.length}, expected 63`);
      return null;
    }
  } else if (mode === "word") {
    if (!landmarks || landmarks.length !== 1890) {
      console.warn(`Invalid landmarks for word: got ${landmarks?.length}, expected 1890`);
      return null;
    }
  }

  try {
    // Try the unified /predict endpoint first (main.py)
    let response = await fetch(getApiUrl('/predict'), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode,
        landmarks,
      }),
    });

    // If that fails, try the separate endpoints (simple_test_api.py)
    if (!response.ok) {
      const endpoint = mode === "alphabet" ? "/predict/alphabet" : "/predict/word";
      response = await fetch(getApiUrl(endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(landmarks),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status}`, errorText);
      throw new Error(`API request failed: ${response.status}. Make sure backend is running.`);
    }

    const data = await response.json();

    // Handle different response formats
    if (data.error) {
      throw new Error(data.error);
    }

    // Backend returns both prediction (class index) and label
    if (data.prediction !== undefined && data.label !== undefined) {
      return {
        prediction: typeof data.prediction === 'number' ? data.prediction : parseInt(data.prediction),
        label: data.label,
      };
    }

    // Fallback: if only label is returned
    if (data.label) {
      return {
        prediction: 0,
        label: data.label,
      };
    }

    throw new Error(`Invalid response format: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error("Error calling ASL API:", error);
    // Don't throw, return null so UI can handle gracefully
    return null;
  }
};
