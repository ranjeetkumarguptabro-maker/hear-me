"""
Step 5 — Patch frontend JS files to add Transformer word recognition.

Files modified (changes are purely additive):
  1. src/mediaPipeGesture.js
       - Add initMediaPipeHolistic() — sets up @mediapipe/holistic
       - Add extractHolisticFeatures(results, sx, sy, sz) — returns 258-float array
       - Add drawHolisticLandmarks() — draws pose + both hands on canvas
       - All existing Hands exports remain unchanged

  2. src/hooks/useGestureRecognition.js
       - Add holisticRef for the Holistic instance
       - Add wordPrediction / wordConfidence state
       - When alphabet mode: send hand landmarks to /predict as before
       - When word mode: extract 258-dim holistic features, send to /predict-word/{roomId}
       - Return wordPrediction and wordConfidence from the hook

  3. src/pages/DeafCommunication.jsx
       - Destructure wordPrediction and wordConfidence from hook
       - Display word prominently when confidence >= 0.80
       - Display alphabet letter as fallback
       - Add confidence badge next to predicted word

Usage:
  python asl_training/step5_update_frontend.py

Backups are written alongside each file as .bak before patching.
"""

import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
SRC_DIR = PROJECT_ROOT / "src"

MEDIA_PIPE_JS = SRC_DIR / "mediaPipeGesture.js"
GESTURE_HOOK_JS = SRC_DIR / "hooks" / "useGestureRecognition.js"
DEAF_COMM_JSX = SRC_DIR / "pages" / "DeafCommunication.jsx"

PATCH_SENTINEL = "// [ASL-TRANSFORMER-PATCH-v1]"


def already_patched(source: str) -> bool:
    return PATCH_SENTINEL in source


def backup(path: Path):
    bak = path.with_suffix(path.suffix + ".bak")
    bak.write_text(path.read_text())
    print(f"  Backup: {bak}")


# ---------------------------------------------------------------------------
# Patch 1: mediaPipeGesture.js — add Holistic helpers
# ---------------------------------------------------------------------------
HOLISTIC_ADDITIONS = r"""
// [ASL-TRANSFORMER-PATCH-v1]
// ---------------------------------------------------------------------------
// MediaPipe Holistic helpers for word/sentence-level recognition
// ---------------------------------------------------------------------------
import { Holistic, HAND_CONNECTIONS as HOLISTIC_HAND_CONNECTIONS } from "@mediapipe/holistic";
import { POSE_CONNECTIONS } from "@mediapipe/holistic";

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
    refineFaceLandmarks: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  holistic.onResults(onResults);

  console.log("✅ MediaPipe Holistic initialized");
  return holistic;
};

/**
 * Extract 258-dimensional feature vector from Holistic results.
 * Layout: pose(132) + left_hand(63) + right_hand(63)
 * All xyz normalized by subtracting shoulder midpoint.
 * @returns {number[]|null} 258 floats, or null if pose not detected.
 */
export const extractHolisticFeatures = (results) => {
  if (!results.poseLandmarks) return null;

  const pose = results.poseLandmarks;
  const ls = pose[11]; // left shoulder
  const rs = pose[12]; // right shoulder
  const sx = (ls.x + rs.x) / 2;
  const sy = (ls.y + rs.y) / 2;
  const sz = (ls.z + rs.z) / 2;

  // Pose: 33 × 4 (x, y, z, visibility) = 132
  const poseVec = [];
  for (const lm of pose) {
    poseVec.push(lm.x - sx, lm.y - sy, lm.z - sz, lm.visibility ?? 1.0);
  }

  // Left hand: 21 × 3 = 63 (zeros if not detected)
  const lhVec = [];
  if (results.leftHandLandmarks) {
    for (const lm of results.leftHandLandmarks) {
      lhVec.push(lm.x - sx, lm.y - sy, lm.z - sz);
    }
  } else {
    lhVec.push(...Array(63).fill(0));
  }

  // Right hand: 21 × 3 = 63 (zeros if not detected)
  const rhVec = [];
  if (results.rightHandLandmarks) {
    for (const lm of results.rightHandLandmarks) {
      rhVec.push(lm.x - sx, lm.y - sy, lm.z - sz);
    }
  } else {
    rhVec.push(...Array(63).fill(0));
  }

  return [...poseVec, ...lhVec, ...rhVec]; // 258 floats
};

/**
 * Draw pose skeleton + both hand landmarks from Holistic results onto a canvas.
 */
export const drawHolisticLandmarks = (ctx, results, canvas) => {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.poseLandmarks) {
    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: "#6B7280",
      lineWidth: 1,
    });
  }
  if (results.rightHandLandmarks) {
    drawConnectors(ctx, results.rightHandLandmarks, HOLISTIC_HAND_CONNECTIONS, {
      color: "#A85CFF",
      lineWidth: 3,
    });
    drawLandmarks(ctx, results.rightHandLandmarks, { color: "#FFFFFF", lineWidth: 1, radius: 4 });
  }
  if (results.leftHandLandmarks) {
    drawConnectors(ctx, results.leftHandLandmarks, HOLISTIC_HAND_CONNECTIONS, {
      color: "#22D3EE",
      lineWidth: 3,
    });
    drawLandmarks(ctx, results.leftHandLandmarks, { color: "#FFFFFF", lineWidth: 1, radius: 4 });
  }
};
"""


