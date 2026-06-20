import React, { useState, useRef, useEffect, useCallback } from "react";
import { getApiBaseUrl } from "../utils/apiConfig";
import { flattenLandmarks, checkAPIStatus } from "../api/aslApi";
import {
  initMediaPipeHands,
  startMediaPipeCamera,
  drawHandLandmarks,
  initMediaPipeHolistic,
  extractHolisticFeatures,
  drawHolisticLandmarks,
} from "../mediaPipeGesture";

// ─── constants ────────────────────────────────────────────────────────────────
const ALPHABET_THROTTLE_MS = 250;
const WORD_THROTTLE_MS = 100;
const CONFIDENCE_THRESHOLD = 0.35;
const MAX_SENTENCE_WORDS = 20;

// ─── helpers ──────────────────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color =
    pct >= 80 ? "#10b981" : pct >= 50 ? "#fbbf24" : "#ef4444";
  return (
    <div style={{ width: "100%", marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#9ca3af",
          marginBottom: 4,
        }}
      >
        <span>Confidence</span>
        <span style={{ color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 99,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 99,
            transition: "width 0.25s ease, background 0.25s ease",
          }}
        />
      </div>
    </div>
  );
}

function StatusDot({ ok, label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: ok ? "#10b981" : "#ef4444",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: ok ? "#10b981" : "#ef4444",
          boxShadow: ok ? "0 0 6px #10b981" : "0 0 6px #ef4444",
        }}
      />
      {label}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function ASLTestPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);    // MediaPipe Hands (alphabet mode)
  const holisticRef = useRef(null); // MediaPipe Holistic (word mode)
  const cameraRef = useRef(null);
  const lastAlphaRef = useRef(0);
  const lastWordRef = useRef(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [mode, setMode] = useState("alphabet"); // "alphabet" | "word"
  const [handDetected, setHandDetected] = useState(false);
  const [prediction, setPrediction] = useState(null);  // { label, confidence }
  const [wordResult, setWordResult] = useState(null);   // { word, confidence, buffered }
  const [sentence, setSentence] = useState([]);          // accumulated words
  const [isPredicting, setIsPredicting] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null); // null | true | false
  const [modelStatus, setModelStatus] = useState({
    alphabet: null,
    transformer: null,
  });
  const [error, setError] = useState("");

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
    // Restart camera when mode switches while running
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── backend health check ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function check() {
      const res = await checkAPIStatus();
      if (cancelled) return;
      setBackendStatus(res.running);
      if (res.running && res.data?.models_loaded) {
        setModelStatus({
          alphabet: res.data.models_loaded.alphabet ?? false,
          transformer: !!(res.data.models_loaded.word ?? res.data.models_loaded.transformer),
        });
      }
    }
    check();
    const id = setInterval(check, 10000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // ── Alphabet mode: MediaPipe Hands callback ───────────────────────────────
  const onHandResults = useCallback(async (results) => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const vid = videoRef.current;
      if (vid) {
        canvasRef.current.width = vid.videoWidth || 640;
        canvasRef.current.height = vid.videoHeight || 480;
      }
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (results.multiHandLandmarks?.length) {
        results.multiHandLandmarks.forEach((lms) =>
          drawHandLandmarks(ctx, lms, canvasRef.current.width, canvasRef.current.height)
        );
      }
    }

    const hasHand = !!results.multiHandLandmarks?.length;
    setHandDetected(hasHand);
    if (!hasHand) { setPrediction(null); return; }

    const landmarks = results.multiHandLandmarks[0];
    const flat = flattenLandmarks(landmarks);
    if (!flat) return;

    const now = Date.now();
    if (now - lastAlphaRef.current < ALPHABET_THROTTLE_MS) return;
    lastAlphaRef.current = now;
    setIsPredicting(true);
    try {
      const base = getApiBaseUrl();
      const resp = await fetch(`${base}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "alphabet", landmarks: flat }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.label) setPrediction({ label: data.label, confidence: 1.0 });
      }
    } catch (_) {
      setError("Backend unreachable");
    } finally {
      setIsPredicting(false);
    }
  }, []);

  // ── Word mode: Holistic callback (pose + hands = 258-dim) ─────────────────
  const onHolisticResults = useCallback(async (results) => {
    // Draw full skeleton like Speakliz
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const vid = videoRef.current;
      if (vid) {
        canvasRef.current.width = vid.videoWidth || 640;
        canvasRef.current.height = vid.videoHeight || 480;
      }
      drawHolisticLandmarks(ctx, results, canvasRef.current);
    }

    const hasPose = !!results.poseLandmarks;
    const hasHand = !!(results.leftHandLandmarks || results.rightHandLandmarks);
    setHandDetected(hasPose && hasHand);

    if (!hasPose) return;

    const now = Date.now();
    if (now - lastWordRef.current < WORD_THROTTLE_MS) return;
    lastWordRef.current = now;

    const features = extractHolisticFeatures(results);
    if (!features || features.length !== 258) return;

    try {
      const base = getApiBaseUrl();
      const resp = await fetch(`${base}/predict-word/asl-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landmarks: features }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setWordResult(data);
      if (data.word && data.confidence >= CONFIDENCE_THRESHOLD) {
        setPrediction({ label: data.word, confidence: data.confidence });
        setSentence((prev) => [...prev, data.word].slice(-MAX_SENTENCE_WORDS));
      }
    } catch (_) {}
  }, []);

  // ── start camera (Hands for alphabet, Holistic for word) ─────────────────
  const startCamera = useCallback(async () => {
    setError("");
    try {
      if (mode === "word") {
        const holistic = await initMediaPipeHolistic(onHolisticResults);
        holisticRef.current = holistic;
        const camera = await startMediaPipeCamera(holistic, videoRef.current);
        cameraRef.current = camera;
      } else {
        const hands = await initMediaPipeHands(onHandResults);
        handsRef.current = hands;
        const camera = await startMediaPipeCamera(hands, videoRef.current);
        cameraRef.current = camera;
      }
      setCameraActive(true);
    } catch (err) {
      setError("Camera error: " + err.message);
    }
  }, [mode, onHandResults, onHolisticResults]);

  // ── stop camera ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    try { cameraRef.current?.stop(); } catch (_) {}
    try { handsRef.current?.close(); } catch (_) {}
    try { holisticRef.current?.close(); } catch (_) {}
    cameraRef.current = null;
    handsRef.current = null;
    holisticRef.current = null;
    setCameraActive(false);
    setHandDetected(false);
    setPrediction(null);
    setWordResult(null);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ─── render ───────────────────────────────────────────────────────────────
  const bg = "#060214";
  const card = "rgba(255,255,255,0.04)";
  const border = "rgba(168,85,247,0.18)";
  const accent = "#A85CFF";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: bg,
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        padding: "0",
      }}
    >
      {/* ── header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: `1px solid ${border}`,
          backgroundColor: "rgba(6,2,20,0.8)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 8,
              transition: "color 0.2s",
            }}
          >
            ← Home
          </button>
          <span style={{ color: border }}>|</span>
          <span
            style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "0.03em" }}
          >
            ASL Recognition — Live Test
          </span>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <StatusDot
            ok={backendStatus === true}
            label={
              backendStatus === null
                ? "Checking backend…"
                : backendStatus
                ? "Backend online"
                : "Backend offline"
            }
          />
          {backendStatus && (
            <>
              <StatusDot
                ok={modelStatus.alphabet === true}
                label={
                  modelStatus.alphabet ? "Alphabet model ✓" : "Alphabet model ✗"
                }
              />
              <StatusDot
                ok={modelStatus.transformer === true}
                label={
                  modelStatus.transformer
                    ? "Transformer ✓"
                    : "Transformer (not trained)"
                }
              />
            </>
          )}
        </div>
      </div>

      {/* ── body ── */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 24px",
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* ── left: camera ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* camera card */}
          <div
            style={{
              background: "#0b0820",
              borderRadius: 20,
              border: `1px solid ${border}`,
              overflow: "hidden",
              position: "relative",
              aspectRatio: "4/3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
                display: cameraActive ? "block" : "none",
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                transform: "scaleX(-1)",
                pointerEvents: "none",
              }}
            />

            {/* placeholder */}
            {!cameraActive && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  color: "#6b7280",
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    border: `2px dashed ${border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                  }}
                >
                  📷
                </div>
                <span style={{ fontSize: 14 }}>Camera not started</span>
              </div>
            )}

            {/* hand detected pill */}
            {cameraActive && (
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "rgba(6,2,20,0.85)",
                  backdropFilter: "blur(10px)",
                  border: `1px solid ${handDetected ? "rgba(16,185,129,0.4)" : border}`,
                  borderRadius: 99,
                  padding: "6px 18px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: handDetected ? "#10b981" : "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: handDetected ? "#10b981" : "#6b7280",
                  }}
                />
                {handDetected ? "Hand detected" : "No hand in frame"}
              </div>
            )}

            {/* big prediction overlay (alphabet letter or word) */}
            {prediction && cameraActive && (
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  backgroundColor: "rgba(6,2,20,0.9)",
                  border: `1px solid ${accent}55`,
                  borderRadius: 14,
                  padding: "10px 20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: 80,
                }}
              >
                <span
                  style={{
                    fontSize: mode === "alphabet" ? 52 : 28,
                    fontWeight: 900,
                    color: accent,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {prediction.label}
                </span>
                {prediction.confidence < 1 && (
                  <span
                    style={{
                      fontSize: 11,
                      color:
                        prediction.confidence >= 0.9
                          ? "#10b981"
                          : prediction.confidence >= 0.7
                          ? "#fbbf24"
                          : "#ef4444",
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    {Math.round(prediction.confidence * 100)}%
                  </span>
                )}
              </div>
            )}

            {isPredicting && (
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  backgroundColor: "rgba(139,47,248,0.15)",
                  border: `1px solid ${accent}44`,
                  borderRadius: 8,
                  padding: "4px 12px",
                  fontSize: 11,
                  color: accent,
                  fontWeight: 600,
                }}
              >
                Predicting…
              </div>
            )}
          </div>

          {/* camera controls */}
          <div style={{ display: "flex", gap: 12 }}>
            {!cameraActive ? (
              <button
                onClick={startCamera}
                disabled={backendStatus === false}
                style={{
                  flex: 1,
                  padding: "14px",
                  background:
                    backendStatus === false
                      ? "#374151"
                      : "linear-gradient(135deg,#8B2FF8 0%,#A85CFF 100%)",
                  border: "none",
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: backendStatus === false ? "not-allowed" : "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                {backendStatus === false
                  ? "Start backend first"
                  : "Start Camera"}
              </button>
            ) : (
              <button
                onClick={stopCamera}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#1f1535",
                  border: `1px solid ${border}`,
                  borderRadius: 12,
                  color: "#ef4444",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Stop Camera
              </button>
            )}
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: 13,
                color: "#fca5a5",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* ── right panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* mode toggle */}
          <div
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: 16,
              padding: "16px 20px",
            }}
          >
            <div
              style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Recognition Mode
            </div>
            <div
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.05)",
                borderRadius: 99,
                padding: 4,
                gap: 4,
              }}
            >
              {["alphabet", "word"].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setPrediction(null);
                    setWordResult(null);
                    setSentence([]);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 99,
                    border: "none",
                    background:
                      mode === m
                        ? "linear-gradient(135deg,#8B2FF8 0%,#A85CFF 100%)"
                        : "transparent",
                    color: mode === m ? "#fff" : "#9ca3af",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.25s",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {mode === "word" && !modelStatus.transformer && backendStatus && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.25)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#fbbf24",
                  lineHeight: 1.5,
                }}
              >
                Transformer not trained yet.
                <br />Run <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>step3_train_model.py</code> then
                restart the backend.
              </div>
            )}
          </div>

          {/* current prediction card */}
          <div
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: 16,
              padding: "20px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6b7280",
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Current Prediction
            </div>

            <div
              style={{
                minHeight: 70,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {prediction ? (
                <div style={{ textAlign: "center", width: "100%" }}>
                  <div
                    style={{
                      fontSize: mode === "alphabet" ? 64 : 36,
                      fontWeight: 900,
                      color: accent,
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {prediction.label}
                  </div>
                  <ConfidenceBar value={prediction.confidence} />
                </div>
              ) : (
                <span style={{ fontSize: 13, color: "#4b5563" }}>
                  {cameraActive ? "Show your hand…" : "Start camera to begin"}
                </span>
              )}
            </div>

            {mode === "word" && wordResult && (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                Buffer: {wordResult.buffered ?? 0} / 30 frames
              </div>
            )}
          </div>

          {/* sentence builder (word mode only) */}
          {mode === "word" && (
            <div
              style={{
                background: card,
                border: `1px solid ${border}`,
                borderRadius: 16,
                padding: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Sentence Builder
                </div>
                {sentence.length > 0 && (
                  <button
                    onClick={() => setSentence([])}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6b7280",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {sentence.length === 0 ? (
                <p style={{ fontSize: 13, color: "#4b5563", margin: 0 }}>
                  Recognised words appear here
                </p>
              ) : (
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}
                >
                  {sentence.map((w, i) => (
                    <span
                      key={i}
                      style={{
                        background: "rgba(168,85,247,0.12)",
                        border: `1px solid ${accent}44`,
                        borderRadius: 99,
                        padding: "4px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#d8b4fe",
                      }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              )}

              {sentence.length > 0 && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 10,
                    fontSize: 14,
                    color: "#e5e7eb",
                    lineHeight: 1.6,
                    fontStyle: "italic",
                  }}
                >
                  {sentence.join(" ")}
                </div>
              )}
            </div>
          )}

          {/* backend instructions */}
          {backendStatus === false && (
            <div
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 14,
                padding: "16px 20px",
                fontSize: 12,
                color: "#fca5a5",
                lineHeight: 1.7,
              }}
            >
              <strong style={{ color: "#f87171" }}>Backend offline.</strong>
              <br />Start it with:
              <pre
                style={{
                  marginTop: 8,
                  background: "rgba(0,0,0,0.3)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#d1d5db",
                  overflowX: "auto",
                }}
              >
                {`cd backend\npython main.py`}
              </pre>
            </div>
          )}

          {/* example phrases */}
          {mode === "word" && (
            <div
              style={{
                background: card,
                border: `1px solid ${border}`,
                borderRadius: 16,
                padding: "16px 20px",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Try These Phrases
              </div>
              {[
                { phrase: "HOW + YOU", meaning: "How are you?" },
                { phrase: "WHO + YOU", meaning: "Who are you?" },
                { phrase: "WHAT + YOUR + NAME", meaning: "What is your name?" },
                { phrase: "WANT + WATER", meaning: "I want water" },
                { phrase: "NEED + HELP", meaning: "I need help" },
                { phrase: "YES / NO", meaning: "Yes / No" },
              ].map(({ phrase, meaning }) => (
                <div key={phrase} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", fontFamily: "monospace" }}>{phrase}</span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{meaning}</span>
                </div>
              ))}
            </div>
          )}

          {/* supported words */}
          {mode === "word" && (
            <div
              style={{
                background: card,
                border: `1px solid ${border}`,
                borderRadius: 16,
                padding: "16px 20px",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Supported Words (25)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["again","bad","drink","go","good","home","how","know","like","more",
                  "name","need","no","not","now","school","wait","want","water",
                  "what","who","work","yes","you","your"].map(w => (
                  <span key={w} style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 99, padding: "2px 10px", fontSize: 11, color: "#c4b5fd", fontWeight: 600 }}>
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* how-to card */}
          <div
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: 16,
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6b7280",
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              How to use
            </div>
            <ol
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 12,
                color: "#9ca3af",
                lineHeight: 2,
              }}
            >
              <li>Click <strong style={{ color: "#c4b5fd" }}>Start Camera</strong></li>
              <li>Choose <strong style={{ color: "#c4b5fd" }}>Word</strong> mode for sentences</li>
              <li>Hold each sign steady for ~1–2 seconds</li>
              <li>Sign words in order to build a sentence</li>
              <li>Pause between words for accurate recognition</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
