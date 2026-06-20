import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { getApiUrl } from "../utils/apiConfig";

// Lazy load Azure SDK to improve initial page load
let CallClient, CallAgent, VideoStreamRenderer, LocalVideoStream, AzureCommunicationTokenCredential;

const loadAzureSDK = async () => {
  if (!CallClient) {
    const callingModule = await import("@azure/communication-calling");
    const commonModule = await import("@azure/communication-common");
    CallClient = callingModule.CallClient;
    CallAgent = callingModule.CallAgent;
    VideoStreamRenderer = callingModule.VideoStreamRenderer;
    LocalVideoStream = callingModule.LocalVideoStream;
    AzureCommunicationTokenCredential = commonModule.AzureCommunicationTokenCredential;
  }
  return { CallClient, CallAgent, VideoStreamRenderer, LocalVideoStream, AzureCommunicationTokenCredential };
};

/**
 * Azure Video Call Panel Component
 * 2-panel layout: Local user (left) and Remote user (right)
 * Integrates with existing Communication page without breaking features
 */
const AzureVideoCallPanel = () => {
  // State
  const [isCallActive, setIsCallActive] = useState(false);
  const [callState, setCallState] = useState("disconnected"); // disconnected, connecting, connected, reconnecting
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localMicEnabled, setLocalMicEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [calleeId, setCalleeId] = useState(""); // For testing - in production, get from context

  // Refs
  const callClientRef = useRef(null);
  const callAgentRef = useRef(null);
  const callRef = useRef(null);
  const localVideoStreamRef = useRef(null);
  const localVideoRendererRef = useRef(null);
  const remoteVideoRendererRef = useRef(null);
  const localVideoContainerRef = useRef(null);
  const remoteVideoContainerRef = useRef(null);

  // Fetch token from backend
  const fetchToken = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/token'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Token fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error("No token received from server");
      }
      return data.token;
    } catch (err) {
      console.error("Error fetching token:", err);
      setError(`Failed to get access token: ${err.message}`);
      throw err;
    }
  }, []);

  // Initialize Azure Communication Services
  const initializeACS = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Lazy load Azure SDK
      await loadAzureSDK();

      // Fetch token
      const token = await fetchToken();

      // Initialize CallClient
      const callClient = new CallClient();
      callClientRef.current = callClient;

      // Create credential and agent
      const tokenCredential = new AzureCommunicationTokenCredential(token);
      const callAgent = await callClient.createCallAgent(tokenCredential);
      callAgentRef.current = callAgent;

      // Listen for incoming calls
      callAgent.on("incomingCall", (args) => {
        console.log("Incoming call received");
        // Auto-answer for now (can be made configurable)
        args.call.accept();
      });

      setIsLoading(false);
      return { callClient, callAgent };
    } catch (err) {
      console.error("Error initializing ACS:", err);
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  }, [fetchToken]);

  // Start local video
  const startLocalVideo = useCallback(async () => {
    try {
      if (!callClientRef.current) {
        await initializeACS();
      }

      // Request camera permission
      const deviceManager = await callClientRef.current.getDeviceManager();
      const cameras = await deviceManager.getCameras();
      
      if (cameras.length === 0) {
        throw new Error("No camera found. Please check your camera permissions.");
      }

      const camera = cameras[0];
      const localVideoStream = new LocalVideoStream(camera);
      localVideoStreamRef.current = localVideoStream;

      // Render local video
      if (localVideoContainerRef.current) {
        // Clean up existing renderer
        if (localVideoRendererRef.current) {
          try {
            localVideoRendererRef.current.dispose();
          } catch (e) {
            console.warn("Error disposing local renderer:", e);
          }
          localVideoRendererRef.current = null;
        }
        
        // Clear container safely
        const container = localVideoContainerRef.current;
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        
        const renderer = new VideoStreamRenderer(localVideoStream);
        localVideoRendererRef.current = renderer;
        const view = await renderer.createView({ scalingMode: "Crop" });
        if (container && view && view.target) {
          container.appendChild(view.target);
        }
      }

      setLocalVideoEnabled(true);
    } catch (err) {
      console.error("Error starting local video:", err);
      setError(err.message);
      // Handle permission errors gracefully
      if (err.message.includes("permission") || err.message.includes("Permission")) {
        setError("Camera permission denied. Please enable camera access in your browser settings.");
      }
    }
  }, [initializeACS]);

  // Stop local video
  const stopLocalVideo = useCallback(() => {
    if (localVideoRendererRef.current) {
      try {
        localVideoRendererRef.current.dispose();
      } catch (e) {
        console.warn("Error disposing local renderer:", e);
      }
      localVideoRendererRef.current = null;
    }
    if (localVideoContainerRef.current) {
      const container = localVideoContainerRef.current;
      while (container.firstChild) {
        try {
          container.removeChild(container.firstChild);
        } catch (e) {
          console.warn("Error removing child:", e);
          break;
        }
      }
    }
    if (localVideoStreamRef.current) {
      try {
        localVideoStreamRef.current.dispose();
      } catch (e) {
        console.warn("Error disposing local video stream:", e);
      }
      localVideoStreamRef.current = null;
    }
    setLocalVideoEnabled(false);
  }, []);

  // Start call
  const handleStartCall = useCallback(async () => {
    if (!calleeId.trim()) {
      setError("Please enter a user ID to call");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setCallState("connecting");

      if (!callAgentRef.current) {
        await initializeACS();
      }

      // Start local video if enabled
      if (localVideoEnabled && !localVideoStreamRef.current) {
        await startLocalVideo();
      }

      // Start call
      const call = callAgentRef.current.startCall(
        [{ communicationUserId: calleeId.trim() }],
        {
          videoOptions: {
            localVideoStreams: localVideoStreamRef.current ? [localVideoStreamRef.current] : undefined,
          },
        }
      );

      callRef.current = call;

      // Set up call event handlers
      call.on("stateChanged", () => {
        const state = call.state;
        setCallState(state);
        setIsCallActive(state === "Connected");
      });

      call.on("remoteParticipantsUpdated", (e) => {
        e.added.forEach((participant) => {
          participant.on("videoStreamsUpdated", (streamEvent) => {
            streamEvent.added.forEach(async (stream) => {
              if (stream.isAvailable && remoteVideoContainerRef.current) {
                try {
                  // Clean up existing renderer
                  if (remoteVideoRendererRef.current) {
                    try {
                      remoteVideoRendererRef.current.dispose();
                    } catch (e) {
                      console.warn("Error disposing remote renderer:", e);
                    }
                    remoteVideoRendererRef.current = null;
                  }
                  
                  // Clear container safely
                  const container = remoteVideoContainerRef.current;
                  while (container.firstChild) {
                    try {
                      container.removeChild(container.firstChild);
                    } catch (e) {
                      console.warn("Error removing child:", e);
                      break;
                    }
                  }
                  
                  const renderer = new VideoStreamRenderer(stream);
                  remoteVideoRendererRef.current = renderer;
                  const view = await renderer.createView({ scalingMode: "Crop" });
                  if (container && view && view.target) {
                    container.appendChild(view.target);
                  }
                  setRemoteVideoEnabled(true);
                } catch (err) {
                  console.error("Error rendering remote video:", err);
                }
              }
            });
            streamEvent.removed.forEach(() => {
              if (remoteVideoRendererRef.current) {
                try {
                  remoteVideoRendererRef.current.dispose();
                } catch (e) {
                  console.warn("Error disposing remote renderer:", e);
                }
                remoteVideoRendererRef.current = null;
              }
              if (remoteVideoContainerRef.current) {
                const container = remoteVideoContainerRef.current;
                while (container.firstChild) {
                  try {
                    container.removeChild(container.firstChild);
                  } catch (e) {
                    console.warn("Error removing child:", e);
                    break;
                  }
                }
              }
              setRemoteVideoEnabled(false);
            });
          });
        });
      });

      setIsLoading(false);
    } catch (err) {
      console.error("Error starting call:", err);
      setError(err.message);
      setCallState("disconnected");
      setIsLoading(false);
    }
  }, [calleeId, initializeACS, localVideoEnabled, startLocalVideo]);

  // End call
  const handleEndCall = useCallback(async () => {
    try {
      if (callRef.current) {
        await callRef.current.hangUp();
        callRef.current = null;
      }
      stopLocalVideo();
      
      if (remoteVideoRendererRef.current) {
        try {
          remoteVideoRendererRef.current.dispose();
        } catch (e) {
          console.warn("Error disposing remote renderer:", e);
        }
        remoteVideoRendererRef.current = null;
      }
      if (remoteVideoContainerRef.current) {
        const container = remoteVideoContainerRef.current;
        while (container.firstChild) {
          try {
            container.removeChild(container.firstChild);
          } catch (e) {
            console.warn("Error removing child:", e);
            break;
          }
        }
      }

      setIsCallActive(false);
      setCallState("disconnected");
      setRemoteVideoEnabled(false);
    } catch (err) {
      console.error("Error ending call:", err);
      setError(err.message);
    }
  }, [stopLocalVideo]);

  // Toggle local video
  const handleToggleVideo = useCallback(async () => {
    try {
      if (localVideoEnabled) {
        if (callRef.current && localVideoStreamRef.current) {
          await callRef.current.stopVideo(localVideoStreamRef.current);
        }
        stopLocalVideo();
      } else {
        await startLocalVideo();
        if (callRef.current && localVideoStreamRef.current) {
          await callRef.current.startVideo(localVideoStreamRef.current);
        }
      }
    } catch (err) {
      console.error("Error toggling video:", err);
      setError(err.message);
    }
  }, [localVideoEnabled, startLocalVideo, stopLocalVideo]);

  // Toggle local mic
  const handleToggleMic = useCallback(async () => {
    try {
      if (callRef.current) {
        if (localMicEnabled) {
          await callRef.current.mute();
        } else {
          await callRef.current.unmute();
        }
        setLocalMicEnabled(!localMicEnabled);
      }
    } catch (err) {
      console.error("Error toggling mic:", err);
      setError(err.message);
    }
  }, [localMicEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleEndCall();
      if (callAgentRef.current) {
        callAgentRef.current.dispose();
      }
      if (callClientRef.current) {
        callClientRef.current.dispose();
      }
    };
  }, [handleEndCall]);

  return (
    <div className="azure-video-call-panel">
      {/* Error Message */}
      {error && (
        <div className="azure-error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* 2-Panel Layout */}
      <div className="azure-video-grid">
        {/* Left Panel - Local User */}
        <div className="azure-video-panel local-panel">
          <div className="azure-video-header">
            <span className="azure-panel-title">You</span>
            <div className="azure-status-indicators">
              {localVideoEnabled && <span className="status-badge video-on">Camera On</span>}
              {!localMicEnabled && <span className="status-badge mic-muted">Mic Muted</span>}
            </div>
          </div>
          <div 
            ref={localVideoContainerRef} 
            className="azure-video-container"
          >
            {!localVideoEnabled && (
              <div className="azure-video-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <p>Camera Off</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Remote User */}
        <div className="azure-video-panel remote-panel">
          <div className="azure-video-header">
            <span className="azure-panel-title">Remote</span>
            <div className="azure-status-indicators">
              <span className={`status-badge connection-${callState}`}>
                {callState === "connecting" && "Connecting..."}
                {callState === "Connected" && "Connected"}
                {callState === "Reconnecting" && "Reconnecting..."}
                {callState === "disconnected" && "Disconnected"}
              </span>
            </div>
          </div>
          <div 
            ref={remoteVideoContainerRef} 
            className="azure-video-container"
          >
            {!remoteVideoEnabled && callState === "disconnected" && (
              <div className="azure-video-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <p>Waiting for call...</p>
              </div>
            )}
            {callState === "connecting" && (
              <div className="azure-video-placeholder">
                <div className="azure-loading-spinner"></div>
                <p>Connecting...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls - Bottom Overlay */}
      <div className="azure-controls">
        {!isCallActive ? (
          <>
            <input
              type="text"
              placeholder="Enter user ID to call"
              value={calleeId}
              onChange={(e) => setCalleeId(e.target.value)}
              className="azure-callee-input"
              onKeyPress={(e) => e.key === "Enter" && handleStartCall()}
            />
            <button
              onClick={handleStartCall}
              disabled={isLoading || !calleeId.trim()}
              className="azure-control-btn start-call-btn"
            >
              {isLoading ? "Starting..." : "Start Call"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleToggleMic}
              className={`azure-control-btn ${!localMicEnabled ? "muted" : ""}`}
              title={localMicEnabled ? "Mute" : "Unmute"}
            >
              {localMicEnabled ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
            <button
              onClick={handleToggleVideo}
              className={`azure-control-btn ${!localVideoEnabled ? "video-off" : ""}`}
              title={localVideoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {localVideoEnabled ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 16l1.5-1.5m0 0L21 10.5m-3.5 3.5L13.5 13m3 3L12 21.5" />
                  <path d="M8 8l-1.5 1.5m0 0L3 13.5m3.5-3.5L10.5 11m-3-3L12 2.5" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              )}
            </button>
            <button
              onClick={handleEndCall}
              className="azure-control-btn end-call-btn"
            >
              End Call
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AzureVideoCallPanel;

