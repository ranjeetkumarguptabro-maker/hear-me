// Real-time hand gesture detection using MediaPipe Hands
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";

/**
 * Classify gesture from hand landmarks
 * @param {Array} landmarks - Hand landmarks array
 * @returns {string|null} Detected gesture (HELP, YES, NO) or null
 */
function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  // Get key points
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbMcp = landmarks[2];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const indexMcp = landmarks[5];
  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  const middleMcp = landmarks[9];
  const ringTip = landmarks[16];
  const ringPip = landmarks[14];
  const ringMcp = landmarks[13];
  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];
  const pinkyMcp = landmarks[17];
  const wrist = landmarks[0];

  // Helper: Check if finger is extended
  const isExtended = (tip, pip, mcp) => {
    return tip.y < pip.y && pip.y < mcp.y;
  };

  // Helper: Check if finger is curled
  const isCurled = (tip, pip, mcp) => {
    return tip.y > pip.y && pip.y > mcp.y;
  };

  // Check thumb direction (left/right hand)
  const thumbExtended = thumbTip.x > thumbIp.x || thumbTip.x < thumbIp.x;
  const thumbUp = thumbTip.y < thumbMcp.y;

  // Check each finger
  const indexExtended = isExtended(indexTip, indexPip, indexMcp);
  const middleExtended = isExtended(middleTip, middlePip, middleMcp);
  const ringExtended = isExtended(ringTip, ringPip, ringMcp);
  const pinkyExtended = isExtended(pinkyTip, pinkyPip, pinkyMcp);

  // HELP: All fingers extended (open palm)
  if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return "HELP";
  }

  // YES: Thumbs up (thumb extended upward, other fingers curled)
  if (
    thumbUp &&
    !indexExtended &&
    !middleExtended &&
    !ringExtended &&
    !pinkyExtended
  ) {
    return "YES";
  }

  // NO: Thumbs down or closed fist
  if (
    !thumbUp &&
    !indexExtended &&
    !middleExtended &&
    !ringExtended &&
    !pinkyExtended
  ) {
    return "NO";
  }

  return null;
}

/**
 * Initialize MediaPipe Hands model
 * @param {Function} onResults - Callback for when hands are detected
 * @returns {Promise<Hands>} Initialized Hands instance
 */
export const initMediaPipeHands = async (onResults) => {
  console.log("🚀 Initializing MediaPipe Hands...");

  const hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    },
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  hands.onResults(onResults);

  console.log("✅ MediaPipe Hands initialized");
  return hands;
};

/**
 * Start camera feed with MediaPipe processing
 * @param {Hands} hands - MediaPipe Hands instance
 * @param {HTMLVideoElement} videoElement - Video element
 * @returns {Promise<Camera>} Camera instance
 */
export const startMediaPipeCamera = async (hands, videoElement) => {
  console.log("📹 Starting MediaPipe camera...");

  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480,
    facingMode: "user",
  });

  await camera.start();
  console.log("✅ MediaPipe camera started");

  return camera;
};

/**
 * Draw hand landmarks on canvas (optimized)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} landmarks - Hand landmarks
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export const drawHandLandmarks = (ctx, landmarks, width, height) => {
  if (!ctx || !landmarks) return;

  // Don't clear here - already cleared in processHandResults
  // Optimize drawing by setting styles once
  ctx.strokeStyle = "#FFFFFF";
  ctx.fillStyle = "#FFFFFF";
  ctx.lineWidth = 1;

  // Draw connections with distinct color
  drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
    color: "#A85CFF", // Neon Purple
    lineWidth: 3,
  });
  
  // Draw landmarks as white dots
  drawLandmarks(ctx, landmarks, {
    color: "#FFFFFF",
    lineWidth: 1,
    radius: 4,
  });
};

// Cache canvas size to avoid setting it on every frame
let cachedCanvasWidth = 0;
let cachedCanvasHeight = 0;

/**
 * Process MediaPipe results and detect gesture (optimized for performance)
 * @param {Object} results - MediaPipe results object
 * @param {Function} onGestureDetected - Callback when gesture is detected
 * @param {HTMLCanvasElement} canvas - Canvas for drawing
 * @returns {string|null} Detected gesture
 */