def patch_mediapipe_gesture(source: str) -> str:
    # Append holistic helpers at end of file
    return source.rstrip() + "\n" + HOLISTIC_ADDITIONS + "\n"


# ---------------------------------------------------------------------------
# Patch 2: useGestureRecognition.js — add holistic word prediction
# ---------------------------------------------------------------------------

HOOK_IMPORT_ADDITION = (
    'import { initMediaPipeHands, processHandResults } from "../mediaPipeGesture";\n',
    'import { initMediaPipeHands, processHandResults, initMediaPipeHolistic, extractHolisticFeatures } from "../mediaPipeGesture";\n',
)

HOOK_STATE_ANCHOR = "  const [error, setError] = useState(\"\");\n"
HOOK_STATE_ADDITION = """  const [error, setError] = useState("");

  // Transformer word prediction state
  const [wordPrediction, setWordPrediction] = useState(null); // predicted word string
  const [wordConfidence, setWordConfidence] = useState(0);    // confidence 0..1
"""

HOOK_REFS_ANCHOR = "  const handsRef = useRef(null);\n"
HOOK_REFS_ADDITION = """  const handsRef = useRef(null);
  const holisticRef = useRef(null);  // Holistic instance for word transformer
"""

HOOK_RETURN_ANCHOR = "  return {\n    prediction,\n    predictionLabel,\n    isPredicting,\n    handDetected,\n    error,\n  };"
HOOK_RETURN_REPLACEMENT = """  return {
    prediction,
    predictionLabel,
    isPredicting,
    handDetected,
    error,
    wordPrediction,
    wordConfidence,
  };"""

# Inserted just before the closing `};` of the `useEffect` that runs initializeGestureRecognition
# Anchor: the cleanup return that stops handsRef.current
HOOK_HOLISTIC_CLEANUP_ANCHOR = """    return () => {
      isMounted = false;
      if (handsRef.current) {"""

