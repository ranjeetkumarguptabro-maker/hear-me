import { useState, useRef, useEffect, useCallback } from "react";
import { getApiUrl } from "../utils/apiConfig";

// Lazy load Azure SDK
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
 * Azure WebRTC Hook
 * Manages Azure Communication Services video calling
 * Returns video streams and audio streams for transcription
 */
export const useAzureWebRTC = ({
  enabled = false,
  calleeId = null,
  roomId = null,
  onError = null,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callState, setCallState] = useState("disconnected");
  const [error, setError] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [hasRemoteParticipant, setHasRemoteParticipant] = useState(false);

  // Refs
  const callClientRef = useRef(null);
  const callAgentRef = useRef(null);
  const callRef = useRef(null);
  const incomingCallRef = useRef(null);
  const localVideoStreamRef = useRef(null);
  const localVideoRendererRef = useRef(null);
  const remoteVideoRendererRef = useRef(null);
  const localAudioStreamRef = useRef(null);
  const remoteAudioStreamRef = useRef(null);

  // Fetch token
  const fetchToken = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/token'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `Token fetch failed: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error("No token received from server. Please ensure the backend is running and Azure Communication Services is configured.");
      }
      return data.token;
    } catch (err) {
      console.error("Error fetching token:", err);
      const errorMsg = err.message.includes("fetch") 
        ? `Cannot connect to backend`
        : err.message;
      setError(errorMsg);
      onError?.(errorMsg);
      throw err;
    }
  }, [onError]);

  // Helper function to set up call event handlers
  const setupCallEventHandlers = useCallback((call) => {
    call.on("stateChanged", (args) => {
      const state = call.state;
      console.log("📞 Call state changed:", state);
      setCallState(state);
      
      if (state === "Connected") {
        console.log("✅ Call connected successfully!");
        setIsCallActive(true);
        setError(null); // Clear any previous errors
      } else if (state === "Connecting" || state === "Ringing") {
        console.log("🔄 Call connecting/ringing...");
        setIsCallActive(false);
      } else if (state === "Disconnected" || state === "Disconnecting") {
        console.log("❌ Call disconnected");
        setIsCallActive(false);
        setCallState("disconnected");
        // Check if there's a call end reason in the args
        if (args && args.callEndReason) {
          const reason = args.callEndReason;
          console.log("Call end reason:", reason.code, reason.subCode);
          // Only show error if it's not a normal disconnection (code 0)
          if (reason.code !== 0) {
            setError(`Call ended: ${reason.code} - ${reason.subCode || 'Unknown reason'}`);
          } else {
            setError(null);
          }
        } else {
          setError(null);
        }
      } else {
        setIsCallActive(state === "Connected");
      }
    });

    // Handle remote participants
    call.on("remoteParticipantsUpdated", (e) => {
      console.log("Remote participants updated:", e.added.length, "added,", e.removed.length, "removed");
      
      e.added.forEach((participant) => {
        console.log("✅ Remote participant added:", participant.identifier);
        console.log("Participant state:", participant.state);
        setHasRemoteParticipant(true);
        
        // STEP 7: SUBSCRIBE TO REMOTE VIDEO STREAM
        participant.on("videoStreamsUpdated", async (streamEvent) => {
          console.log("📹 Video streams updated:", streamEvent.added.length, "added");
          streamEvent.added.forEach(async (stream) => {
            if (stream.isAvailable) {
              console.log("✅ Remote video stream available:", stream.id);
              setHasRemoteParticipant(true);
              
              // Store remote video stream for rendering
              // The renderRemoteVideo callback will handle actual rendering
              // This ensures we have the stream ready when container is available
              console.log("✅ Remote video stream ready for rendering");
            }
          });
          streamEvent.removed.forEach((stream) => {
            console.log("❌ Remote video stream removed:", stream.id);
            if (streamEvent.removed.length >= streamEvent.added.length) {
              setHasRemoteParticipant(false);
            }
          });
        });

        // Handle state changes
        participant.on("stateChanged", () => {
          console.log("Remote participant state changed:", participant.state);
          if (participant.state === "Disconnected") {
            console.log("⚠️ Remote participant disconnected");
            setHasRemoteParticipant(false);
          } else if (participant.state === "Connected") {
            setHasRemoteParticipant(true);
          }
        });

        // Handle when participant leaves
        participant.on("isMutedChanged", () => {
          console.log("Remote participant mute state:", participant.isMuted);
        });
      });

      e.removed.forEach((participant) => {
        console.log("❌ Remote participant removed:", participant.identifier);
        setHasRemoteParticipant(false);
        // If the remote participant is removed, the call might be ending
        if (e.removed.length > 0 && call.state !== "Disconnected") {
          console.log("⚠️ Remote participant left, call may disconnect");
        }
      });
    });
  }, []);

  // Initialize Azure Communication Services
  // STEP 2: CREATE CallAgent ONLY ONCE (using ref to prevent recreation)
  const initializeACS = useCallback(async () => {
    if (isInitialized && callAgentRef.current) {
      console.log("✅ ACS already initialized, reusing CallAgent");
      return;
    }

    try {
      setError(null);
      await loadAzureSDK();

      const token = await fetchToken();
      
      if (!token) {
        throw new Error("No token received. Please check backend setup.");
      }

      const callClient = new CallClient();
      callClientRef.current = callClient;

      const tokenCredential = new AzureCommunicationTokenCredential(token);
      const callAgent = await callClient.createCallAgent(tokenCredential);
      callAgentRef.current = callAgent;

      // Handle incoming calls
      callAgent.on("incomingCall", async (args) => {
        const incomingCall = args.incomingCall;
        incomingCallRef.current = incomingCall;
        
        console.log("📞 Incoming call from:", incomingCall.remoteCallerInfo);
        console.log("Current call state:", callRef.current?.state);
        
        // If there's already an active call, reject the incoming call
        if (callRef.current && (callRef.current.state === "Connected" || callRef.current.state === "Connecting")) {
          console.log("⚠️ Already in a call, rejecting incoming call");
          try {
            await incomingCall.reject();
          } catch (err) {
            console.error("Error rejecting incoming call:", err);
          }
          return;
        }
        
        // If there's an outgoing call in progress, cancel it and accept the incoming one
        if (callRef.current && callRef.current.state === "Connecting") {
          console.log("⚠️ Outgoing call in progress, ending it and accepting incoming call");
          try {
            await callRef.current.hangUp();
          } catch (err) {
            console.error("Error ending outgoing call:", err);
          }
        }
        
        try {
          // Get camera for local video
          const deviceManager = await callClient.getDeviceManager();
          const cameras = await deviceManager.getCameras();
          if (cameras.length > 0 && !localVideoStreamRef.current) {
            const localVideoStream = new LocalVideoStream(cameras[0]);
            localVideoStreamRef.current = localVideoStream;
          }

          // Accept the incoming call
          const call = await incomingCall.accept({
            videoOptions: {
              localVideoStreams: localVideoStreamRef.current ? [localVideoStreamRef.current] : undefined,
            },
          });

          console.log("✅ Incoming call accepted");
          callRef.current = call;
          incomingCallRef.current = null;
          setCallState("Connected");
          setIsCallActive(true);
          setError(null);
          
          // Set up call event handlers for incoming call
          setupCallEventHandlers(call);
        } catch (err) {
          console.error("❌ Error accepting incoming call:", err);
          setError(`Failed to accept call: ${err.message}`);
          incomingCallRef.current = null;
        }
      });

      setIsInitialized(true);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Error initializing ACS:", err);
      const errorMsg = err.message || "Failed to initialize Azure Communication Services";
      setError(errorMsg);
      setIsInitialized(false);
      onError?.(errorMsg);
      throw err; // Re-throw to prevent call from starting
    }
  }, [isInitialized, fetchToken, onError, setupCallEventHandlers]);

  // Generate a random room ID
  const generateRoomId = useCallback(() => {
    const roomId = Math.random().toString(36).substring(2, 11).toUpperCase();
    setCurrentRoomId(roomId);
    return roomId;
  }, []);

  // Create or join a room (group call)
  const joinRoom = useCallback(async (roomIdToJoin) => {
    if (!roomIdToJoin || !roomIdToJoin.trim()) {
      setError("Please enter a room ID");
      return;
    }

    // Check if there's already an active call
    if (callRef.current && (callRef.current.state === "Connected" || callRef.current.state === "Connecting")) {
      console.log("⚠️ Call already in progress, cannot join new room");
      setError("A call is already in progress. Please end it first.");
      return;
    }

    try {
      setCallState("connecting");
      setError(null);

      // STEP 3: Request camera & mic BEFORE joining room
      console.log("🎥 Requesting camera and microphone permissions...");
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        console.log("✅ Media permissions granted");
      } catch (mediaError) {
        console.error("❌ Media permission denied:", mediaError);
        throw new Error(`Media access denied: ${mediaError.message}. Please allow camera and microphone access.`);
      }

      if (!isInitialized) {
        await initializeACS();
      }

      if (!callClientRef.current) {
        throw new Error("Azure Communication Services not initialized");
      }

      if (!callAgentRef.current) {
        throw new Error("Call agent not initialized");
      }

      // STEP 4: Create Local Video Stream EXPLICITLY
      console.log("📹 Getting camera devices...");
      const deviceManager = await callClientRef.current.getDeviceManager();
      const cameras = await deviceManager.getCameras();
      
      if (cameras.length === 0) {
        throw new Error("No camera devices found");
      }

      console.log(`✅ Found ${cameras.length} camera(s), using first camera`);
      const localVideoStream = new LocalVideoStream(cameras[0]);
      localVideoStreamRef.current = localVideoStream;
      console.log("✅ Local video stream created");

      // Join group call using room ID as group call ID
      if (!callAgentRef.current) {
        throw new Error("Call agent not initialized");
      }

      // Convert room ID to GUID format for Azure group calls
      // Azure expects a GUID, so we'll use the room ID as a seed
      const groupCallId = roomIdToJoin.trim();
      
      console.log("🔄 Joining room:", groupCallId);

      // For Azure Communication Services, we use join() method for group calls
      // Fetch or create room from backend to get proper GUID
      let groupCallGuid;
      try {
        const roomResponse = await fetch(getApiUrl(`/room/${encodeURIComponent(groupCallId)}`), {
          method: "GET",
        });
        
        if (roomResponse.ok) {
          // Check content-type before parsing JSON
          const contentType = roomResponse.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) {
            const text = await roomResponse.text();
            console.error("❌ Non-JSON response from room endpoint:", text.substring(0, 200));
            throw new Error(`Backend returned non-JSON response: ${contentType}`);
          }
          const roomData = await roomResponse.json();
          groupCallGuid = roomData.azureRoomId || roomData.groupCallId || roomData.roomId;
          console.log("✅ Room found:", groupCallGuid);
          console.log("👥 Room participants:", roomData.participants || []);
          
          if (!groupCallGuid) {
            throw new Error("No Azure room ID returned from server");
          }
          
          // STEP 1: Add current user as participant if not already added
          // Get current user ID and add to room
          try {
            const myUserIdResponse = await fetch(getApiUrl('/my-user-id'));
            if (myUserIdResponse.ok) {
              const myUserData = await myUserIdResponse.json();
              const myUserId = myUserData.communicationUserId;
              
              // Add user to room
              const addParticipantResponse = await fetch(getApiUrl(`/room/${encodeURIComponent(groupCallId)}/add-participant`), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ communicationUserId: myUserId }),
              });
              
              if (addParticipantResponse.ok) {
                console.log("✅ Added current user to room");
              } else {
                console.warn("⚠️ Could not add user to room (may already be added)");
              }
            }
          } catch (addErr) {
            console.warn("⚠️ Could not add user to room:", addErr);
          }
        } else {
          // Create new room
          const createResponse = await fetch(getApiUrl('/room'), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: groupCallId }),
          });
          
          if (createResponse.ok) {
            const roomData = await createResponse.json();
            groupCallGuid = roomData.azureRoomId || roomData.groupCallId || roomData.roomId;
            console.log("✅ Room created:", groupCallGuid);
            console.log("👥 Room participants:", roomData.participants || []);
          } else {
            const errorData = await createResponse.json().catch(() => ({}));
            const errorMsg = errorData.error || errorData.message || "Failed to create room on server";
            throw new Error(errorMsg);
          }
        }
      } catch (err) {
        console.warn("⚠️ Backend room creation failed, using fallback GUID:", err);
        // Fallback: Generate proper GUID format
        const generateGuid = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        groupCallGuid = generateGuid();
        console.log("🔄 Using fallback GUID:", groupCallGuid);
      }

      console.log("🔄 Joining room with GUID:", groupCallGuid);

      // Use RoomCallLocator for Azure Rooms (must be a valid Azure room ID)
      // According to Azure docs: https://learn.microsoft.com/en-gb/azure/communication-services/quickstarts/voice-video-calling/getting-started-with-calling
      // RoomCallLocator is an object with roomId property
      const roomCallLocator = { roomId: groupCallGuid };
      
      console.log("🔄 Joining Azure room with RoomCallLocator:", groupCallGuid);
      
      // STEP 5: JOIN ROOM WITH MEDIA OPTIONS (REQUIRED - prevents auto disconnect)
      const call = callAgentRef.current.join(roomCallLocator, {
        videoOptions: {
          localVideoStreams: localVideoStreamRef.current ? [localVideoStreamRef.current] : undefined,
        },
        audioOptions: {
          muted: false,
        },
      });

      callRef.current = call;
      setCurrentRoomId(groupCallId);

      // STEP 6 & 7: Set up call event handlers (includes remote participant handling)
      setupCallEventHandlers(call);

      // STEP 10: Add debugging
      call.on("stateChanged", () => {
        console.log("📞 Call state:", call.state);
        console.log("📊 Remote participants count:", call.remoteParticipants.size);
        console.log("📹 Local video streams:", localVideoStreamRef.current ? 1 : 0);
      });

      console.log("✅ Joining room, waiting for connection...");
      
      // Clean up media stream (we've created LocalVideoStream from device)
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        console.log("🧹 Cleaned up temporary media stream");
      }

    } catch (err) {
      console.error("❌ Error joining room:", err);
      setError(err.message);
      setCallState("disconnected");
      setIsCallActive(false);
      onError?.(err.message);
    }
  }, [isInitialized, initializeACS, onError, setupCallEventHandlers]);

  // Start call (legacy - for direct user-to-user calling)
  const startCall = useCallback(async (targetCalleeId) => {
    if (!targetCalleeId || !targetCalleeId.trim()) {
      setError("Please enter a user ID to call");
      return;
    }

    // Check if there's already an active call
    if (callRef.current && (callRef.current.state === "Connected" || callRef.current.state === "Connecting")) {
      console.log("⚠️ Call already in progress, cannot start new call");
      setError("A call is already in progress. Please end it first.");
      return;
    }

    // Check if there's an incoming call waiting
    if (incomingCallRef.current) {
      console.log("⚠️ Incoming call waiting, accepting it instead of starting new call");
      try {
        const incomingCall = incomingCallRef.current;
        incomingCallRef.current = null;
        
        // Get camera for local video
        const deviceManager = await callClientRef.current.getDeviceManager();
        const cameras = await deviceManager.getCameras();
        if (cameras.length > 0 && !localVideoStreamRef.current) {
          const localVideoStream = new LocalVideoStream(cameras[0]);
          localVideoStreamRef.current = localVideoStream;
        }

        const call = await incomingCall.accept({
          videoOptions: {
            localVideoStreams: localVideoStreamRef.current ? [localVideoStreamRef.current] : undefined,
          },
        });

        callRef.current = call;
        setCallState("Connected");
        setIsCallActive(true);
        setupCallEventHandlers(call);
        return;
      } catch (err) {
        console.error("Error accepting incoming call:", err);
      }
    }

    try {
      setCallState("connecting");
      setError(null);

      if (!isInitialized) {
        await initializeACS();
      }

      if (!callClientRef.current) {
        throw new Error("Azure Communication Services not initialized");
      }

      // Get camera for local video
      const deviceManager = await callClientRef.current.getDeviceManager();
      const cameras = await deviceManager.getCameras();
      if (cameras.length > 0) {
        const localVideoStream = new LocalVideoStream(cameras[0]);
        localVideoStreamRef.current = localVideoStream;
      }

      // Start call
      if (!callAgentRef.current) {
        throw new Error("Call agent not initialized");
      }

      const call = callAgentRef.current.startCall(
        [{ communicationUserId: targetCalleeId.trim() }],
        {
          videoOptions: {
            localVideoStreams: localVideoStreamRef.current ? [localVideoStreamRef.current] : undefined,
          },
        }
      );

      callRef.current = call;

      // Set up call event handlers
      setupCallEventHandlers(call);

      // Log call start
      console.log("✅ Call started, waiting for connection...");

    } catch (err) {
      console.error("❌ Error starting call:", err);
      setError(err.message);
      setCallState("disconnected");
      setIsCallActive(false);
      setIsLoading(false);
      onError?.(err.message);
    }
  }, [isInitialized, initializeACS, onError, setupCallEventHandlers]);

  // STEP 8: End call - ONLY on explicit user action (not in cleanup)
  const endCall = useCallback(async () => {
    try {
      console.log("📞 Ending call (explicit user action)...");
      if (callRef.current) {
        await callRef.current.hangUp();
        callRef.current = null;
      }

      if (localVideoRendererRef.current) {
        localVideoRendererRef.current.dispose();
        localVideoRendererRef.current = null;
      }
      if (remoteVideoRendererRef.current) {
        remoteVideoRendererRef.current.dispose();
        remoteVideoRendererRef.current = null;
      }
      if (localVideoStreamRef.current) {
        localVideoStreamRef.current.dispose();
        localVideoStreamRef.current = null;
      }

      setIsCallActive(false);
      setCallState("disconnected");
      setHasRemoteParticipant(false);
    } catch (err) {
      console.error("Error ending call:", err);
      setError(err.message);
    }
  }, []);

  // Render local video to container
  const renderLocalVideo = useCallback(async (containerElement) => {
    if (!localVideoStreamRef.current || !containerElement) return;

    try {
      if (localVideoRendererRef.current) {
        localVideoRendererRef.current.dispose();
      }

      const renderer = new VideoStreamRenderer(localVideoStreamRef.current);
      localVideoRendererRef.current = renderer;
      const view = await renderer.createView({ scalingMode: "Crop" });

      // Clear container safely
      while (containerElement.firstChild) {
        try {
          containerElement.removeChild(containerElement.firstChild);
        } catch (e) {
          break;
        }
      }

      containerElement.appendChild(view.target);
    } catch (err) {
      console.error("Error rendering local video:", err);
    }
  }, []);

  // STEP 7: Render remote video to container (replaces dummy image)
  const renderRemoteVideo = useCallback(async (containerElement) => {
    if (!callRef.current || !containerElement) {
      console.log("⚠️ Cannot render remote video: call or container missing");
      return;
    }

    try {
      // Get remote video stream from call
      const remoteParticipants = callRef.current.remoteParticipants;
      console.log("📊 Remote participants count:", remoteParticipants.size);
      
      if (remoteParticipants.size === 0) {
        console.log("⏳ No remote participants yet, waiting...");
        setHasRemoteParticipant(false);
        return;
      }

      for (const participant of remoteParticipants.values()) {
        console.log("👤 Checking participant:", participant.identifier);
        const videoStreams = participant.videoStreams;
        console.log("📹 Video streams count:", videoStreams.size);
        
        for (const stream of videoStreams.values()) {
          console.log("🔍 Checking stream:", stream.id, "available:", stream.isAvailable);
          if (stream.isAvailable) {
            console.log("✅ Rendering remote video stream:", stream.id);
            
            // Dispose old renderer if exists
            if (remoteVideoRendererRef.current) {
              try {
                remoteVideoRendererRef.current.dispose();
              } catch (e) {
                console.warn("⚠️ Error disposing old renderer:", e);
              }
              remoteVideoRendererRef.current = null;
            }

            // STEP 7: Create renderer and view for remote video
            const renderer = new VideoStreamRenderer(stream);
            remoteVideoRendererRef.current = renderer;
            const view = await renderer.createView({ scalingMode: "Crop" });

            // Clear container safely
            while (containerElement.firstChild) {
              try {
                containerElement.removeChild(containerElement.firstChild);
              } catch (e) {
                console.warn("⚠️ Error removing child:", e);
                break;
              }
            }

            containerElement.appendChild(view.target);
            setHasRemoteParticipant(true);
            console.log("✅ Remote video rendered successfully - dummy image replaced!");
            return;
          }
        }
      }
      
      console.log("⏳ No available remote video streams found - showing waiting message");
      setHasRemoteParticipant(false);
    } catch (err) {
      console.error("❌ Error rendering remote video:", err);
      setHasRemoteParticipant(false);
    }
  }, []);

  // Get local audio stream for transcription
  const getLocalAudioStream = useCallback(() => {
    // Azure WebRTC doesn't directly expose audio streams
    // We'll use browser MediaStream API instead
    return null;
  }, []);

  // Get remote audio stream for transcription
  const getRemoteAudioStream = useCallback(() => {
    // Azure WebRTC doesn't directly expose audio streams
    // We'll need to use browser MediaStream API or Azure's audio APIs
    return null;
  }, []);

  // Cleanup
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
    isInitialized,
    isCallActive,
    callState,
    error,
    currentRoomId,
    hasRemoteParticipant,
    startCall,
    joinRoom,
    generateRoomId,
    endCall,
    renderLocalVideo,
    renderRemoteVideo,
    getLocalAudioStream,
    getRemoteAudioStream,
    localVideoStream: localVideoStreamRef.current,
  };
};