export const processHandResults = (
  results,
  onGestureDetected,
  canvas = null
) => {
  // Draw video and landmarks if canvas is provided
  if (canvas) {
    const ctx = canvas.getContext("2d");
    
    // Only set canvas size if it changed (avoids expensive reflows)
    if (results.image) {
      const newWidth = results.image.width;
      const newHeight = results.image.height;
      if (cachedCanvasWidth !== newWidth || cachedCanvasHeight !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        cachedCanvasWidth = newWidth;
        cachedCanvasHeight = newHeight;
      }
    }

    // Clear canvas efficiently
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw landmarks if hand(s) is detected

    // Draw landmarks if hand(s) is detected
    if (
      results.multiHandLandmarks &&
      results.multiHandLandmarks.length > 0
    ) {
      // Draw landmarks for all detected hands
      results.multiHandLandmarks.forEach((landmarks) => {
        drawHandLandmarks(
          ctx,
          landmarks,
          canvas.width,
          canvas.height
        );
      });
    }
  }

  // Detect gesture from landmarks
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    const gesture = classifyGesture(landmarks);

    if (gesture && onGestureDetected) {
      onGestureDetected(gesture);
    }

    return gesture;
  }

  return null;
};

/**
 * Extract 126-dim features from MediaPipe Hands results for the word Transformer.
 * Layout: left_hand(63) + right_hand(63)
 * Each hand: 21 landmarks × (x-wx, y-wy, z-wz), normalized to its own wrist.
 * Missing hand = zeros.
 *
 * @param {Object} results - MediaPipe Hands results (multiHandLandmarks, multiHandedness)
 * @returns {number[]|null} 126 floats, or null if no hands detected
 */
export const extractBothHandsFeatures = (results) => {
  if (!results.multiHandLandmarks?.length) return null;

  const zeros63 = () => Array(63).fill(0);

  const handVec = (landmarks) => {
    const wrist = landmarks[0];
    const wx = wrist.x, wy = wrist.y, wz = wrist.z;
    // Scale = wrist → middle-finger MCP (landmark 9), matches Python training
    const mid = landmarks[9];
    const scale = Math.sqrt((mid.x-wx)**2 + (mid.y-wy)**2 + (mid.z-wz)**2) || 1.0;
    const vec = [];
    for (const lm of landmarks) {
      vec.push((lm.x - wx) / scale, (lm.y - wy) / scale, (lm.z - wz) / scale);
    }
    return vec;
  };

  let leftHand = null;
  let rightHand = null;

  results.multiHandLandmarks.forEach((landmarks, i) => {
    const label = results.multiHandedness?.[i]?.classification?.[0]?.label;
    const vec = handVec(landmarks);
    if (label === "Left") leftHand = vec;
    else if (label === "Right") rightHand = vec;
    else {
      if (!leftHand) leftHand = vec;
      else if (!rightHand) rightHand = vec;
    }
  });

  return [...(leftHand ?? zeros63()), ...(rightHand ?? zeros63())]; // 126 floats
};

// [ASL-TRANSFORMER-PATCH-v1]
// ---------------------------------------------------------------------------
// MediaPipe Holistic helpers for word/sentence-level recognition
// ---------------------------------------------------------------------------
import { Holistic, HAND_CONNECTIONS as HOLISTIC_HAND_CONNECTIONS, POSE_CONNECTIONS, FACEMESH_TESSELATION, FACEMESH_RIGHT_EYE, FACEMESH_LEFT_EYE } from "@mediapipe/holistic";

/**
 * Initialize MediaPipe Holistic (for word/sentence transformer model).
 * Returns a Holistic instance; caller must attach onResults and start a Camera.
 */