HOOK_HOLISTIC_CLEANUP_ADDITION = """
  // Initialize Holistic for word transformer (runs alongside Hands)
  useEffect(() => {
    if (!enabled || !videoRef?.current) return;

    let isMounted = true;
    let holisticInst = null;
    let holisticCamera = null;

    const initHolistic = async () => {
      try {
        const { startMediaPipeCamera } = await import("../mediaPipeGesture");

        const onHolisticResults = async (results) => {
          if (!isMounted || !enabledRef.current) return;

          const features = extractHolisticFeatures(results);
          if (!features || features.length !== 258) return;

          // Only run transformer in word mode
          if (modeRef.current !== "word") return;

          const { getApiBaseUrl } = await import("../utils/apiConfig");
          const base = getApiBaseUrl();
          if (!roomId || !base) return;

          try {
            const resp = await fetch(`${base}/predict-word/${roomId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ landmarks: features }),
            });
            if (!resp.ok) return;
            const data = await resp.json();
            if (data.word && isMounted) {
              setWordPrediction(data.word);
              setWordConfidence(data.confidence ?? 0);

              // Relay word prediction to hearing participant
              if (lastSentPredictionRef.current !== data.word && roomId) {
                lastSentPredictionRef.current = data.word;
                gestureRelay.sendGesturePrediction(data.word).catch(() => {});
              }
            } else if (isMounted && !data.word) {
              // Buffer filling — don't clear display yet
            }
          } catch (_) {
            // Silently ignore network errors; alphabet fallback still works
          }
        };

        holisticInst = await initMediaPipeHolistic(onHolisticResults);
        holisticRef.current = holisticInst;

        const video = videoRef.current;
        let videoEl = video?.tagName === "VIDEO" ? video : video?.querySelector("video");
        if (!videoEl) return;

        holisticCamera = await startMediaPipeCamera(holisticInst, videoEl);
        holisticRef.current.camera = holisticCamera;
      } catch (err) {
        console.warn("Holistic init error (word transformer disabled):", err);
      }
    };

    initHolistic();

    return () => {
      isMounted = false;
      if (holisticRef.current?.camera) {
        try { holisticRef.current.camera.stop(); } catch (_) {}
      }
      try { holisticRef.current?.close?.(); } catch (_) {}
      holisticRef.current = null;
      setWordPrediction(null);
      setWordConfidence(0);
    };
  }, [enabled, videoRef, roomId]);

"""


def patch_gesture_hook(source: str) -> str:
    if already_patched(source):
        return source

    # Replace import line
    old_import, new_import = HOOK_IMPORT_ADDITION
    source = source.replace(old_import, new_import, 1)

    # Add wordPrediction/wordConfidence state (replace anchor + duplicate to avoid double insert)
    source = source.replace(
        HOOK_STATE_ANCHOR,
        HOOK_STATE_ADDITION,
        1,
    )

    # Add holisticRef
    source = source.replace(HOOK_REFS_ANCHOR, HOOK_REFS_ADDITION, 1)

    # Update return value
    source = source.replace(HOOK_RETURN_ANCHOR, HOOK_RETURN_REPLACEMENT, 1)

    # Insert Holistic useEffect before the cleanup return
    source = source.replace(
        HOOK_HOLISTIC_CLEANUP_ANCHOR,
        HOOK_HOLISTIC_CLEANUP_ADDITION + HOOK_HOLISTIC_CLEANUP_ANCHOR,
        1,
    )

    # Add sentinel
    source = "// [ASL-TRANSFORMER-PATCH-v1]\n" + source

    return source


# ---------------------------------------------------------------------------
# Patch 3: DeafCommunication.jsx — show word prediction with confidence badge
# ---------------------------------------------------------------------------

DEAF_HOOK_DESTRUCTURE_OLD = """  const {
    prediction: gesturePrediction,
    predictionLabel: gestureLabel,
    isPredicting: isGesturePredicting,
    handDetected: gestureHandDetected,
    error: gestureError,
  } = useGestureRecognition({"""

DEAF_HOOK_DESTRUCTURE_NEW = """  const {
    prediction: gesturePrediction,
    predictionLabel: gestureLabel,
    isPredicting: isGesturePredicting,
    handDetected: gestureHandDetected,
    error: gestureError,
    wordPrediction,
    wordConfidence,
  } = useGestureRecognition({"""

# Insert confidence badge display into DebugTools area
DEAF_DEBUG_TOOLS_OLD = """            {/* Debug Tools Overlay */}
            {gestureRecognitionEnabled && (
              <DebugTools
                showLandmarks={showLandmarks}
                onToggleLandmarks={() => setShowLandmarks(!showLandmarks)}
                predictionLabel={gestureLabel}
                handDetected={gestureHandDetected}
                isPredicting={isGesturePredicting}
                error={gestureError}
              />
            )}"""

