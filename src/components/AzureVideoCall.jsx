import React, { useState, useRef, useEffect, useCallback } from "react";
import { CallClient, CallAgent, VideoStreamRenderer, LocalVideoStream } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import { getApiUrl } from "../utils/apiConfig";

/**
 * Azure Video Call Component
 * Handles WebRTC video calling via Azure Communication Services
 * 
 * Props:
 * - onCallStateChange: (state: string) => void - Callback for call state changes
 * - onError: (error: string) => void - Callback for errors
 */
const AzureVideoCall = ({ onCallStateChange, onError }) => {
  // State
  const [isCallActive, setIsCallActive] = useState(false);
  const [callState, setCallState] = useState("disconnected"); // disconnected, connecting, connected, reconnecting
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localMicEnabled, setLocalMicEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
        throw new Error(`Token fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.token;
    } catch (err) {
      console.error("Error fetching token:", err);
      throw new Error(`Failed to get access token: ${err.message}`);
    }
  }, []);

  // Initialize Azure Communication Services
  const initializeACS = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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
      onError?.(err.message);
      throw err;
    }
  }, [fetchToken, onError]);

  // Start local video
  const startLocalVideo = useCallback(async () => {
    try {
      if (!callAgentRef.current) {
        await initializeACS();
      }

      // Request camera permission
      const cameras = await callClientRef.current.getDeviceManager().then(dm => dm.getCameras());
      if (cameras.length === 0) {
        throw new Error("No camera found. Please check your camera permissions.");
      }

      const camera = cameras[0];
      const localVideoStream = new LocalVideoStream(camera);
      localVideoStreamRef.current = localVideoStream;

      // Render local video
      if (localVideoContainerRef.current) {
        const renderer = new VideoStreamRenderer(localVideoStream);
        localVideoRendererRef.current = renderer;
        const view = await renderer.createView();
        localVideoContainerRef.current.appendChild(view.target);
      }

      setLocalVideoEnabled(true);
    } catch (err) {
      console.error("Error starting local video:", err);
      setError(err.message);
      onError?.(err.message);
    }
  }, [initializeACS, onError]);

  // Stop local video
  const stopLocalVideo = useCallback(() => {
    if (localVideoRendererRef.current) {
      localVideoRendererRef.current.dispose();
      localVideoRendererRef.current = null;
    }
    if (localVideoContainerRef.current) {
      localVideoContainerRef.current.innerHTML = "";
    }
    if (localVideoStreamRef.current) {
      localVideoStreamRef.current.dispose();
      localVideoStreamRef.current = null;
    }
    setLocalVideoEnabled(false);
  }, []);

  // Start call
  const startCall = useCallback(async (calleeId) => {
    try {
      setIsLoading(true);
      setError(null);
      setCallState("connecting");

      if (!callAgentRef.current) {
        await initializeACS();
      }

      // Start local video if enabled
      if (localVideoEnabled) {
        await startLocalVideo();
      }

      // Start call
      const call = callAgentRef.current.startCall(
        [{ communicationUserId: calleeId }],
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
        onCallStateChange?.(state);
      });

      call.on("remoteParticipantsUpdated", (e) => {
        e.added.forEach((participant) => {
          participant.on("videoStreamsUpdated", (streamEvent) => {
            streamEvent.added.forEach((stream) => {
              if (stream.isAvailable && remoteVideoContainerRef.current) {
                const renderer = new VideoStreamRenderer(stream);
                remoteVideoRendererRef.current = renderer;
                renderer.createView().then((view) => {
                  remoteVideoContainerRef.current.appendChild(view.target);
                  setRemoteVideoEnabled(true);
                });
              }
            });
            streamEvent.removed.forEach(() => {
              if (remoteVideoRendererRef.current) {
                remoteVideoRendererRef.current.dispose();
                remoteVideoRendererRef.current = null;
              }
              if (remoteVideoContainerRef.current) {
                remoteVideoContainerRef.current.innerHTML = "";
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
      onError?.(err.message);
    }
  }, [initializeACS, localVideoEnabled, startLocalVideo, onCallStateChange, onError]);

  // End call
  const endCall = useCallback(async () => {
    try {
      if (callRef.current) {
        await callRef.current.hangUp();
        callRef.current = null;
      }
      stopLocalVideo();
      
      if (remoteVideoRendererRef.current) {
        remoteVideoRendererRef.current.dispose();
        remoteVideoRendererRef.current = null;
      }
      if (remoteVideoContainerRef.current) {
        remoteVideoContainerRef.current.innerHTML = "";
      }

      setIsCallActive(false);
      setCallState("disconnected");
      setRemoteVideoEnabled(false);
      onCallStateChange?.("disconnected");
    } catch (err) {
      console.error("Error ending call:", err);
      setError(err.message);
      onError?.(err.message);
    }
  }, [stopLocalVideo, onCallStateChange, onError]);

  // Toggle local video
  const toggleLocalVideo = useCallback(async () => {
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
  }, [localVideoEnabled, startLocalVideo, stopLocalVideo]);

  // Toggle local mic
  const toggleLocalMic = useCallback(async () => {
    if (callRef.current) {
      if (localMicEnabled) {
        await callRef.current.mute();
      } else {
        await callRef.current.unmute();
      }
      setLocalMicEnabled(!localMicEnabled);
    }
  }, [localMicEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
      if (callAgentRef.current) {
        callAgentRef.current.dispose();
      }
      if (callClientRef.current) {
        callClientRef.current.dispose();
      }
    };
  }, [endCall]);

  return {
    // State
    isCallActive,
    callState,
    localVideoEnabled,
    localMicEnabled,
    remoteVideoEnabled,
    isLoading,
    error,
    // Refs for video containers
    localVideoContainerRef,
    remoteVideoContainerRef,
    // Actions
    startCall,
    endCall,
    toggleLocalVideo,
    toggleLocalMic,
    initializeACS,
  };
};

export default AzureVideoCall;