export const initMediaPipeHolistic = async (onResults) => {
  console.log("🚀 Initializing MediaPipe Holistic...");

  const holistic = new Holistic({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
  });

  holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    refineFaceLandmarks: true, // Enable refined face/iris landmarks
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  holistic.onResults(onResults);

  console.log("✅ MediaPipe Holistic initialized");
  return holistic;
};

/**
 * Extract 258-dim features from Holistic results.
 * Layout: pose(132) + left_hand(63) + right_hand(63)
 * Normalization matches Python training exactly:
 *   origin = shoulder midpoint (pose[11]+pose[12])/2
 *   scale  = shoulder-to-shoulder distance (camera-distance invariant)
 * @returns {number[]|null} 258 floats, or null if pose not detected.
 */
export const extractHolisticFeatures = (results) => {
  if (!results.poseLandmarks) return null;

  const pose = results.poseLandmarks;
  const ls = pose[11]; // left shoulder
  const rs = pose[12]; // right shoulder
  const ox = (ls.x + rs.x) / 2;
  const oy = (ls.y + rs.y) / 2;
  const oz = (ls.z + rs.z) / 2;
  const scale = Math.sqrt((ls.x-rs.x)**2 + (ls.y-rs.y)**2 + (ls.z-rs.z)**2) || 1.0;

  // Pose: 33 × 4 = 132
  const poseVec = [];
  for (const lm of pose) {
    poseVec.push(
      (lm.x - ox) / scale,
      (lm.y - oy) / scale,
      (lm.z - oz) / scale,
      lm.visibility ?? 1.0
    );
  }

  // Left hand: 21 × 3 = 63
  const lhVec = [];
  if (results.leftHandLandmarks) {
    for (const lm of results.leftHandLandmarks) {
      lhVec.push((lm.x - ox) / scale, (lm.y - oy) / scale, (lm.z - oz) / scale);
    }
  } else {
    lhVec.push(...Array(63).fill(0));
  }

  // Right hand: 21 × 3 = 63
  const rhVec = [];
  if (results.rightHandLandmarks) {
    for (const lm of results.rightHandLandmarks) {
      rhVec.push((lm.x - ox) / scale, (lm.y - oy) / scale, (lm.z - oz) / scale);
    }
  } else {
    rhVec.push(...Array(63).fill(0));
  }

  return [...poseVec, ...lhVec, ...rhVec]; // 258 floats
};

/**
 * Draw face, pose skeleton, and both hand landmarks from Holistic results onto a canvas.
 * Includes face mesh tessellation, eye contours, eyebrows, and lips.
 */
export const drawHolisticLandmarks = (ctx, results, canvas) => {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw a single small dot per iris center
  if (results.faceLandmarks) {
    const lms = results.faceLandmarks;
    // Index 468 = right iris center, 473 = left iris center (refineFaceLandmarks=true)
    [468, 473].forEach((i) => {
      if (!lms[i]) return;
      const x = lms[i].x * canvas.width;
      const y = lms[i].y * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 211, 238, 0.9)";
      ctx.fill();
    });
  }

  // Draw pose skeleton (subtle gray, upper body only)
  if (results.poseLandmarks) {
    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: "rgba(107, 114, 128, 0.5)",
      lineWidth: 1,
    });
  }

  // Right hand - purple
  if (results.rightHandLandmarks) {
    drawConnectors(ctx, results.rightHandLandmarks, HOLISTIC_HAND_CONNECTIONS, {
      color: "#A85CFF",
      lineWidth: 3,
    });
    drawLandmarks(ctx, results.rightHandLandmarks, { color: "#FFFFFF", lineWidth: 1, radius: 4 });
  }
  // Left hand - cyan
  if (results.leftHandLandmarks) {
    drawConnectors(ctx, results.leftHandLandmarks, HOLISTIC_HAND_CONNECTIONS, {
      color: "#22D3EE",
      lineWidth: 3,
    });
    drawLandmarks(ctx, results.leftHandLandmarks, { color: "#FFFFFF", lineWidth: 1, radius: 4 });
  }
};