DEAF_DEBUG_TOOLS_NEW = """            {/* Debug Tools Overlay */}
            {gestureRecognitionEnabled && (
              <DebugTools
                showLandmarks={showLandmarks}
                onToggleLandmarks={() => setShowLandmarks(!showLandmarks)}
                predictionLabel={
                  wordPrediction && wordConfidence >= 0.80
                    ? wordPrediction
                    : gestureLabel
                }
                handDetected={gestureHandDetected}
                isPredicting={isGesturePredicting}
                error={gestureError}
              />
            )}
            {/* Word prediction confidence badge */}
            {gestureRecognitionEnabled && wordPrediction && wordConfidence >= 0.80 && (
              <div style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                backgroundColor: "rgba(6, 2, 20, 0.85)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(168, 85, 247, 0.5)",
                borderRadius: "12px",
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                zIndex: 60,
                fontFamily: "'Inter', sans-serif",
              }}>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "#A85CFF", letterSpacing: "0.05em" }}>
                  {wordPrediction.toUpperCase()}
                </span>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: wordConfidence >= 0.90 ? "#10b981" : "#fbbf24",
                  backgroundColor: wordConfidence >= 0.90
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(251, 191, 36, 0.15)",
                  padding: "2px 8px",
                  borderRadius: "100px",
                }}>
                  {Math.round(wordConfidence * 100)}%
                </span>
              </div>
            )}"""


def patch_deaf_communication(source: str) -> str:
    if already_patched(source):
        return source

    source = source.replace(DEAF_HOOK_DESTRUCTURE_OLD, DEAF_HOOK_DESTRUCTURE_NEW, 1)
    source = source.replace(DEAF_DEBUG_TOOLS_OLD, DEAF_DEBUG_TOOLS_NEW, 1)
    source = "// [ASL-TRANSFORMER-PATCH-v1]\n" + source

    return source


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    for path in [MEDIA_PIPE_JS, GESTURE_HOOK_JS, DEAF_COMM_JSX]:
        if not path.exists():
            print(f"File not found: {path}")
            sys.exit(1)

    print("=" * 60)
    print("FRONTEND PATCH — ASL Transformer Word Recognition")
    print("=" * 60)
    print()

    # ---- mediaPipeGesture.js ----
    print("1. src/mediaPipeGesture.js")
    source = MEDIA_PIPE_JS.read_text()
    if already_patched(source):
        print("   Already patched — skipping.\n")
    else:
        backup(MEDIA_PIPE_JS)
        patched = patch_mediapipe_gesture(source)
        MEDIA_PIPE_JS.write_text(patched)
        print("   ✓ Added: initMediaPipeHolistic, extractHolisticFeatures, drawHolisticLandmarks\n")

    # ---- useGestureRecognition.js ----
    print("2. src/hooks/useGestureRecognition.js")
    source = GESTURE_HOOK_JS.read_text()
    if already_patched(source):
        print("   Already patched — skipping.\n")
    else:
        backup(GESTURE_HOOK_JS)
        patched = patch_gesture_hook(source)
        GESTURE_HOOK_JS.write_text(patched)
        print("   ✓ Added: wordPrediction, wordConfidence state + Holistic useEffect\n")

    # ---- DeafCommunication.jsx ----
    print("3. src/pages/DeafCommunication.jsx")
    source = DEAF_COMM_JSX.read_text()
    if already_patched(source):
        print("   Already patched — skipping.\n")
    else:
        backup(DEAF_COMM_JSX)
        patched = patch_deaf_communication(source)
        DEAF_COMM_JSX.write_text(patched)
        print("   ✓ Added: wordPrediction/wordConfidence destructuring + confidence badge overlay\n")

    print("=" * 60)
    print("Frontend patched successfully.")
    print()
    print("Install @mediapipe/holistic if not already installed:")
    print("  npm install @mediapipe/holistic")
    print()
    print("Restart the dev server:")
    print("  npm run dev")
    print()
    print("How it works at runtime:")
    print("  Alphabet mode → Hands model → /predict  (letters A-Z, unchanged)")
    print("  Word mode     → Holistic    → /predict-word/{roomId}  (100 ASL words)")
    print("  Word shown prominently when confidence >= 80%; falls back to letter.")


if __name__ == "__main__":
    main()
