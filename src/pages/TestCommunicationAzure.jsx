import React, { useState, useRef, useEffect, useCallback } from "react";
import "./TestCommunicationAzure.css";

/**
 * TestCommunicationAzure - Isolated Azure WebRTC Video Calling Test Page
 * 
 * This is a completely isolated route for testing Azure Communication Services
 * WebRTC video calling. It does NOT use MediaPipe, gesture detection, or
 * speech-to-text features.
 */

export default function TestCommunicationAzure() {
  // UI State
  const [roomId, setRoomId] = useState("");
  const [azureRoomId, setAzureRoomId] = useState(""); // Actual Azure room ID from backend
  const [callState, setCallState] = useState("disconnected"); // disconnected, connecting, connected
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("Ready to join a room");

  // Azure SDK Refs
  const callClientRef = useRef(null);
  const callAgentRef = useRef(null);
  const callRef = useRef(null);
  const deviceManagerRef = useRef(null);
  const localVideoStreamRef = useRef(null);
  const localVideoRendererRef = useRef(null);
  const remoteVideoRenderersRef = useRef(new Map()); // Map<participantId, renderer>
  const currentUserIdRef = useRef(null); // Store current user's communication user ID

  // DOM Refs
  const localVideoContainerRef = useRef(null);
  const remoteVideoContainerRef = useRef(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);

  // Initialize Azure SDK
  const initializeAzureSDK = useCallback(async () => {
    if (callClientRef.current && callAgentRef.current) {
      console.log("✅ Azure SDK already initialized");
      return;
    }

    try {
      setError("");
      setStatusMessage("Initializing Azure SDK...");

      // CRITICAL: Use the SAME user ID throughout the session
      // Check if we already have a user ID stored in sessionStorage
      let userId = sessionStorage.getItem("azure_user_id");
      let token = null;

      if (userId) {
        console.log("🔄 Reusing existing user ID from session:", userId);
        // Try to get a new token for the same user
        // For now, we'll create a new token (backend will create new user if needed)
        // TODO: Backend should support token refresh for existing users
      }

      // Lazy load Azure SDK
      const { CallClient } = await import("@azure/communication-calling");
      const { AzureCommunicationTokenCredential } = await import("@azure/communication-common");

      // Fetch token from backend
      const tokenResponse = await fetch("http://localhost:8000/api/azure/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: userId ? JSON.stringify({ userId }) : undefined, // Send existing userId if we have one
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch token: ${tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();
      token = tokenData.token;
      userId = tokenData.userId || userId; // Use returned userId or keep existing
      
      if (!token) {
        throw new Error("No token received from server");
      }

      // Store current user ID in both ref and sessionStorage for persistence
      currentUserIdRef.current = userId;
      sessionStorage.setItem("azure_user_id", userId);
      console.log("✅ Token received, userId:", userId, "(stored in session)");

      // Initialize CallClient
      const callClient = new CallClient();
      callClientRef.current = callClient;

      // Get DeviceManager
      const deviceManager = await callClient.getDeviceManager();
      deviceManagerRef.current = deviceManager;

      // Create CallAgent
      const tokenCredential = new AzureCommunicationTokenCredential(token);
      const callAgent = await callClient.createCallAgent(tokenCredential, {
        displayName: `User-${userId.slice(-6)}`,
      });
      callAgentRef.current = callAgent;

      // Handle incoming calls (for future use)
      callAgent.on("incomingCall", (args) => {
        console.log("📞 Incoming call:", args.incomingCall);
        // Auto-reject for now (room-based only)
        args.incomingCall.reject();
      });

      setStatusMessage("Azure SDK initialized successfully");
      console.log("✅ Azure SDK initialized");
    } catch (err) {
      console.error("❌ Error initializing Azure SDK:", err);
      setError(err.message || "Failed to initialize Azure SDK");
      setStatusMessage("Initialization failed");
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeAzureSDK();

    // Cleanup on unmount
    return () => {
      if (callRef.current) {
        callRef.current.hangUp().catch(console.error);
      }
      if (localVideoRendererRef.current) {
        localVideoRendererRef.current.dispose();
      }
      remoteVideoRenderersRef.current.forEach((renderer) => {
        try {
          renderer.dispose();
        } catch (e) {
          console.warn("Error disposing remote renderer:", e);
        }
      });
      remoteVideoRenderersRef.current.clear();
    };
  }, [initializeAzureSDK]);

  // Render local video
  const renderLocalVideo = useCallback(async () => {
    if (!localVideoStreamRef.current || !localVideoContainerRef.current) {
      return;
    }

    try {
      const { VideoStreamRenderer } = await import("@azure/communication-calling");
      
      if (localVideoRendererRef.current) {
        localVideoRendererRef.current.dispose();
      }

      const renderer = new VideoStreamRenderer(localVideoStreamRef.current);
      localVideoRendererRef.current = renderer;
      const view = await renderer.createView({ scalingMode: "Crop" });

      // Clear container
      while (localVideoContainerRef.current.firstChild) {
        localVideoContainerRef.current.removeChild(localVideoContainerRef.current.firstChild);
      }

      localVideoContainerRef.current.appendChild(view.target);
      console.log("✅ Local video rendered");
    } catch (err) {
      console.error("❌ Error rendering local video:", err);
    }
  }, []);

  // Render remote participant video
  const renderRemoteVideo = useCallback(async (participant, stream) => {
    if (!stream.isAvailable || !remoteVideoContainerRef.current) {
      return;
    }

    try {
      const { VideoStreamRenderer } = await import("@azure/communication-calling");
      const participantId = participant.identifier.communicationUserId || String(participant.identifier);

      // Dispose old renderer if exists
      if (remoteVideoRenderersRef.current.has(participantId)) {
        try {
          remoteVideoRenderersRef.current.get(participantId).dispose();
        } catch (e) {
          console.warn("Error disposing old remote renderer:", e);
        }
      }

      const renderer = new VideoStreamRenderer(stream);
      remoteVideoRenderersRef.current.set(participantId, renderer);
      const view = await renderer.createView({ scalingMode: "Crop" });

      // Create container for this participant
      const participantContainer = document.createElement("div");
      participantContainer.className = "remote-participant-video";
      participantContainer.id = `participant-${participantId}`;
      participantContainer.appendChild(view.target);

      remoteVideoContainerRef.current.appendChild(participantContainer);
      console.log("✅ Remote video rendered for participant:", participantId);
    } catch (err) {
      console.error("❌ Error rendering remote video:", err);
    }
  }, []);

  // Remove remote participant video
  const removeRemoteVideo = useCallback((participantId) => {
    const container = document.getElementById(`participant-${participantId}`);
    if (container) {
      container.remove();
    }

    if (remoteVideoRenderersRef.current.has(participantId)) {
      try {
        remoteVideoRenderersRef.current.get(participantId).dispose();
      } catch (e) {
        console.warn("Error disposing remote renderer:", e);
      }
      remoteVideoRenderersRef.current.delete(participantId);
    }
  }, []);

  // Setup call event handlers
  const setupCallHandlers = useCallback((call) => {
    // Call state changes
    call.on("stateChanged", () => {
      const state = call.state;
      console.log("📞 Call state changed:", state);
      setCallState(state.toLowerCase());

      if (state === "Connected") {
        setStatusMessage("✅ Connected - Waiting for other participants...");
        setError("");
      } else if (state === "Disconnected") {
        // Get call end reason if available
        let disconnectReason = "";
        try {
          if (call.callEndReason) {
            const reason = call.callEndReason;
            disconnectReason = ` (Code: ${reason.code}, SubCode: ${reason.subCode || 'N/A'})`;
            console.log("📞 Disconnect reason:", reason);
            
            // Check for specific error codes
            if (reason.code === 403 || reason.subCode === 5828) {
              setError("Call ended: You are NOT authorized to join this room (403/5828). This means you're not a participant. Make sure to click 'Create Room' first, then 'Join Room'. The participant must be added BEFORE joining.");
            } else if (reason.code === 490 || reason.subCode === 4502) {
              setError("Call ended: Room join failed (490/4502). The participant wasn't fully registered with Azure. Try: 1) Wait 5+ seconds after adding yourself as participant, 2) Click 'Join Room' again, or 3) Create a new room.");
            } else if (reason.code === 400 || reason.subCode === 400) {
              setError("Call ended: Invalid room or participant (400). Make sure the room exists and you're added as a participant.");
            } else if (reason.code === 410) {
              setError("Call ended: No media path available (410). Check your network/firewall settings.");
            } else {
              setError(`Call ended unexpectedly${disconnectReason}. Make sure you're added as a participant BEFORE joining.`);
            }
          }
        } catch (e) {
          console.warn("Could not get call end reason:", e);
        }
        
        setStatusMessage(`Call ended${disconnectReason}`);
        setRemoteParticipants([]);
        // Cleanup renderers
        remoteVideoRenderersRef.current.forEach((renderer, id) => {
          try {
            renderer.dispose();
          } catch (e) {
            console.warn("Error disposing renderer:", e);
          }
        });
        remoteVideoRenderersRef.current.clear();
        if (remoteVideoContainerRef.current) {
          remoteVideoContainerRef.current.innerHTML = "";
        }
      } else if (state === "Connecting") {
        setStatusMessage("Connecting...");
      }
    });

    // Remote participants
    call.on("remoteParticipantsUpdated", (e) => {
      console.log("👥 Remote participants updated:", e.added.length, "added,", e.removed.length, "removed");

      // Handle added participants
      e.added.forEach((participant) => {
        const participantId = participant.identifier.communicationUserId || String(participant.identifier);
        console.log("✅ Participant added:", participantId);

        setRemoteParticipants((prev) => {
          if (prev.find((p) => p.id === participantId)) {
            return prev;
          }
          return [...prev, { id: participantId, participant }];
        });

        // Handle video streams
        participant.on("videoStreamsUpdated", (e) => {
          e.added.forEach((stream) => {
            if (stream.isAvailable) {
              renderRemoteVideo(participant, stream);
            }
          });
          e.removed.forEach((stream) => {
            console.log("❌ Remote video stream removed");
          });
        });

        // Check existing streams
        participant.videoStreams.forEach((stream) => {
          if (stream.isAvailable) {
            renderRemoteVideo(participant, stream);
          }
        });
      });

      // Handle removed participants
      e.removed.forEach((participant) => {
        const participantId = participant.identifier.communicationUserId || String(participant.identifier);
        console.log("❌ Participant removed:", participantId);
        removeRemoteVideo(participantId);
        setRemoteParticipants((prev) => prev.filter((p) => p.id !== participantId));
      });
    });
  }, [renderRemoteVideo, removeRemoteVideo]);

  // Join room
  const handleJoinRoom = useCallback(async () => {
    if (!roomId.trim()) {
      setError("Please enter a room ID");
      return;
    }

    // Check if we have an Azure room ID, if not, try to get/create it
    let roomIdToJoin = azureRoomId;
    
    if (!roomIdToJoin) {
      setStatusMessage("Fetching room information...");
      try {
        // Try to get existing room or create new one
        const roomResponse = await fetch(`http://localhost:8000/room/${encodeURIComponent(roomId.trim())}`, {
          method: "GET",
        });

        if (roomResponse.ok) {
          const roomData = await roomResponse.json();
          roomIdToJoin = roomData.azureRoomId || roomData.groupCallId;
          if (roomIdToJoin) {
            setAzureRoomId(roomIdToJoin);
            console.log("✅ Found existing room:", roomIdToJoin);
          }
        } else {
          // Room doesn't exist, create it first
          setStatusMessage("Room not found. Creating room...");
          const createResponse = await fetch("http://localhost:8000/room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: roomId.trim() }),
          });

          if (createResponse.ok) {
            const roomData = await createResponse.json();
            roomIdToJoin = roomData.azureRoomId || roomData.groupCallId;
            if (roomIdToJoin) {
              setAzureRoomId(roomIdToJoin);
              console.log("✅ Created new room:", roomIdToJoin);
            }
          } else {
            const errorData = await createResponse.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || "Failed to create room. Make sure Azure Rooms SDK is installed.");
          }
        }
      } catch (err) {
        console.error("❌ Error getting/creating room:", err);
        setError(err.message || "Failed to get or create room");
        setStatusMessage("Room setup failed");
        return;
      }
    }

    if (!roomIdToJoin) {
      setError("No valid Azure room ID available. Please create a room first.");
      return;
    }

    // CRITICAL: Add current user as participant to the room BEFORE joining
    // Error 403/5828 = Not authorized = User must be a participant first
    if (!currentUserIdRef.current) {
      setError("No user ID available. Cannot join room without being a participant.");
      setCallState("disconnected");
      setStatusMessage("Failed: No user ID");
      return;
    }

    setStatusMessage("Adding you to room participants...");
    let participantAdded = false;
    
    try {
      console.log("🔄 Adding participant:", currentUserIdRef.current, "to room:", roomId.trim());
      const addParticipantResponse = await fetch(
        `http://localhost:8000/room/${encodeURIComponent(roomId.trim())}/add-participant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ communicationUserId: currentUserIdRef.current }),
        }
      );

        if (addParticipantResponse.ok) {
          const data = await addParticipantResponse.json();
          console.log("✅ Added current user to room participants:", data);
          participantAdded = true;
          setStatusMessage("Participant added. Verifying with Azure...");
          
          // CRITICAL: Verify participant was added by checking room (with retries)
          const ourUserId = currentUserIdRef.current;
          let participantVerified = false;
          const maxRetries = 5;
          
          for (let retry = 0; retry < maxRetries; retry++) {
            try {
              // Wait before each verification attempt
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const verifyResponse = await fetch(`http://localhost:8000/room/${encodeURIComponent(roomId.trim())}`, {
                method: "GET",
              });
              
              if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json();
                const participants = verifyData.participants || [];
                console.log(`🔄 Verification attempt ${retry + 1}/${maxRetries}:`, participants);
                console.log(`   Our user ID: ${ourUserId}`);
                console.log(`   Participants in room:`, participants);
                
                // Check if our user ID is in the participants list
                // Try multiple ways to match the ID
                const isInParticipants = participants.some(
                  (p) => {
                    const pId = p.communicationUserId || p.communication_user_id || p.userId || String(p);
                    const ourIdStr = String(ourUserId);
                    const pIdStr = String(pId);
                    
                    // Exact match
                    if (pIdStr === ourIdStr) {
                      console.log(`   ✅ Found exact match: ${pIdStr}`);
                      return true;
                    }
                    
                    // Try matching just the last part (after the last underscore)
                    const ourIdSuffix = ourIdStr.split('_').pop();
                    const pIdSuffix = pIdStr.split('_').pop();
                    if (ourIdSuffix && pIdSuffix && ourIdSuffix === pIdSuffix) {
                      console.log(`   ✅ Found suffix match: ${ourIdSuffix}`);
                      return true;
                    }
                    
                    // Try matching if one contains the other
                    if (pIdStr.includes(ourIdSuffix) || ourIdStr.includes(pIdSuffix)) {
                      console.log(`   ✅ Found partial match: ${pIdStr} <-> ${ourIdStr}`);
                      return true;
                    }
                    
                    return false;
                  }
                );
                
                if (isInParticipants) {
                  participantVerified = true;
                  console.log("✅ Confirmed: Our user ID is in the room participants list");
                  break; // Exit retry loop
                } else {
                  console.warn(`⚠️ Attempt ${retry + 1}: Our user ID not found. Our ID: ${ourUserId}, Room participants:`, 
                    participants.map(p => {
                      const pId = p.communicationUserId || p.communication_user_id || p.userId || String(p);
                      return pId;
                    })
                  );
                  
                  // If this is the last retry, try adding participant again
                  if (retry === maxRetries - 1) {
                    console.log("🔄 Last retry failed. Attempting to re-add participant...");
                    try {
                      const reAddResponse = await fetch(
                        `http://localhost:8000/room/${encodeURIComponent(roomId.trim())}/add-participant`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ communicationUserId: ourUserId }),
                        }
                      );
                      if (reAddResponse.ok) {
                        console.log("✅ Re-added participant. Waiting 3 more seconds...");
                        await new Promise(resolve => setTimeout(resolve, 3000));
                      }
                    } catch (reAddErr) {
                      console.warn("⚠️ Could not re-add participant:", reAddErr);
                    }
                  }
                }
              }
            } catch (verifyErr) {
              console.warn(`⚠️ Verification attempt ${retry + 1} failed:`, verifyErr);
            }
          }
          
          // Final wait before joining (even if verification failed)
          if (!participantVerified) {
            console.warn("⚠️ Could not verify participant after all retries. Waiting 5 more seconds before joining...");
            setStatusMessage("Participant added (verification failed). Waiting before join...");
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            setStatusMessage("✅ Participant verified. Joining call...");
            // Still wait a bit even if verified
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else {
        const errorData = await addParticipantResponse.json().catch(() => ({}));
        const errorMsg = errorData.error || "Failed to add participant";
        
        // Check if user is already a participant
        if (errorMsg.includes("already") || errorMsg.includes("exists") || errorMsg.includes("duplicate") || errorMsg.includes("409")) {
          console.log("ℹ️ User already a participant in room");
          participantAdded = true;
          setStatusMessage("Already a participant. Waiting for Azure...");
          // Still wait to ensure Azure has processed
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // This is a real error - don't proceed
          console.error("❌ Failed to add participant:", errorMsg);
          throw new Error(`Failed to add participant: ${errorMsg}. You must be added as a participant before joining. Error 403/5828 means you're not authorized.`);
        }
      }
    } catch (err) {
      console.error("❌ Error adding user to room:", err);
      setError(err.message || "Failed to add you as a participant. Cannot join room without being a participant.");
      setCallState("disconnected");
      setStatusMessage("Failed to add participant");
      return; // Don't proceed if we can't add participant
    }

    if (!participantAdded) {
      setError("Could not add you as a participant. Cannot join room.");
      setCallState("disconnected");
      setStatusMessage("Participant addition failed");
      return;
    }

    if (!callAgentRef.current) {
      setError("Azure SDK not initialized. Please wait...");
      await initializeAzureSDK();
      if (!callAgentRef.current) {
        setError("Failed to initialize Azure SDK");
        return;
      }
    }

    if (callRef.current && callRef.current.state !== "Disconnected") {
      setError("Already in a call. Please leave first.");
      return;
    }

    try {
      setError("");
      setCallState("connecting");
      setStatusMessage(`Joining Azure room: ${roomIdToJoin}...`);

      // Get camera for local video
      const { LocalVideoStream } = await import("@azure/communication-calling");
      const cameras = await deviceManagerRef.current.getCameras();
      
      if (cameras.length === 0) {
        throw new Error("No camera devices found");
      }

      const localVideoStream = new LocalVideoStream(cameras[0]);
      localVideoStreamRef.current = localVideoStream;

      // Join room using Azure room ID (must be valid GUID from Azure Rooms API)
      const roomCallLocator = { roomId: roomIdToJoin };
      console.log("🔄 Joining with Azure room ID:", roomIdToJoin);
      
      const call = callAgentRef.current.join(roomCallLocator, {
        videoOptions: {
          localVideoStreams: [localVideoStream],
        },
        audioOptions: {
          muted: false,
        },
      });

      callRef.current = call;
      setupCallHandlers(call);

      // Render local video
      await renderLocalVideo();

      console.log("✅ Joining room:", roomIdToJoin);
    } catch (err) {
      console.error("❌ Error joining room:", err);
      setError(err.message || "Failed to join room. Make sure the room was created via Azure Rooms API.");
      setCallState("disconnected");
      setStatusMessage("Failed to join room");
    }
  }, [roomId, azureRoomId, initializeAzureSDK, setupCallHandlers, renderLocalVideo]);

  // Generate room ID
  const handleGenerateRoomId = useCallback(() => {
    const newRoomId = Math.random().toString(36).substring(2, 10).toUpperCase();
    setRoomId(newRoomId);
  }, []);

  // Create room on backend
  const handleCreateRoom = useCallback(async () => {
    if (!roomId.trim()) {
      setError("Please enter a room ID first");
      return;
    }

    try {
      setError("");
      setStatusMessage("Creating room...");

      // CRITICAL: Send current user ID so backend uses the SAME user for room creation
      // This ensures the user ID matches when joining later
      const requestBody = {
        roomId: roomId.trim(),
        userId: currentUserIdRef.current || undefined, // Send user ID if available
      };
      
      console.log("🔄 Creating room with user ID:", requestBody.userId || "will create new user");
      
      const response = await fetch("http://localhost:8000/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to create room");
      }

      const data = await response.json();
      const azureId = data.azureRoomId || data.groupCallId;
      
      if (!azureId) {
        const errorMsg = data.error || data.message || "No Azure room ID returned from server";
        const installCmd = data.install_command || "pip install azure-communication-rooms";
        throw new Error(
          `${errorMsg}. ${data.message || ""} ` +
          `To fix: Run '${installCmd}' in your backend directory and restart the server.`
        );
      }

      // Store the Azure room ID for joining
      setAzureRoomId(azureId);
      setStatusMessage(`✅ Room created! Azure Room ID: ${azureId}`);
      console.log("✅ Room created:", data);
      console.log("📝 Use this Azure Room ID to join:", azureId);
      
      // CRITICAL: Verify that the current user is a participant
      // The backend should have added the user when creating the room, but let's verify
      if (currentUserIdRef.current) {
        console.log("✅ Room created with user ID:", currentUserIdRef.current);
        console.log("   This user ID will be used when joining the room");
      } else {
        console.warn("⚠️ No user ID available - you may need to add yourself as participant before joining");
      }
    } catch (err) {
      console.error("❌ Error creating room:", err);
      setError(err.message || "Failed to create room");
      setStatusMessage("Room creation failed");
      setAzureRoomId("");
    }
  }, [roomId]);

  // Leave call
  const handleLeaveCall = useCallback(async () => {
    if (callRef.current) {
      try {
        await callRef.current.hangUp();
        callRef.current = null;
        setCallState("disconnected");
        setStatusMessage("Call ended");
        setRemoteParticipants([]);
      } catch (err) {
        console.error("Error leaving call:", err);
      }
    }

    // Cleanup local video
    if (localVideoRendererRef.current) {
      localVideoRendererRef.current.dispose();
      localVideoRendererRef.current = null;
    }
    if (localVideoContainerRef.current) {
      localVideoContainerRef.current.innerHTML = "";
    }
  }, []);

  // Toggle mute
  const handleToggleMute = useCallback(async () => {
    if (!callRef.current || callRef.current.state !== "Connected") {
      return;
    }

    try {
      const isMuted = callRef.current.isMuted;
      await callRef.current.mute(!isMuted);
      console.log(isMuted ? "🔊 Unmuted" : "🔇 Muted");
    } catch (err) {
      console.error("Error toggling mute:", err);
    }
  }, []);

  // Toggle camera
  const handleToggleCamera = useCallback(async () => {
    if (!callRef.current || callRef.current.state !== "Connected") {
      return;
    }

    try {
      if (localVideoStreamRef.current) {
        await localVideoStreamRef.current.switchSource(
          await deviceManagerRef.current.getCameras().then((cams) => cams[0])
        );
      }
    } catch (err) {
      console.error("Error toggling camera:", err);
    }
  }, []);

  return (
    <div className="test-azure-container">
      <header className="test-azure-header">
        <h1>Azure Test Video Call</h1>
        <p className="test-azure-subtitle">Isolated WebRTC testing route</p>
      </header>

      <div className="test-azure-content">
        {/* Room Controls Section */}
        <section className="test-azure-section">
          <h2>Room Controls</h2>
          <div className="test-azure-room-controls">
            <div className="test-azure-input-group">
              <label htmlFor="roomId">Room ID:</label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Enter or generate room ID"
                disabled={callState === "connected" || callState === "connecting"}
              />
              <button
                onClick={handleGenerateRoomId}
                disabled={callState === "connected" || callState === "connecting"}
                className="test-azure-btn-secondary"
              >
                Generate
              </button>
            </div>
            <div className="test-azure-button-group">
              <button
                onClick={handleCreateRoom}
                disabled={callState === "connected" || callState === "connecting" || !roomId.trim()}
                className="test-azure-btn-secondary"
              >
                Create Room
              </button>
              <button
                onClick={handleJoinRoom}
                disabled={callState === "connected" || callState === "connecting" || !roomId.trim()}
                className="test-azure-btn-primary"
              >
                {callState === "connecting" ? "Joining..." : "Join Room"}
              </button>
              <button
                onClick={handleLeaveCall}
                disabled={callState === "disconnected"}
                className="test-azure-btn-danger"
              >
                Leave Call
              </button>
            </div>
          </div>
          {error && (
            <div className="test-azure-error">
              {error}
              {error.includes("azure-communication-rooms") && (
                <div style={{ marginTop: "12px", padding: "12px", background: "rgba(255, 215, 0, 0.1)", borderRadius: "6px" }}>
                  <strong>Installation Instructions:</strong>
                  <ol style={{ margin: "8px 0", paddingLeft: "20px" }}>
                    <li>Open terminal in your backend directory</li>
                    <li>Activate virtual environment: <code>source venv/bin/activate</code></li>
                    <li>Install SDK: <code>pip install azure-communication-rooms</code></li>
                    <li>Restart backend server</li>
                  </ol>
                </div>
              )}
            </div>
          )}
          <div className="test-azure-status">{statusMessage}</div>
        </section>

        {/* Video Area Section */}
        <section className="test-azure-section">
          <h2>Video Area</h2>
          <div className="test-azure-video-area">
            {/* Local Video */}
            <div className="test-azure-local-video-container">
              <h3>Your Video</h3>
              <div
                ref={localVideoContainerRef}
                className="test-azure-video-container"
              >
                {callState === "disconnected" && (
                  <div className="test-azure-video-placeholder">
                    Local video will appear here
                  </div>
                )}
              </div>
            </div>

            {/* Remote Participants */}
            <div className="test-azure-remote-video-container">
              <h3>Remote Participants ({remoteParticipants.length})</h3>
              <div
                ref={remoteVideoContainerRef}
                className="test-azure-remote-video-grid"
              >
                {remoteParticipants.length === 0 && callState === "connected" && (
                  <div className="test-azure-video-placeholder">
                    Waiting for participant...
                  </div>
                )}
                {remoteParticipants.length === 0 && callState === "disconnected" && (
                  <div className="test-azure-video-placeholder">
                    No remote participants
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Call Controls Section */}
        <section className="test-azure-section">
          <h2>Call Controls</h2>
          <div className="test-azure-call-controls">
            <button
              onClick={handleToggleMute}
              disabled={callState !== "connected"}
              className="test-azure-btn-control"
            >
              {callRef.current?.isMuted ? "🔊 Unmute" : "🔇 Mute"}
            </button>
            <button
              onClick={handleToggleCamera}
              disabled={callState !== "connected"}
              className="test-azure-btn-control"
            >
              📹 Toggle Camera
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

