/**
 * Azure Communication Services WebRTC Utility
 * Isolated SDK logic - no UI dependencies
 */

let callClient = null;
let callAgent = null;
let deviceManager = null;
let currentCall = null;
let localVideoStream = null;
let localVideoRenderer = null;
let remoteVideoRenderers = new Map();
let currentUserId = null;
let isInitializing = false; // Prevent concurrent initializations

/**
 * Initialize Azure SDK - Singleton Pattern
 * CallClient and CallAgent are created ONCE and reused for all calls
 */
export async function initializeAzureSDK() {
  // Prevent concurrent initializations
  if (isInitializing) {
    console.log("⏳ SDK initialization already in progress, waiting...");
    // Wait for existing initialization to complete
    let waitCount = 0;
    while (isInitializing && waitCount < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waitCount++;
    }
    if (callClient && callAgent && deviceManager) {
      console.log("✅ Reusing existing SDK instances");
      return { callClient, callAgent, deviceManager, userId: currentUserId };
    }
  }
  
  // SINGLETON: If CallClient and CallAgent already exist, reuse them
  if (callClient && callAgent && deviceManager) {
    console.log("✅ Azure SDK already initialized (reusing existing instances)");
    return { callClient, callAgent, deviceManager, userId: currentUserId };
  }

  isInitializing = true;
  
  try {
    // Lazy load Azure SDK
    const { CallClient } = await import("@azure/communication-calling");
    const { AzureCommunicationTokenCredential } = await import("@azure/communication-common");

    // CRITICAL: If callClient exists but callAgent is null, the CallClient might still have
    // a CallAgent attached internally. We need to dispose the CallClient and create a fresh one.
    if (callClient && !callAgent) {
      console.warn("⚠️ CallClient exists but CallAgent is null. Disposing CallClient to create fresh instance...");
      try {
        callClient.dispose();
      } catch (e) {
        console.warn("Error disposing orphaned CallClient:", e);
      }
      callClient = null;
      deviceManager = null;
    }

    // SINGLETON: Create CallClient only if it doesn't exist
    if (!callClient) {
      callClient = new CallClient();
      
      // Retry logic for getDeviceManager (handles intermittent failures)
      let retries = 0;
      const maxRetries = 3;
      while (retries < maxRetries) {
        try {
          deviceManager = await callClient.getDeviceManager();
          console.log("✅ Created CallClient and DeviceManager (singleton)");
          break;
        } catch (deviceErr) {
          retries++;
          console.warn(`⚠️ Failed to get DeviceManager (attempt ${retries}/${maxRetries}):`, deviceErr.message);
          
          if (retries >= maxRetries) {
            // Dispose CallClient and throw error
            try {
              callClient.dispose();
            } catch (e) {
              console.warn("Error disposing CallClient:", e);
            }
            callClient = null;
            isInitializing = false;
            throw new Error(`Failed to get DeviceManager after ${maxRetries} attempts: ${deviceErr.message}`);
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 500 * retries));
          
          // Try creating a new CallClient if error persists
          if (deviceErr.message && deviceErr.message.includes("internal call stack")) {
            console.log("🔄 Creating new CallClient due to internal call stack error...");
            try {
              callClient.dispose();
            } catch (e) {
              // Ignore disposal errors
            }
            callClient = new CallClient();
          }
        }
      }
    }

    // SINGLETON: Create CallAgent only if it doesn't exist
    // At this point, if callClient exists, callAgent must also exist (or we just created a fresh callClient)
    if (!callAgent) {
      // Fetch token from backend
      // Backend endpoint is /api/azure/token
      // getApiUrl will create: /api/backend/api/azure/token
      // Proxy will forward to: http://51.124.124.18/api/azure/token
      const { getApiUrl } = await import('./apiConfig');
      const tokenResponse = await fetch(getApiUrl('/api/azure/token'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch token: ${tokenResponse.statusText}`);
      }

      const { token, userId } = await tokenResponse.json();

      if (!token) {
        throw new Error("No token received from server");
      }

      // Store user ID
      currentUserId = userId;
      if (typeof window !== "undefined") {
        sessionStorage.setItem("azure_user_id", userId);
      }

      // Create CallAgent (only once)
      // This will fail if CallClient already has a CallAgent attached
      try {
        const tokenCredential = new AzureCommunicationTokenCredential(token);
        callAgent = await callClient.createCallAgent(tokenCredential, {
          displayName: `User-${userId.slice(-6)}`,
        });
        console.log("✅ Created CallAgent (singleton)");

        // Handle incoming calls (only set up once)
        callAgent.on("incomingCall", (args) => {
          console.log("📞 Incoming call:", args.incomingCall);
          // Auto-reject for room-based only
          args.incomingCall.reject();
        });
      } catch (agentErr) {
        // If CallAgent creation fails because CallClient already has one,
        // dispose CallClient and retry
        if (agentErr.message && agentErr.message.includes("only one CallAgent")) {
          console.error("❌ CallClient already has CallAgent attached. Disposing and retrying...");
          try {
            callClient.dispose();
          } catch (e) {
            console.warn("Error disposing CallClient:", e);
          }
          callClient = new CallClient();
          deviceManager = await callClient.getDeviceManager();
          
          const tokenCredential = new AzureCommunicationTokenCredential(token);
          callAgent = await callClient.createCallAgent(tokenCredential, {
            displayName: `User-${userId.slice(-6)}`,
          });
          console.log("✅ Created CallAgent after retry");

          // Handle incoming calls
          callAgent.on("incomingCall", (args) => {
            console.log("📞 Incoming call:", args.incomingCall);
            args.incomingCall.reject();
          });
        } else {
          throw agentErr;
        }
      }
    } else {
      // If CallAgent exists, just log that we're reusing it
      console.log("✅ Reusing existing CallAgent");
    }

    console.log("✅ Azure SDK initialized (singleton pattern)");
    return { callClient, callAgent, deviceManager, userId: currentUserId };
  } catch (err) {
    console.error("❌ Error initializing Azure SDK:", err);
    throw err;
  }
}

/**
 * Get or create room
 */
export async function getOrCreateRoom(roomId) {
  try {
    // Try to get existing room
    const { getApiUrl } = await import('./apiConfig');
    const getResponse = await fetch(getApiUrl(`/room/${encodeURIComponent(roomId.trim())}`), {
      method: "GET",
    });

    if (getResponse.ok) {
      const data = await getResponse.json();
      if (data.azureRoomId) {
        return data.azureRoomId;
      }
    }

    // Create new room if doesn't exist
    const createResponse = await fetch(getApiUrl('/room'), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: roomId.trim(), userId: currentUserId }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to create room");
    }

    const data = await createResponse.json();
    return data.azureRoomId || data.groupCallId;
  } catch (err) {
    console.error("❌ Error getting/creating room:", err);
    throw err;
  }
}

/**
 * Add participant to room
 */
export async function addParticipantToRoom(roomId, userId) {
  if (!userId) {
    userId = currentUserId || sessionStorage.getItem("azure_user_id");
  }

  if (!userId) {
    throw new Error("No user ID available");
  }

  try {
    const { getApiUrl } = await import('./apiConfig');
    const response = await fetch(
      getApiUrl(`/room/${encodeURIComponent(roomId.trim())}/add-participant`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communicationUserId: userId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || "Failed to add participant";
      
      // Check if user is already a participant
      if (errorMsg.includes("already") || errorMsg.includes("exists") || errorMsg.includes("409")) {
        console.log("ℹ️ User already a participant");
        return true;
      }
      
      throw new Error(errorMsg);
    }

    // Wait for Azure to process
    await new Promise(resolve => setTimeout(resolve, 3000));
    return true;
  } catch (err) {
    console.error("❌ Error adding participant:", err);
    throw err;
  }
}

/**
 * Join room call
 */
export async function joinRoom(azureRoomId, callbacks = {}) {
  if (!callAgent) {
    throw new Error("Azure SDK not initialized");
  }

  if (!deviceManager) {
    throw new Error("Device manager not initialized");
  }

  try {
    // Request camera permission first
    console.log("🔄 Requesting camera access...");
    const cameras = await deviceManager.getCameras();
    console.log(`✅ Found ${cameras.length} camera(s)`);

    if (cameras.length === 0) {
      throw new Error("No camera available. Please grant camera permissions.");
    }

    // Get camera for local video
    const { LocalVideoStream } = await import("@azure/communication-calling");
    localVideoStream = new LocalVideoStream(cameras[0]);
    console.log("✅ Created LocalVideoStream with camera:", cameras[0].name || cameras[0].id);

    const videoOptions = {
      localVideoStreams: [localVideoStream],
    };

    // Start with audio unmuted - user can mute later via toggle
    const audioOptions = {
      muted: false, // Start unmuted, user controls via toggleMute()
    };

    // Join room
    console.log("🔄 Joining room:", azureRoomId);
    const roomCallLocator = { roomId: azureRoomId };
    const call = callAgent.join(roomCallLocator, {
      videoOptions,
      audioOptions,
    });

    currentCall = call;
    console.log("✅ Call created, setting up handlers...");

    // Setup call handlers
    setupCallHandlers(call, callbacks);

    console.log("✅ Successfully joined room");
    return { call, localVideoStream };
  } catch (err) {
    console.error("❌ Error joining room:", err);
    throw err;
  }
}

/**
 * Setup call event handlers - Azure SDK compliant
 */
function setupCallHandlers(call, callbacks) {
  const {
    onStateChanged,
    onRemoteParticipantsUpdated,
    onVideoStreamsUpdated,
    onDisconnected,
  } = callbacks;

  // ONLY use stateChanged event - this is the correct Azure SDK event name
  call.on("stateChanged", () => {
    const state = call.state;
    console.log("📞 Call state changed:", state);
    
    // Check for disconnect reason when state is Disconnected
    if (state === "Disconnected" && call.callEndReason) {
      const reason = call.callEndReason;
      console.log("📞 Disconnect reason:", reason);
      if (onDisconnected) {
        onDisconnected(reason);
      }
    }
    
    if (onStateChanged) {
      onStateChanged(state);
    }
  });

  // Use remoteParticipantsUpdated exactly as per Azure docs
  call.on("remoteParticipantsUpdated", (args) => {
    console.log("👥 Remote participants updated:", args.added.length, "added,", args.removed.length, "removed");
    
    // For each added participant, set up video stream listeners
    args.added.forEach((participant) => {
      setupParticipantVideoListeners(participant, onVideoStreamsUpdated);
    });
    
    // Clean up removed participants
    args.removed.forEach((participant) => {
      const participantId = participant.identifier?.communicationUserId || 
                           participant.identifier?.rawId || 
                           String(participant.identifier);
      if (remoteVideoRenderers.has(participantId)) {
        try {
          remoteVideoRenderers.get(participantId).dispose();
        } catch (e) {
          console.warn("Error disposing renderer for removed participant:", e);
        }
        remoteVideoRenderers.delete(participantId);
      }
    });
    
    if (onRemoteParticipantsUpdated) {
      onRemoteParticipantsUpdated(args.added, args.removed);
    }
  });
}

/**
 * Setup video stream listeners for a participant - Azure SDK compliant
 */
function setupParticipantVideoListeners(participant, onVideoStreamsUpdated) {
  const participantId = participant.identifier?.communicationUserId || 
                       participant.identifier?.rawId || 
                       String(participant.identifier);
  
  console.log("🎥 Setting up video listeners for participant:", participantId);
  
  // Listen to videoStreamsUpdated on the participant (not the call)
  participant.on("videoStreamsUpdated", (args) => {
    console.log("📹 Participant video streams updated:", participantId, args.added.length, "added");
    
    // For each added video stream, listen to isAvailableChanged
    args.added.forEach((videoStream) => {
      if (videoStream.mediaStreamType === "Video") {
        console.log("🎬 Setting up listener for video stream:", videoStream.id);
        
        // Listen to isAvailableChanged on the stream
        videoStream.on("isAvailableChanged", () => {
          console.log("📺 Video stream availability changed:", videoStream.id, "available:", videoStream.isAvailable);
          if (videoStream.isAvailable && onVideoStreamsUpdated) {
            // Notify that this participant's video is now available
            onVideoStreamsUpdated({ participant, videoStream });
          }
        });
        
        // If stream is already available, notify immediately
        if (videoStream.isAvailable && onVideoStreamsUpdated) {
          onVideoStreamsUpdated({ participant, videoStream });
        }
      }
    });
  });
  
  // Check existing video streams
  if (participant.videoStreams && participant.videoStreams.length > 0) {
    participant.videoStreams.forEach((videoStream) => {
      if (videoStream.mediaStreamType === "Video") {
        // Listen to isAvailableChanged
        videoStream.on("isAvailableChanged", () => {
          console.log("📺 Video stream availability changed:", videoStream.id, "available:", videoStream.isAvailable);
          if (videoStream.isAvailable && onVideoStreamsUpdated) {
            onVideoStreamsUpdated({ participant, videoStream });
          }
        });
        
        // If already available, notify
        if (videoStream.isAvailable && onVideoStreamsUpdated) {
          onVideoStreamsUpdated({ participant, videoStream });
        }
      }
    });
  }
}

/**
 * Render local video
 */
export async function renderLocalVideo(containerElement) {
  if (!containerElement) {
    console.warn("⚠️ No container element provided for local video");
    return;
  }

  console.log("🔄 renderLocalVideo called, checking for video stream...");
  console.log("  - currentCall exists:", !!currentCall);
  console.log("  - localVideoStream exists:", !!localVideoStream);
  
  // If no localVideoStream, try to get it from currentCall
  if (!localVideoStream) {
    if (currentCall && currentCall.localVideoStreams && currentCall.localVideoStreams.length > 0) {
      localVideoStream = currentCall.localVideoStreams[0];
      console.log("✅ Found local video stream from call:", localVideoStream);
    } else {
      console.warn("⚠️ No local video stream available in call, waiting...");
      // Wait a bit and try again - try multiple times
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (currentCall && currentCall.localVideoStreams && currentCall.localVideoStreams.length > 0) {
          localVideoStream = currentCall.localVideoStreams[0];
          console.log(`✅ Found local video stream after wait (attempt ${i + 1})`);
          break;
        }
        console.log(`  - Attempt ${i + 1}/5: No stream yet...`);
      }
      
      if (!localVideoStream) {
        console.warn("⚠️ Still no local video stream after all attempts");
        // Try to create a new stream if we have deviceManager
        if (deviceManager && currentCall) {
          try {
            console.log("🔄 Attempting to create new video stream...");
            const cameras = await deviceManager.getCameras();
            if (cameras.length > 0) {
              const { LocalVideoStream } = await import("@azure/communication-calling");
              localVideoStream = new LocalVideoStream(cameras[0]);
              await currentCall.startVideo(localVideoStream);
              console.log("✅ Created and started new video stream");
            }
          } catch (createErr) {
            console.error("❌ Could not create new video stream:", createErr);
            return;
          }
        } else {
          return;
        }
      }
    }
  }

  if (!localVideoStream) {
    console.warn("⚠️ No local video stream available after all attempts");
    return;
  }

  try {
    const { VideoStreamRenderer } = await import("@azure/communication-calling");
    
    // Dispose existing renderer
    if (localVideoRenderer) {
      try {
        localVideoRenderer.dispose();
      } catch (e) {
        console.warn("Error disposing old renderer:", e);
      }
      localVideoRenderer = null;
    }

    // Check if stream is available
    if (localVideoStream.mediaStreamType !== "Video") {
      console.warn("⚠️ Local video stream is not video type:", localVideoStream.mediaStreamType);
      return;
    }

    console.log("🔄 Creating video renderer...");
    localVideoRenderer = new VideoStreamRenderer(localVideoStream);
    const view = await localVideoRenderer.createView();
    console.log("✅ Video view created");
    
    // Clear container
    containerElement.innerHTML = "";
    const videoElement = view.target;
    if (videoElement) {
      if (videoElement.tagName === "VIDEO") {
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "cover"; // Changed from "contain" to "cover" for better framing
        videoElement.style.objectPosition = "center";
        videoElement.style.display = "block";
        videoElement.setAttribute("autoplay", "true");
        videoElement.setAttribute("playsinline", "true");
        videoElement.setAttribute("muted", "true");
      }
      containerElement.appendChild(videoElement);
      console.log("✅ Local video rendered successfully, element:", videoElement.tagName);
    } else {
      console.error("❌ Video element is null");
    }
  } catch (err) {
    console.error("❌ Error rendering local video:", err);
    throw err;
  }
}

/**
 * Render remote participant video
 */
export async function renderRemoteVideo(participant, containerElement) {
  if (!participant || !containerElement) {
    console.warn("⚠️ Cannot render remote video: missing participant or container");
    return;
  }

  try {
    const { VideoStreamRenderer } = await import("@azure/communication-calling");
    
    // Get participant ID (handle different identifier formats)
    const participantId = participant.identifier?.communicationUserId || 
                         participant.identifier?.rawId || 
                         (participant.identifier ? String(participant.identifier) : "unknown");
    
    // Get remote video streams
    if (!participant.videoStreams || participant.videoStreams.length === 0) {
      console.log("⚠️ Participant has no video streams:", participantId);
      return;
    }

    // Find available video stream
    const remoteVideoStream = participant.videoStreams.find(
      (stream) => stream.mediaStreamType === "Video" && stream.isAvailable
    );

    if (!remoteVideoStream) {
      console.log("⚠️ No available remote video stream for participant:", participantId);
      // Try to subscribe to video stream if not available
      if (participant.videoStreams.length > 0) {
        const stream = participant.videoStreams[0];
        if (stream.mediaStreamType === "Video" && !stream.isAvailable) {
          console.log("🔄 Attempting to subscribe to video stream...");
          try {
            await stream.start();
            // Wait a bit for stream to become available
            await new Promise(resolve => setTimeout(resolve, 500));
            if (stream.isAvailable) {
              const renderer = new VideoStreamRenderer(stream);
              const view = await renderer.createView();
              
              // Dispose existing renderer if any
              if (remoteVideoRenderers.has(participantId)) {
                try {
                  remoteVideoRenderers.get(participantId).dispose();
                } catch (e) {
                  console.warn("Error disposing existing renderer:", e);
                }
              }
              
              remoteVideoRenderers.set(participantId, renderer);
              containerElement.innerHTML = "";
              const videoElement = view.target;
              if (videoElement && videoElement.tagName === "VIDEO") {
                videoElement.style.width = "100%";
                videoElement.style.height = "100%";
                videoElement.style.objectFit = "contain";
              }
              containerElement.appendChild(videoElement);
              console.log("✅ Remote video rendered after subscription:", participantId);
              return;
            }
          } catch (subErr) {
            console.warn("Could not subscribe to video stream:", subErr);
          }
        }
      }
      return;
    }

    // Dispose existing renderer if any
    if (remoteVideoRenderers.has(participantId)) {
      try {
        remoteVideoRenderers.get(participantId).dispose();
      } catch (e) {
        console.warn("Error disposing existing renderer:", e);
      }
    }

    // Create renderer
    const renderer = new VideoStreamRenderer(remoteVideoStream);
    const view = await renderer.createView();

    // Store renderer
    remoteVideoRenderers.set(participantId, renderer);

    // Clear and append
    containerElement.innerHTML = "";
    const videoElement = view.target;
    if (videoElement && videoElement.tagName === "VIDEO") {
      videoElement.style.width = "100%";
      videoElement.style.height = "100%";
      videoElement.style.objectFit = "contain";
    }
    containerElement.appendChild(videoElement);

    console.log("✅ Remote video rendered for participant:", participantId);
  } catch (err) {
    console.error("❌ Error rendering remote video:", err);
  }
}

/**
 * Remove remote participant video
 */
export function removeRemoteVideo(participantId) {
  if (remoteVideoRenderers.has(participantId)) {
    try {
      remoteVideoRenderers.get(participantId).dispose();
    } catch (e) {
      console.warn("Error disposing remote renderer:", e);
    }
    remoteVideoRenderers.delete(participantId);
  }
}

/**
 * Toggle mute
 */
export async function toggleMute() {
  if (!currentCall) {
    throw new Error("No active call");
  }

  try {
    // Check current mute state - use the call's isMuted property
    const isCurrentlyMuted = currentCall.isMuted === true;
    console.log("🔇 Current mute state check:", isCurrentlyMuted, "call.isMuted:", currentCall.isMuted);
    
    if (isCurrentlyMuted) {
      // Unmute - call unmute() to enable microphone
      console.log("🔄 Unmuting microphone...");
      await currentCall.unmute();
      
      // Wait a moment and verify
      await new Promise(resolve => setTimeout(resolve, 200));
      const verifyUnmuted = currentCall.isMuted === false;
      console.log("✅ Microphone unmuted, verified:", verifyUnmuted);
      
      return false; // Now unmuted
    } else {
      // Mute - call mute() to disable microphone
      console.log("🔄 Muting microphone...");
      await currentCall.mute();
      
      // Wait a moment and verify
      await new Promise(resolve => setTimeout(resolve, 200));
      const verifyMuted = currentCall.isMuted === true;
      console.log("🔇 Microphone muted, verified:", verifyMuted);
      
      if (!verifyMuted) {
        console.warn("⚠️ Mute verification failed, trying again...");
        // Try once more
        await currentCall.mute();
        await new Promise(resolve => setTimeout(resolve, 200));
        const retryVerify = currentCall.isMuted === true;
        console.log("🔇 Retry mute verification:", retryVerify);
      }
      
      return true; // Now muted
    }
  } catch (err) {
    console.error("❌ Error toggling mute:", err);
    // If mute fails, try to get the actual state
    try {
      const actualState = currentCall.isMuted === true;
      console.log("ℹ️ Actual mute state after error:", actualState);
      return actualState;
    } catch (stateErr) {
      console.error("Could not get mute state:", stateErr);
      // Return the opposite of what we tried to do as fallback
      throw err;
    }
  }
}

/**
 * Toggle camera
 */
export async function toggleCamera() {
  if (!currentCall) {
    throw new Error("No active call");
  }

  if (!deviceManager) {
    throw new Error("Device manager not initialized");
  }

  try {
    const { LocalVideoStream } = await import("@azure/communication-calling");
    
    // Check if video is currently active by checking call's video streams
    // Also check if we have a localVideoStream reference
    const hasActiveStream = currentCall.localVideoStreams && currentCall.localVideoStreams.length > 0;
    const hasStreamReference = !!localVideoStream;
    
    console.log("🔍 Camera toggle check:", { hasActiveStream, hasStreamReference, localVideoStream });
    
    if (hasActiveStream && hasStreamReference) {
      // Turn off camera - stop the video stream
      try {
        await currentCall.stopVideo(localVideoStream);
        console.log("✅ Camera turned off");
        
        // Dispose renderer
        if (localVideoRenderer) {
          try {
            localVideoRenderer.dispose();
          } catch (e) {
            console.warn("Error disposing renderer:", e);
          }
          localVideoRenderer = null;
        }
        
        // Don't set to null immediately - keep reference for potential reuse
        // localVideoStream = null;
        console.log("✅ Camera stopped, stream reference kept");
        return false; // Camera is now off
      } catch (err) {
        // If video is already stopped, that's OK - just update state
        if (err.message && err.message.includes("already stopped")) {
          console.log("ℹ️ Video already stopped, updating state");
          localVideoStream = null;
          if (localVideoRenderer) {
            try {
              localVideoRenderer.dispose();
            } catch (e) {
              console.warn("Error disposing renderer:", e);
            }
            localVideoRenderer = null;
          }
          return false;
        }
        throw err;
      }
    } else {
      // Turn on camera - start the video stream
      try {
        const cameras = await deviceManager.getCameras();
        if (cameras.length === 0) {
          throw new Error("No camera available");
        }
        
        console.log("🔄 Starting camera...");
        
        // Check if we already have a stream that's just not started
        let videoStreamToUse = localVideoStream;
        
        if (!videoStreamToUse || !hasActiveStream) {
          // Create new video stream
          videoStreamToUse = new LocalVideoStream(cameras[0]);
          console.log("✅ Created new LocalVideoStream");
        } else {
          console.log("✅ Reusing existing LocalVideoStream");
        }
        
        // Start video with the stream
        await currentCall.startVideo(videoStreamToUse);
        
        // Update local video stream reference
        localVideoStream = videoStreamToUse;
        console.log("✅ Camera started, localVideoStream:", localVideoStream);
        
        return true; // Camera is now on
      } catch (startErr) {
        console.error("❌ Error starting video:", startErr);
        // If error says already started, check if we have a stream
        if (startErr.message && (startErr.message.includes("already started") || startErr.message.includes("already active"))) {
          console.log("ℹ️ Video already started, checking stream...");
          if (currentCall.localVideoStreams && currentCall.localVideoStreams.length > 0) {
            localVideoStream = currentCall.localVideoStreams[0];
            console.log("✅ Using existing video stream from call");
            return true;
          }
        }
        // Try creating a fresh stream
        try {
          console.log("🔄 Retrying with fresh stream...");
          const cameras = await deviceManager.getCameras();
          if (cameras.length > 0) {
            const freshStream = new LocalVideoStream(cameras[0]);
            await currentCall.startVideo(freshStream);
            localVideoStream = freshStream;
            console.log("✅ Camera started with fresh stream");
            return true;
          }
        } catch (retryErr) {
          console.error("❌ Retry also failed:", retryErr);
        }
        throw startErr;
      }
    }
  } catch (err) {
    console.error("❌ Error toggling camera:", err);
    throw err;
  }
}

/**
 * Get current mute state
 */
export function getMuteState() {
  if (!currentCall) {
    return false;
  }
  return currentCall.isMuted;
}

/**
 * Get current camera state
 */
export function getCameraState() {
  if (!localVideoStream) {
    return false;
  }
  return localVideoStream.mediaStreamType === "Video";
}

/**
 * Leave call
 */
/**
 * Leave call - Only hangs up the call, does NOT dispose CallClient or CallAgent
 * CallClient and CallAgent are singletons and remain for reuse
 */
export async function leaveCall() {
  if (!currentCall) {
    console.log("ℹ️ No active call to leave");
    return;
  }

  try {
    // Only hang up the call - DO NOT dispose CallClient or CallAgent
    await currentCall.hangUp();
    console.log("✅ Call hung up");
    
    // Clear call reference
    currentCall = null;
    localVideoStream = null;

    // Dispose video renderers (these are call-specific)
    if (localVideoRenderer) {
      try {
        localVideoRenderer.dispose();
      } catch (e) {
        console.warn("Error disposing local video renderer:", e);
      }
      localVideoRenderer = null;
    }

    // Clear remote renderers (call-specific)
    remoteVideoRenderers.forEach((renderer) => {
      try {
        renderer.dispose();
      } catch (e) {
        console.warn("Error disposing remote renderer:", e);
      }
    });
    remoteVideoRenderers.clear();

    console.log("✅ Call left (CallClient and CallAgent remain for reuse)");
  } catch (err) {
    console.error("❌ Error leaving call:", err);
    throw err;
  }
}

/**
 * Cleanup all resources - Only use on page unload/full reload
 * For normal call leaving, use leaveCall() instead
 */
export async function cleanup() {
  await leaveCall();
  
  // Only dispose CallClient and CallAgent on full cleanup (page unload)
  if (callAgent) {
    try {
      callAgent.dispose();
    } catch (e) {
      console.warn("Error disposing CallAgent:", e);
    }
    callAgent = null;
  }

  if (callClient) {
    try {
      callClient.dispose();
    } catch (e) {
      console.warn("Error disposing CallClient:", e);
    }
    callClient = null;
  }

  deviceManager = null;
  currentUserId = null;
  
  console.log("✅ Azure SDK fully cleaned up (for page reload)");
}

