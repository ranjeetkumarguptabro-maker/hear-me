import React, { useState, useEffect, useRef, useCallback } from "react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import {
  initializeAzureSDK,
  getOrCreateRoom,
  addParticipantToRoom,
  joinRoom,
  renderLocalVideo,
  renderRemoteVideo,
  removeRemoteVideo,
  toggleMute,
  toggleCamera,
  getMuteState,
  getCameraState,
  leaveCall,
  cleanup,
} from "../utils/azureWebRTC";
import { MicIcon, CameraIcon, PhoneOffIcon } from "../components/Icons";
import DeafCommunication from "./DeafCommunication";
import HearingCommunication from "./HearingCommunication";
import HearingTranscriptionPanel from "../components/HearingTranscriptionPanel";
import { transcriptionService } from "../utils/azureSpeechTranscription";
import { transcriptionRelay } from "../utils/transcriptionRelay";
import { gestureRelay } from "../utils/gestureRelay";
import "./CommunicationCall.css";

const CommunicationCall = () => {
  // Get roomId and participantType from URL
  const getRoomIdFromUrl = () => {
    const path = window.location.pathname;
    const match = path.match(/\/test-communication\/call\/([^/?]+)/);
    return match ? match[1] : "";
  };

  const getParticipantTypeFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("type") || "hearing";
  };

  const getParticipantNameFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return decodeURIComponent(params.get("name") || "Participant");
  };

  const [roomId] = useState(getRoomIdFromUrl());
  const [participantType] = useState(getParticipantTypeFromUrl());
  const [participantName] = useState(getParticipantNameFromUrl());

  // Log participant info on mount
  useEffect(() => {
    console.log("👤 Participant Info:");
    console.log(`   Name: ${participantName}`);
    console.log(`   Type: ${participantType}`);
    console.log(`   Room: ${roomId}`);
  }, [participantName, participantType, roomId]);

  const [callState, setCallState] = useState("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [remoteParticipants, setRemoteParticipants] = useState([]);

  // State for remote participant transcription (deaf user only)
  const [remoteTranscription, setRemoteTranscription] = useState("");
  const [transcriptionMessages, setTranscriptionMessages] = useState([]); // Array of message objects
  const speechRecognizerRef = useRef(null);
  const remoteAudioStreamRef = useRef(null);
  const videoElementSourceRef = useRef(null); // Track MediaElementSourceNode to avoid recreating
  const videoElementRef = useRef(null); // Track which video element we're using

  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef(new Map());
  const callRef = useRef(null);
  const isInitializedRef = useRef(false);

  // NEW: Transcription service refs
  const isTranscriptionInitialized = useRef(false);
  const transcriptionBuffer = useRef(""); // Buffer for accumulating transcription text

  // NEW: Hearing participant transcription state (for debugging panel)
  const [myTranscription, setMyTranscription] = useState("");
  const [myTranscriptionMessages, setMyTranscriptionMessages] = useState([]); // Array of message objects
  const [transcriptionError, setTranscriptionError] = useState(null);
  const [showMyTranscription, setShowMyTranscription] = useState(true);

  // Initialize transcription service based on participant type
  // CREDIT-SAFE: Only starts when toggle is ON
  const initializeTranscriptionService = useCallback(
    async (forceStart = false) => {
      // CREDIT-SAFE RULE: Do NOT start transcription unless toggle is ON or forced
      if (
        participantType === "hearing" &&
        !forceStart &&
        !showMyTranscription
      ) {
        console.log(
          "⏸️ Transcription toggle is OFF - skipping initialization to save credits"
        );
        return;
      }

      const AZURE_SPEECH_KEY =
        import.meta.env.VITE_AZURE_SPEECH_KEY ||
        "YOUR_AZURE_SPEECH_KEY_HERE";
      const AZURE_REGION = import.meta.env.VITE_AZURE_REGION || "westeurope";

      if (participantType === "hearing") {
        // HEARING PARTICIPANT: Start transcribing own voice and send to deaf participant
        console.log(
          "🎤 Initializing hearing participant transcription service..."
        );

        try {
          // Initialize relay to send messages
          transcriptionRelay.initialize(
            roomId,
            "hearing",
            participantName,
            null
          );

          setMyTranscription("🎤 Initializing Azure Speech-to-Text...");
          setTranscriptionError(null);

          // Start transcription
          await transcriptionService.startTranscription(
            AZURE_SPEECH_KEY,
            AZURE_REGION,
            (transcriptionResult) => {
              // Create message object with participant name
              const messageWithName = {
                ...transcriptionResult,
                participantName: participantName,
              };

              // Update local transcription display (for hearing participant to see)
              if (transcriptionResult.type === "partial") {
                // Update messages array
                setMyTranscriptionMessages((prev) => {
                  const withoutPartials = prev.filter(
                    (msg) => msg.type !== "partial"
                  );
                  return [...withoutPartials, messageWithName];
                });

                // Keep old string format for backwards compatibility
                setMyTranscription((prev) => {
                  const lines = prev
                    .split("\n")
                    .filter((line) => !line.startsWith("..."));
                  return lines.length > 0
                    ? `${lines.join("\n")}\n...${transcriptionResult.text}`
                    : `...${transcriptionResult.text}`;
                });
              } else if (transcriptionResult.type === "final") {
                // Add to messages array
                setMyTranscriptionMessages((prev) => {
                  const withoutPartials = prev.filter(
                    (msg) => msg.type !== "partial"
                  );
                  return [...withoutPartials, messageWithName];
                });

                // Keep old string format for backwards compatibility
                setMyTranscription((prev) => {
                  const lines = prev
                    .split("\n")
                    .filter(
                      (line) =>
                        !line.startsWith("...") && !line.startsWith("🎤")
                    );
                  const newText =
                    lines.length > 0
                      ? `${lines.join("\n")}\n${transcriptionResult.text}`
                      : transcriptionResult.text;
                  return newText;
                });
              }

              // Send transcription to deaf participant via relay (with participant name)
              console.log(
                `📤 Sending ${messageWithName.type} from ${messageWithName.participantName}: ${messageWithName.text}`
              );
              transcriptionRelay
                .sendTranscription(messageWithName)
                .catch((relayError) => {
                  console.error("❌ Failed to send transcription:", relayError);
                  setTranscriptionError(
                    `Failed to send: ${relayError.message || "Network error"}`
                  );
                });
            },
            (error) => {
              console.error("❌ Transcription error:", error);
              setTranscriptionError(error);
              setError(`Transcription error: ${error}`);
            }
          );

          console.log(
            "✅ Hearing participant transcription started - your voice will be transcribed"
          );
          setStatusMessage(
            "Your voice is being transcribed for the deaf participant"
          );
          setMyTranscription(
            "🎤 Ready - speak now!\n\n(Your voice will be transcribed and sent to the deaf participant)"
          );
          setTranscriptionError(null);
        } catch (error) {
          console.error("❌ Failed to start transcription:", error);
          const errorMsg = error.message || String(error);
          setError(`Failed to start transcription: ${errorMsg}`);
          setTranscriptionError(errorMsg);
          setMyTranscription(
            "❌ Failed to start transcription. Check console for details."
          );
        }
      } else if (participantType === "deaf") {
        // DEAF PARTICIPANT: Receive transcription from hearing participant
        console.log(
          "📡 Initializing deaf participant transcription receiver..."
        );

        // Initialize relay to receive messages
        transcriptionRelay.initialize(
          roomId,
          "deaf",
          participantName,
          (message) => {
            console.log(
              `📥 Received ${message.type} from "${message.participantName}": ${message.text}`
            );
            console.log(`   Full message object:`, message);

            if (message.type === "partial") {
              // Update or add partial message
              setTranscriptionMessages((prev) => {
                // Remove any existing partial message
                const withoutPartials = prev.filter(
                  (msg) => msg.type !== "partial"
                );
                // Add new partial
                return [...withoutPartials, message];
              });

              // Keep old string format for backwards compatibility (if needed)
              setRemoteTranscription((prev) => {
                const lines = prev
                  .split("\n")
                  .filter((line) => !line.startsWith("..."));
                return lines.length > 0
                  ? `${lines.join("\n")}\n...${message.text}`
                  : `...${message.text}`;
              });
            } else if (message.type === "final") {
              // Remove partials and add final message
              setTranscriptionMessages((prev) => {
                const withoutPartials = prev.filter(
                  (msg) => msg.type !== "partial"
                );
                return [...withoutPartials, message];
              });

              // Keep old string format for backwards compatibility
              setRemoteTranscription((prev) => {
                const lines = prev
                  .split("\n")
                  .filter((line) => !line.startsWith("..."));
                return lines.length > 0
                  ? `${lines.join("\n")}\n${message.text}`
                  : message.text;
              });
            }
          }
        );

        setRemoteTranscription(
          "🎤 Waiting for hearing participant to speak..."
        );
        console.log("✅ Deaf participant transcription receiver started");
      }
    },
    [participantType, roomId, showMyTranscription]
  );

  // CREDIT-SAFE: Control transcription based on toggle state (Hearing participants only)
  useEffect(() => {
    if (participantType === "hearing") {
      if (showMyTranscription) {
        // Toggle ON: Start transcription
        console.log(
          "✅ Voice to Text toggle ON - starting Azure Speech-to-Text"
        );
        if (!transcriptionService.isTranscribing()) {
          initializeTranscriptionService(true).catch((error) => {
            console.error("❌ Failed to start transcription:", error);
            setTranscriptionError(error.message || String(error));
          });
        }
      } else {
        // Toggle OFF: Stop transcription immediately
        console.log(
          "⏹️ Voice to Text toggle OFF - stopping Azure Speech-to-Text to save credits"
        );
        transcriptionService.stopTranscription().catch(console.error);
        setMyTranscription("");
        setMyTranscriptionMessages([]);
        setTranscriptionError(null);
      }
    }
  }, [showMyTranscription, participantType, initializeTranscriptionService]);

  // Initialize and join call
  useEffect(() => {
    let mounted = true;

    const initializeAndJoin = async () => {
      try {
        setStatusMessage("Initializing Azure SDK...");

        // Initialize SDK (singleton - reuses existing CallClient/CallAgent if they exist)
        await initializeAzureSDK();
        if (!mounted) return;

        setStatusMessage("Getting room...");

        // Get or create room
        const azureRoomId = await getOrCreateRoom(roomId);
        if (!mounted) return;

        setStatusMessage("Adding you as participant...");

        // Add participant
        await addParticipantToRoom(roomId, null);
        if (!mounted) return;

        setStatusMessage("Joining call...");

        // Join room with callbacks
        const { call, localVideoStream } = await joinRoom(azureRoomId, {
          onStateChanged: async (state) => {
            if (!mounted) return;
            setCallState(state.toLowerCase());
            if (state === "Connected") {
              setStatusMessage("Connected");
              setError("");

              // Wait for call to fully connect, then render video
              // Try multiple times with increasing delays to ensure video is ready
              const tryRenderVideo = async (attempt = 1) => {
                if (!mounted || !localVideoRef.current) return;

                try {
                  console.log(
                    `🔄 Attempting to render video (attempt ${attempt})...`
                  );
                  await renderLocalVideo(localVideoRef.current);
                  setIsCameraOn(true);
                  console.log("✅ Local video rendered successfully");
                } catch (err) {
                  console.warn(
                    `⚠️ Video render attempt ${attempt} failed:`,
                    err
                  );
                  if (attempt < 3) {
                    // Retry with longer delay
                    setTimeout(
                      () => tryRenderVideo(attempt + 1),
                      1000 * attempt
                    );
                  } else {
                    console.error("❌ Failed to render video after 3 attempts");
                  }
                }
              };

              // Start first attempt after 500ms, then retry more aggressively
              setTimeout(() => tryRenderVideo(1), 500);
              // Also try after 1s, 2s, 3s, and 5s to ensure video renders
              setTimeout(() => {
                if (mounted && localVideoRef.current) {
                  tryRenderVideo(1);
                }
              }, 1000);
              setTimeout(() => {
                if (mounted && localVideoRef.current) {
                  tryRenderVideo(1);
                }
              }, 2000);
              setTimeout(() => {
                if (mounted && localVideoRef.current) {
                  tryRenderVideo(1);
                }
              }, 3000);
              setTimeout(() => {
                if (mounted && localVideoRef.current) {
                  tryRenderVideo(1);
                }
              }, 5000);
            } else if (state === "Connecting") {
              setStatusMessage("Connecting...");
            } else if (state === "Disconnected") {
              setStatusMessage("Disconnected");
            }
          },
          onRemoteParticipantsUpdated: async (added, removed) => {
            if (!mounted) return;

            // No cleanup needed for new transcription approach
            // Transcription runs on hearing participant's side
            // Deaf participant just receives text messages

            setRemoteParticipants((prev) => {
              const updated = [...prev];
              added.forEach((p) => {
                if (
                  !updated.find(
                    (ep) =>
                      ep.identifier.communicationUserId ===
                      p.identifier.communicationUserId
                  )
                ) {
                  updated.push(p);
                }
              });
              return updated.filter(
                (p) =>
                  !removed.some(
                    (rp) =>
                      rp.identifier.communicationUserId ===
                      p.identifier.communicationUserId
                  )
              );
            });

            // OLD TRANSCRIPTION CODE REMOVED
            // Now using proper Azure solution:
            // - Hearing participant transcribes their own voice
            // - Text sent via relay to deaf participant
            // No need to capture remote audio anymore!

            // Render remote video for new participants
            added.forEach(async (participant) => {
              const participantId =
                participant.identifier?.communicationUserId ||
                participant.identifier?.rawId ||
                String(participant.identifier);
              console.log(
                "🔄 Rendering video for new participant:",
                participantId
              );

              // Wait a bit for React to update the DOM
              setTimeout(async () => {
                try {
                  const videoTile = document.querySelector(
                    `[data-participant-id="${participantId}"]`
                  );
                  if (videoTile) {
                    const videoElement =
                      videoTile.querySelector(".video-element");
                    if (videoElement) {
                      await renderRemoteVideo(participant, videoElement);
                    }
                  }
                } catch (err) {
                  console.error("Error rendering remote video:", err);
                }
              }, 300);
            });

            // Remove remote video for removed participants
            removed.forEach((participant) => {
              const participantId =
                participant.identifier?.communicationUserId ||
                participant.identifier?.rawId ||
                String(participant.identifier);
              removeRemoteVideo(participantId);
              console.log("❌ Removed participant:", participantId);
            });
          },
          onVideoStreamsUpdated: (data) => {
            if (!mounted) return;
            // data is { participant, videoStream } from participant-level listener
            if (data && data.participant && data.videoStream) {
              const participant = data.participant;
              const participantId =
                participant.identifier?.communicationUserId ||
                participant.identifier?.rawId ||
                String(participant.identifier);
              console.log(
                "📹 Video stream available for participant:",
                participantId
              );

              // Wait for DOM update, then render
              setTimeout(async () => {
                const videoTile = document.querySelector(
                  `[data-participant-id="${participantId}"]`
                );
                if (videoTile) {
                  const videoElement =
                    videoTile.querySelector(".video-element");
                  if (videoElement) {
                    try {
                      await renderRemoteVideo(participant, videoElement);
                    } catch (err) {
                      console.error("Error rendering remote video:", err);
                    }
                  }
                }
              }, 300);
            }
          },
          onDisconnected: (reason) => {
            if (!mounted) return;
            if (reason) {
              const code = reason.code;
              const subCode = reason.subCode;
              if (code === 403 || subCode === 5828) {
                setError(
                  "You are not authorized to join this room. Make sure you're added as a participant."
                );
              } else if (code === 490 || subCode === 4502) {
                setError("Room join failed. Please try again.");
              } else {
                setError(`Call ended (Code: ${code}, SubCode: ${subCode})`);
              }
            }
          },
        });

        callRef.current = call;
        if (!mounted) return;

        // Wait for call to connect before rendering video
        // Video rendering will happen in onStateChanged callback when state is "Connected"

        // Update initial states
        setIsMuted(getMuteState());
        setIsCameraOn(getCameraState());

        setStatusMessage("Connecting...");
        isInitializedRef.current = true;

        console.log("✅ Call joining initiated");

        // CREDIT-SAFE: Initialize transcription relay after call is established
        // But only start transcription if toggle is ON
        if (!isTranscriptionInitialized.current) {
          // For hearing participants, only start if toggle is ON
          if (participantType === "hearing" && showMyTranscription) {
            initializeTranscriptionService(true);
          } else if (participantType === "deaf") {
            // Deaf participants just initialize relay (no API calls)
            initializeTranscriptionService(true);
          }
          isTranscriptionInitialized.current = true;
        }
      } catch (err) {
        console.error("❌ Error initializing/joining:", err);
        if (mounted) {
          setError(err.message || "Failed to join call");
          setStatusMessage("Connection failed. Starting Demo Mode...");
          
          // FALLBACK: Try to get local camera for demo purposes
          const tryLocalCamera = async (constraints) => {
            try {
              console.log(`🔄 Fallback: Requesting local camera (${JSON.stringify(constraints)})...`);
              const stream = await navigator.mediaDevices.getUserMedia(constraints);
              if (localVideoRef.current && mounted) {
                localVideoRef.current.innerHTML = "";
                const video = document.createElement("video");
                video.srcObject = stream;
                video.autoplay = true;
                video.playsInline = true;
                video.muted = true;
                video.style.width = "100%";
                video.style.height = "100%";
                video.style.objectFit = "cover";
                localVideoRef.current.appendChild(video);
                setStatusMessage("Demo Mode (Local Camera Active)");
                setIsCameraOn(true);
                console.log("✅ Local camera started for demo fallback");
                return true;
              }
            } catch (err) {
              console.warn("⚠️ Local camera request failed:", err.name, err.message);
              return false;
            }
            return false;
          };

          // Step 1: Try video and audio
          const success = await tryLocalCamera({ video: true, audio: true });
          
          // Step 2: Try video only if first attempt failed
          if (!success && mounted) {
            const videoOnlySuccess = await tryLocalCamera({ video: true });
            if (!videoOnlySuccess && mounted) {
              setStatusMessage("Camera Access Denied. Please enable permissions in your browser.");
              setError("Azure Join Failed: " + (err.message || "Unknown error") + ". Also could not access local camera.");
            }
          }
        }
      }
    };

    initializeAndJoin();

    // Cleanup on unmount
    return () => {
      mounted = false;
      // CREDIT-SAFE: Always cleanup transcription services on unmount
      console.log("🧹 Cleaning up transcription services on unmount");
      if (participantType === "hearing") {
        transcriptionService.stopTranscription().catch(console.error);
      }
      transcriptionRelay.cleanup();
      // Don't cleanup immediately - let it happen naturally
      // cleanup().catch(console.error);
    };
  }, [roomId]);

  // Handle mute toggle
  const handleToggleMute = useCallback(async () => {
    try {
      setError("");
      const newMutedState = await toggleMute();
      setIsMuted(newMutedState);
      console.log(`✅ Microphone ${newMutedState ? "muted" : "unmuted"}`);

      // Verify the mute state after a short delay
      setTimeout(async () => {
        try {
          const { getMuteState } = await import("../utils/azureWebRTC");
          const actualState = getMuteState();
          if (actualState !== newMutedState) {
            console.warn(
              "⚠️ Mute state mismatch! Expected:",
              newMutedState,
              "Got:",
              actualState
            );
            setIsMuted(actualState);
          }
        } catch (verifyErr) {
          console.warn("Could not verify mute state:", verifyErr);
        }
      }, 300);
    } catch (err) {
      console.error("❌ Error toggling mute:", err);
      // Try to get the actual state
      try {
        const { getMuteState } = await import("../utils/azureWebRTC");
        const actualState = getMuteState();
        setIsMuted(actualState);
        console.log("ℹ️ Updated mute state to actual value:", actualState);
      } catch (stateErr) {
        console.error("Could not get mute state:", stateErr);
      }
      setError("Failed to toggle microphone. Please try again.");
    }
  }, []);

  // Handle camera toggle
  const handleToggleCamera = useCallback(async () => {
    try {
      setError("");
      const newCameraState = await toggleCamera();
      setIsCameraOn(newCameraState);
      console.log(`✅ Camera ${newCameraState ? "turned on" : "turned off"}`);

      // Re-render local video if camera is turned on
      if (newCameraState && localVideoRef.current) {
        // Wait a bit for the stream to be ready, try multiple times
        const tryRender = async (attempt = 1) => {
          if (!localVideoRef.current) return;

          try {
            const { renderLocalVideo } = await import("../utils/azureWebRTC");
            await renderLocalVideo(localVideoRef.current);
            console.log("✅ Camera video rendered successfully");
          } catch (renderErr) {
            console.warn(`⚠️ Render attempt ${attempt} failed:`, renderErr);
            if (attempt < 5) {
              // Try more times with longer delays
              setTimeout(() => tryRender(attempt + 1), 800 * attempt);
            } else {
              console.error("❌ Failed to render video after 5 attempts");
              setError(
                "Camera is on but video may not be visible. Please try toggling again."
              );
            }
          }
        };
        // Start rendering after a short delay to ensure stream is ready
        setTimeout(() => tryRender(1), 500);
      } else if (!newCameraState && localVideoRef.current) {
        // Clear video when camera is off
        if (localVideoRef.current) {
          localVideoRef.current.innerHTML = "";
          console.log("✅ Camera video cleared");
        }
      }
    } catch (err) {
      console.error("❌ Error toggling camera:", err);
      // Don't show error if video is already stopped (that's expected)
      if (
        err.message &&
        (err.message.includes("already stopped") ||
          err.message.includes("already started"))
      ) {
        console.log("ℹ️ Video state conflict, checking actual state...");
        // Check actual state from Azure
        try {
          const { getCameraState } = await import("../utils/azureWebRTC");
          const actualState = getCameraState();
          setIsCameraOn(actualState);
          console.log(`ℹ️ Updated camera state to: ${actualState}`);

          // If camera should be on, try to render
          if (actualState && localVideoRef.current) {
            setTimeout(async () => {
              try {
                const { renderLocalVideo } = await import(
                  "../utils/azureWebRTC"
                );
                await renderLocalVideo(localVideoRef.current);
              } catch (e) {
                console.warn("Could not render after state update:", e);
              }
            }, 500);
          }
        } catch (stateErr) {
          console.warn("Could not get camera state:", stateErr);
        }
      } else {
        setError("Failed to toggle camera. Please try again.");
      }
    }
  }, []);

  // Handle clear transcription (when voice-to-text is toggled off)
  const handleClearTranscription = useCallback(() => {
    console.log("🧹 Clearing transcription messages...");
    setTranscriptionMessages([]);
    setRemoteTranscription("");
    setMyTranscriptionMessages([]);
    setMyTranscription("");
  }, []);

  // Handle leave call
  const handleLeaveCall = useCallback(async () => {
    try {
      await leaveCall();
      window.location.href = "/test-communication";
    } catch (err) {
      console.error("❌ Error leaving call:", err);
      window.location.href = "/test-communication";
    }
  }, []);

  // DEPRECATED: Old transcription method - no longer used
  // Now using proper solution where hearing participant transcribes their own voice
  // and sends text to deaf participant via relay
  const startRemoteParticipantTranscription_DEPRECATED = useCallback(
    async (participant) => {
      // Only proceed if participant type is deaf
      if (participantType !== "deaf") {
        return;
      }

      // Stop any existing recognizer
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.stopContinuousRecognitionAsync(
            () => {
              speechRecognizerRef.current.close();
              speechRecognizerRef.current = null;
            },
            (err) => console.error("Error stopping existing recognizer:", err)
          );
        } catch (err) {
          console.error("Error cleaning up existing recognizer:", err);
        }
      }

      // Helper function to process audio stream for transcription
      const processAudioStreamForTranscription = async (
        audioStream,
        speechKey,
        speechRegion,
        captureAudioContext = null,
        captureSource = null,
        captureDestination = null
      ) => {
        if (!audioStream) {
          console.error("No audio stream provided");
          return;
        }

        // Verify audio tracks exist
        const audioTracks = audioStream.getAudioTracks();
        if (audioTracks.length === 0) {
          console.warn("⚠️ No audio tracks in provided stream");
          setRemoteTranscription("Waiting for participant voice...");
          return;
        }

        console.log(
          "✅ Processing audio stream with",
          audioTracks.length,
          "audio track(s)"
        );

        // Create Azure Speech config
        const speechConfig = sdk.SpeechConfig.fromSubscription(
          speechKey,
          speechRegion
        );
        speechConfig.speechRecognitionLanguage = "en-US";

        // Log configuration for debugging
        console.log("✅ Azure Speech Config:", {
          region: speechRegion,
          keyLength: speechKey.length,
        });

        // Create audio config from stream using PushAudioInputStream
        const pushStream = sdk.AudioInputStream.createPushStream();
        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

        // Convert MediaStream to PushAudioInputStream using Web Audio API
        // Use existing audio context if provided (from capture), otherwise create new one
        const audioContext =
          captureAudioContext ||
          new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000,
          });

        // Create source from the audio stream
        const source = audioContext.createMediaStreamSource(audioStream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
          try {
            const audioData = e.inputBuffer.getChannelData(0);
            const int16Array = new Int16Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
              // Convert float32 (-1 to 1) to int16 (-32768 to 32767)
              const s = Math.max(-1, Math.min(1, audioData[i]));
              int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            pushStream.write(int16Array.buffer);
          } catch (err) {
            console.error("Error processing audio:", err);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        // Store audio context and capture nodes for cleanup
        const audioContextRef = {
          current: audioContext,
          processor,
          source,
          captureAudioContext,
          captureSource,
          captureDestination,
        };

        // Create recognizer
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        // Store audio context ref in recognizer for cleanup
        recognizer.audioContextRef = audioContextRef;

        // Handle recognizing (partial results)
        recognizer.recognizing = (s, e) => {
          if (e.result && e.result.text) {
            console.log("🎤 Recognizing (partial):", e.result.text);
            setRemoteTranscription(e.result.text);
          }
        };

        // Handle recognized (final results)
        recognizer.recognized = (s, e) => {
          if (
            e.result &&
            e.result.reason === sdk.ResultReason.RecognizedSpeech
          ) {
            const text = e.result.text.trim();
            if (text) {
              console.log("🎤 Recognized (final):", text);
              setRemoteTranscription((prev) => {
                // Append new text with newline if previous text exists
                return prev ? `${prev}\n${text}` : text;
              });
            }
          }
        };

        // Handle errors
        recognizer.canceled = (s, e) => {
          console.error("Speech recognition canceled:", e.errorDetails);
          if (e.errorCode !== sdk.CancellationErrorCode.NoError) {
            setRemoteTranscription(`Error: ${e.errorDetails}`);
          }
        };

        recognizer.sessionStopped = (s, e) => {
          console.log("Speech recognition session stopped");
          // Cleanup audio context
          if (recognizer.audioContextRef) {
            try {
              recognizer.audioContextRef.processor.disconnect();
              recognizer.audioContextRef.source.disconnect();
              if (recognizer.audioContextRef.captureSource) {
                recognizer.audioContextRef.captureSource.disconnect();
              }
              if (recognizer.audioContextRef.captureDestination) {
                recognizer.audioContextRef.captureDestination.disconnect();
              }
              recognizer.audioContextRef.current.close();
            } catch (err) {
              console.warn("Error closing audio context:", err);
            }
          }
          speechRecognizerRef.current = null;
        };

        // Start continuous recognition
        recognizer.startContinuousRecognitionAsync(
          () => {
            console.log("✅ Started remote participant transcription");
            speechRecognizerRef.current = recognizer;
            setRemoteTranscription(
              "🎤 Listening for remote participant... Speak now!"
            );
          },
          (err) => {
            console.error("Error starting recognition:", err);
            setRemoteTranscription(
              `Error: ${
                err.message ||
                "Could not start transcription. Please check Azure Speech Service credentials."
              }`
            );
            // Cleanup audio context on error
            if (recognizer.audioContextRef) {
              try {
                recognizer.audioContextRef.processor.disconnect();
                recognizer.audioContextRef.source.disconnect();
                if (recognizer.audioContextRef.captureSource) {
                  recognizer.audioContextRef.captureSource.disconnect();
                }
                if (recognizer.audioContextRef.captureDestination) {
                  recognizer.audioContextRef.captureDestination.disconnect();
                }
                recognizer.audioContextRef.current.close();
              } catch (cleanupErr) {
                console.warn(
                  "Error closing audio context on error:",
                  cleanupErr
                );
              }
            }
          }
        );
      };

      try {
        console.log(
          "🎤 Starting remote participant transcription for deaf user..."
        );

        // Show initial status
        setRemoteTranscription("Initializing transcription...");

        // Get Azure Speech credentials
        const AZURE_SPEECH_KEY =
          import.meta.env.VITE_AZURE_SPEECH_KEY ||
          "YOUR_AZURE_SPEECH_KEY_HERE";
        const AZURE_REGION = import.meta.env.VITE_AZURE_REGION || "westeurope";
        const AZURE_ENDPOINT =
          import.meta.env.VITE_AZURE_ENDPOINT ||
          "https://westeurope.api.cognitive.microsoft.com/";

        console.log("🎤 Azure Speech Config:", {
          region: AZURE_REGION,
          endpoint: AZURE_ENDPOINT,
          keySet: !!AZURE_SPEECH_KEY && AZURE_SPEECH_KEY.length > 0,
        });

        if (!AZURE_SPEECH_KEY || AZURE_SPEECH_KEY.trim() === "") {
          console.error("Azure Speech API key not configured");
          setRemoteTranscription("Error: Azure Speech API key not configured");
          return;
        }

        setRemoteTranscription("Looking for remote participant audio...");

        // DEBUG: Try to access audio from the Call object
        if (callRef.current) {
          console.log(
            "📞 Call object properties:",
            Object.keys(callRef.current)
          );
          console.log(
            "📞 Call.remoteParticipants:",
            callRef.current.remoteParticipants
          );
          console.log("📞 Call.incomingAudio:", callRef.current.incomingAudio);

          // Try to get audio streams from participant
          console.log("👤 Participant properties:", Object.keys(participant));
          console.log("👤 Participant.audioStreams:", participant.audioStreams);
          console.log("👤 Participant.isMuted:", participant.isMuted);
          console.log("👤 Participant.isSpeaking:", participant.isSpeaking);
          console.log("👤 Participant.state:", participant.state);
        }

        // Access remote participant's audio streams directly from Azure participant object
        const participantId =
          participant.identifier?.communicationUserId ||
          participant.identifier?.rawId ||
          String(participant.identifier);

        console.log(
          "🎤 Accessing audio streams for participant:",
          participantId
        );
        console.log("  - participant:", participant);
        console.log("  - participant.audioStreams:", participant.audioStreams);
        console.log("  - participant.videoStreams:", participant.videoStreams);

        // IMPORTANT: Azure Communication Services doesn't expose audioStreams property!
        // Audio is embedded in the video stream or needs to be captured differently.
        // We need to use the browser's native MediaStream from the remote video element

        // Get remote audio streams from participant
        let remoteAudioStream = null;

        // Try Method 1: Check if participant has audioStreams property (unlikely in Azure)
        if (participant.audioStreams && participant.audioStreams.length > 0) {
          console.log("✅ Found participant.audioStreams (rare)");
          // Find available audio stream
          remoteAudioStream = participant.audioStreams.find(
            (stream) => stream.mediaStreamType === "Audio" && stream.isAvailable
          );

          // If not available, try to subscribe
          if (!remoteAudioStream && participant.audioStreams.length > 0) {
            const stream = participant.audioStreams[0];
            if (stream.mediaStreamType === "Audio") {
              console.log("🔄 Attempting to subscribe to audio stream...");
              try {
                await stream.start();
                await new Promise((resolve) => setTimeout(resolve, 500));
                if (stream.isAvailable) {
                  remoteAudioStream = stream;
                }
              } catch (subErr) {
                console.warn("Could not subscribe to audio stream:", subErr);
              }
            }
          }
        } else {
          console.log(
            "⚠️ No participant.audioStreams property (expected for Azure WebRTC)"
          );
          console.log("   Will use alternative audio capture method...");
        }

        // If no audio stream found, try alternative: use Web Audio API to capture from video element
        if (!remoteAudioStream) {
          console.log(
            "⚠️ No direct audio stream, trying to capture from video element..."
          );

          // Find the video element where remote participant's stream is rendered
          let videoElement = null;
          const selectors = [
            `[data-participant-id="${participantId}"] video`,
            `video[data-participant-id="${participantId}"]`,
            `.video-element[data-participant-id="${participantId}"]`,
            `[data-participant-id="${participantId}"] div`, // The video might be rendered in a div
          ];

          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              // Check if it's a video element or contains a video element
              if (element.tagName === "VIDEO") {
                if (
                  element.srcObject &&
                  element.srcObject.getTracks().length > 0
                ) {
                  videoElement = element;
                  console.log("✅ Found video element with srcObject");
                  break;
                }
              } else if (element.querySelector("video")) {
                const video = element.querySelector("video");
                if (video.srcObject && video.srcObject.getTracks().length > 0) {
                  videoElement = video;
                  console.log("✅ Found video element inside container");
                  break;
                }
              }
            }
            if (videoElement) break;
          }

          // If not found, wait and retry with more attempts
          if (!videoElement) {
            console.log(
              "⚠️ Video element not found yet, waiting for remote video to render..."
            );
            // Retry up to 5 times with 2-second delays
            const retryCount =
              startRemoteParticipantTranscription.retryCount || 0;
            if (retryCount < 5) {
              startRemoteParticipantTranscription.retryCount = retryCount + 1;
              console.log(
                `🔄 Retry attempt ${retryCount + 1}/5 for transcription setup`
              );
              setTimeout(async () => {
                await startRemoteParticipantTranscription(participant);
              }, 2000);
            } else {
              console.error("❌ Failed to find video element after 5 retries");
              setRemoteTranscription(
                "Error: Could not access remote video for transcription. Please ensure the remote participant has their camera/microphone enabled."
              );
              startRemoteParticipantTranscription.retryCount = 0; // Reset for next participant
            }
            return;
          }

          // Reset retry count on success
          startRemoteParticipantTranscription.retryCount = 0;

          // Azure WebRTC Issue: Audio is playing but not in srcObject
          // We can HEAR the audio (echo) but can't access it via getAudioTracks()
          // This is because Azure Communication Services plays audio internally
          // without exposing it as a MediaStream

          console.log(
            "🎤 Azure WebRTC detected - using alternative audio capture..."
          );
          console.log(
            "🎤 Note: You can hear the audio (echo), but it's not in srcObject"
          );
          console.log(
            "🎤 Will attempt to capture from audio output using Web Audio API"
          );

          // Try to get audio from video element first
          if (videoElement.srcObject) {
            const mediaStream = videoElement.srcObject;
            const audioTracks = mediaStream.getAudioTracks();
            console.log(
              "📊 Found audio tracks in srcObject:",
              audioTracks.length
            );
            console.log(
              "📊 Video tracks in srcObject:",
              mediaStream.getVideoTracks().length
            );

            if (audioTracks.length > 0) {
              // We have direct audio tracks! Use them directly
              console.log("✅ Using direct audio tracks from srcObject");
              const audioOnlyStream = new MediaStream([audioTracks[0]]);
              remoteAudioStreamRef.current = audioOnlyStream;

              // Log audio track details
              const track = audioTracks[0];
              console.log("🎵 Audio track details:", {
                id: track.id,
                label: track.label,
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
              });

              try {
                console.log("🔄 Processing audio stream for transcription...");
                setRemoteTranscription("Setting up audio transcription...");
                await processAudioStreamForTranscription(
                  audioOnlyStream,
                  AZURE_SPEECH_KEY,
                  AZURE_REGION
                );
                console.log("✅ Audio processing started successfully!");
                return; // Success! Exit early
              } catch (processErr) {
                console.error(
                  "❌ Error processing direct audio tracks:",
                  processErr
                );
                setRemoteTranscription(
                  `Error processing audio: ${processErr.message}`
                );
                // Fall through to Web Audio API approach
              }
            } else {
              console.warn(
                "⚠️ No audio tracks in srcObject - This is expected for Azure WebRTC!"
              );
              console.log(
                "🎤 Azure Communication Services doesn't expose remote audio as MediaStream"
              );
              console.log(
                "🎤 Audio is playing (you can hear it), but not accessible via getAudioTracks()"
              );

              // WORKAROUND for Azure: Capture from local microphone for testing
              // In production, you'd use Azure's built-in transcription or data channels
              console.log(
                "🔄 Attempting workaround: Capture from local audio context..."
              );

              // Try to capture desktop/system audio (Chrome only)
              try {
                console.log(
                  "🎤 Attempting to capture desktop audio (Chrome)..."
                );

                // Request desktop audio capture (tab audio)
                const desktopStream =
                  await navigator.mediaDevices.getDisplayMedia({
                    video: false,
                    audio: {
                      echoCancellation: false,
                      noiseSuppression: false,
                      autoGainControl: false,
                    },
                  });

                if (desktopStream.getAudioTracks().length > 0) {
                  console.log("✅ Captured desktop audio for transcription");
                  setRemoteTranscription(
                    "Setting up audio transcription from desktop audio..."
                  );
                  remoteAudioStreamRef.current = desktopStream;
                  await processAudioStreamForTranscription(
                    desktopStream,
                    AZURE_SPEECH_KEY,
                    AZURE_REGION
                  );
                  return;
                }
              } catch (desktopAudioErr) {
                console.warn(
                  "⚠️ Desktop audio capture failed:",
                  desktopAudioErr.message
                );
              }

              // Fallback for local testing: Use default microphone
              // This will work for local testing because you'll hear yourself speak
              // and the microphone will pick it up for transcription
              console.log(
                "🎤 Attempting fallback: Use default microphone for local testing..."
              );

              try {
                const micStream = await navigator.mediaDevices.getUserMedia({
                  audio: {
                    echoCancellation: false, // Important: Don't cancel echo for testing
                    noiseSuppression: false,
                    autoGainControl: false,
                  },
                });

                if (micStream.getAudioTracks().length > 0) {
                  console.log(
                    "✅ Using default microphone for transcription (local testing mode)"
                  );
                  setRemoteTranscription(
                    "🎤 Using local microphone for transcription (testing mode)\n\nSpeak now to test..."
                  );
                  remoteAudioStreamRef.current = micStream;
                  await processAudioStreamForTranscription(
                    micStream,
                    AZURE_SPEECH_KEY,
                    AZURE_REGION
                  );
                  return;
                }
              } catch (micErr) {
                console.error("❌ Could not access microphone:", micErr);
              }

              // Ultimate fallback: Show informative message
              setRemoteTranscription(
                "⚠️ Azure WebRTC Audio Not Accessible\n\n" +
                  "Solutions for testing:\n\n" +
                  "1. EASY: When prompted, allow microphone access\n" +
                  "   (This will transcribe your voice for testing)\n\n" +
                  "2. ADVANCED: Click the screen share button\n" +
                  "   and select 'This Tab' with audio enabled\n\n" +
                  "Note: Audio IS working (you can hear it),\n" +
                  "but Azure doesn't expose it as MediaStream."
              );

              startRemoteParticipantTranscription.noAudioRetryCount = 0;
              return;
            }
          } else {
            console.warn("⚠️ No srcObject on video element");
            setRemoteTranscription(
              "⚠️ Remote participant's video has no audio source.\n\n" +
                "Please ask the other person to:\n" +
                "1. Enable their microphone\n" +
                "2. Grant microphone permissions\n" +
                "3. Unmute (microphone button should be white, not red)"
            );
            return; // Exit early if no srcObject
          }

          // Fallback: Use Web Audio API to capture from video element playback
          // This path should not be reached if there are no audio tracks
          console.log(
            "🎤 Falling back to Web Audio API capture from video element playback..."
          );
          console.warn(
            "⚠️ Note: This fallback may not work if the video has no audio tracks"
          );

          try {
            // Check if we've already created a source for this video element
            let source = videoElementSourceRef.current;
            let audioContext = null;
            let destination = null;

            if (source && videoElementRef.current === videoElement) {
              // Reuse existing source
              console.log("♻️ Reusing existing MediaElementSourceNode");
              // Get the audio context from the existing source
              audioContext = source.context;
              // Create a new destination for this transcription session
              destination = audioContext.createMediaStreamDestination();
              source.connect(destination);
            } else {
              // Create new source (or reconnect if video element changed)
              if (source) {
                console.log("🔄 Video element changed, cleaning up old source");
                try {
                  source.disconnect();
                } catch (e) {
                  // Ignore if already disconnected
                }
              }

              // Create audio context
              audioContext = new (window.AudioContext ||
                window.webkitAudioContext)({
                sampleRate: 16000,
              });

              // Create a MediaElementAudioSourceNode from the video element
              // This captures audio from the video element's playback
              // NOTE: This can only be called once per video element!
              source = audioContext.createMediaElementSource(videoElement);
              videoElementSourceRef.current = source;
              videoElementRef.current = videoElement;

              // Create a MediaStreamDestination to capture audio
              destination = audioContext.createMediaStreamDestination();

              // Connect source to destination to create a MediaStream with audio
              source.connect(destination);

              // Also connect to audio context destination so audio still plays
              source.connect(audioContext.destination);
            }

            // Get the audio stream from destination
            const audioStream = destination.stream;

            if (audioStream.getAudioTracks().length === 0) {
              console.warn(
                "⚠️ No audio tracks in captured stream from Web Audio API"
              );
              setRemoteTranscription(
                "Waiting for participant voice... (Enable your microphone if you're the remote participant)"
              );
              return;
            }

            console.log(
              "✅ Successfully captured audio stream via Web Audio API"
            );
            remoteAudioStreamRef.current = audioStream;

            // Process the audio stream for transcription
            await processAudioStreamForTranscription(
              audioStream,
              AZURE_SPEECH_KEY,
              AZURE_REGION,
              audioContext,
              source,
              destination
            );
          } catch (audioErr) {
            console.error(
              "❌ Error capturing audio via Web Audio API:",
              audioErr
            );
            setRemoteTranscription(
              `Error: ${
                audioErr.message ||
                "Could not capture audio. Please ensure the remote participant has their microphone enabled."
              }`
            );
          }
        }

        // If we have a remote audio stream from Azure, use video element capture instead
        // (Azure RemoteAudioStream API doesn't expose MediaStream directly)
        if (remoteAudioStream) {
          console.log(
            "⚠️ Azure audio stream found but using video element capture instead"
          );
          // The video element capture code above will handle this
        }
      } catch (error) {
        console.error("❌ Error setting up remote transcription:", error);
        setRemoteTranscription("Error: Could not start transcription");
      }
    },
    [participantType]
  );

  // If participant type is "hearing", render Hearing Communication UI
  if (participantType === "hearing") {
    return (
      <HearingCommunication
        roomId={roomId}
        callState={callState}
        isMuted={isMuted}
        isCameraOn={isCameraOn}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
        onLeaveCall={handleLeaveCall}
        localVideoRef={localVideoRef}
        remoteParticipants={remoteParticipants}
        statusMessage={statusMessage}
        error={error}
        localParticipantName={participantName}
        transcriptionText={myTranscription}
        transcriptionMessages={myTranscriptionMessages}
        showTranscription={showMyTranscription}
        onToggleTranscription={(value) => setShowMyTranscription(value)}
        transcriptionError={transcriptionError}
      />
    );
  }

  // If participant type is "deaf", render Deaf Communication UI
  if (participantType === "deaf") {
    // Use a ref to track if we need to render remote videos
    const remoteVideoRenderTimeoutRef = useRef(null);

    // Effect to render remote videos when participants change
    useEffect(() => {
      if (remoteParticipants.length > 0) {
        // Clear any existing timeout
        if (remoteVideoRenderTimeoutRef.current) {
          clearTimeout(remoteVideoRenderTimeoutRef.current);
        }

        // Wait for DOM update, then render remote videos
        remoteVideoRenderTimeoutRef.current = setTimeout(async () => {
          for (const participant of remoteParticipants) {
            const participantId =
              participant.identifier?.communicationUserId ||
              participant.identifier?.rawId ||
              String(participant.identifier) ||
              `participant-${Date.now()}`;

            console.log(
              "🔍 Looking for video element for participant:",
              participantId
            );

            // Try multiple selectors to find the video element
            let videoTile = document.querySelector(
              `[data-participant-id="${participantId}"]`
            );
            if (!videoTile) {
              // Try finding by class
              videoTile = document.querySelector(
                `.video-element[data-participant-id="${participantId}"]`
              )?.parentElement;
            }

            // If still not found, try to find any video element in PiP area
            if (!videoTile) {
              const pipArea = document.querySelector(
                '[style*="position"][style*="absolute"][style*="top"][style*="right"]'
              );
              if (pipArea) {
                videoTile =
                  pipArea.querySelector("[data-participant-id]") || pipArea;
              }
            }

            if (videoTile) {
              let videoElement = videoTile.querySelector(".video-element");
              if (!videoElement) {
                // If no .video-element found, use the tile itself
                videoElement = videoTile;
              }

              if (videoElement) {
                try {
                  console.log(
                    "✅ Rendering remote video for participant:",
                    participantId,
                    "in element:",
                    videoElement
                  );
                  await renderRemoteVideo(participant, videoElement);
                } catch (err) {
                  console.error(
                    "❌ Error rendering remote video in DeafCommunication:",
                    err
                  );
                  // Retry after a delay
                  setTimeout(async () => {
                    try {
                      await renderRemoteVideo(participant, videoElement);
                    } catch (retryErr) {
                      console.error("❌ Retry also failed:", retryErr);
                    }
                  }, 1000);
                }
              } else {
                console.warn(
                  "⚠️ Video element not found for participant:",
                  participantId
                );
              }
            } else {
              console.warn(
                "⚠️ Video tile not found for participant:",
                participantId,
                "Trying again..."
              );
              // Retry finding the element after a longer delay
              setTimeout(async () => {
                const retryTile = document.querySelector(
                  `[data-participant-id="${participantId}"]`
                );
                if (retryTile) {
                  const retryElement =
                    retryTile.querySelector(".video-element") || retryTile;
                  try {
                    await renderRemoteVideo(participant, retryElement);
                  } catch (err) {
                    console.error("❌ Retry render failed:", err);
                  }
                }
              }, 2000);
            }
          }
        }, 1000); // Increased delay to ensure DOM is ready
      }

      return () => {
        if (remoteVideoRenderTimeoutRef.current) {
          clearTimeout(remoteVideoRenderTimeoutRef.current);
        }
      };
    }, [remoteParticipants]);

    // Cleanup effect for speech recognizer
    useEffect(() => {
      return () => {
        if (speechRecognizerRef.current) {
          try {
            speechRecognizerRef.current.stopContinuousRecognitionAsync(
              () => {
                speechRecognizerRef.current.close();
                speechRecognizerRef.current = null;
              },
              (err) =>
                console.error("Error stopping recognizer on unmount:", err)
            );
          } catch (err) {
            console.error("Error cleaning up recognizer on unmount:", err);
          }
        }
        if (remoteAudioStreamRef.current) {
          remoteAudioStreamRef.current
            .getTracks()
            .forEach((track) => track.stop());
          remoteAudioStreamRef.current = null;
        }
        // Cleanup video element source on unmount
        if (videoElementSourceRef.current) {
          try {
            videoElementSourceRef.current.disconnect();
          } catch (e) {
            // Ignore if already disconnected
          }
          videoElementSourceRef.current = null;
          videoElementRef.current = null;
        }
      };
    }, []);

    return (
      <DeafCommunication
        roomId={roomId}
        callState={callState}
        isMuted={isMuted}
        isCameraOn={isCameraOn}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
        onLeaveCall={handleLeaveCall}
        localVideoRef={localVideoRef}
        remoteParticipants={remoteParticipants}
        statusMessage={statusMessage}
        error={error}
        remoteTranscription={remoteTranscription}
        transcriptionMessages={transcriptionMessages}
        onClearTranscription={handleClearTranscription}
        localParticipantName={participantName}
      />
    );
  }

  return (
    <div className="communication-call">
      <div className="call-header">
        <div className="call-info">
          <span className="room-id">Room: {roomId}</span>
          <span className="participant-type">
            {participantType === "deaf"
              ? "👂 Deaf Participant"
              : "👤 Hearing Participant"}
          </span>
        </div>
        <div className="call-status">
          <span className={`status-indicator ${callState}`}></span>
          <span className="status-text">{statusMessage}</span>
        </div>
      </div>

      <div className="video-container">
        <div className="video-grid">
          {/* Local Video */}
          <div className="video-tile local-video">
            {isCameraOn ? (
              <div ref={localVideoRef} className="video-element"></div>
            ) : (
              <div className="video-placeholder">
                <span className="placeholder-icon">📷</span>
                <span>Camera Off</span>
              </div>
            )}
            <div className="video-label">
              {participantName} (You) {isMuted && "🔇"}
            </div>
          </div>

          {/* Remote Participants */}
          {remoteParticipants.length > 0 ? (
            remoteParticipants.map((participant, index) => {
              const participantId =
                participant.identifier?.communicationUserId ||
                participant.identifier?.rawId ||
                `participant-${index}`;
              return (
                <div
                  key={participantId}
                  className="video-tile remote-video"
                  data-participant-id={participantId}
                >
                  <div className="video-element"></div>
                  <div className="video-label">Participant {index + 1}</div>
                </div>
              );
            })
          ) : (
            <div className="video-tile remote-video waiting">
              <div className="video-placeholder">
                <span className="placeholder-icon">👤</span>
                <span>Waiting for participants...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="call-controls">
        <button
          className={`control-btn ${isMuted ? "muted" : ""}`}
          onClick={handleToggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          <MicIcon muted={isMuted} size={20} />
          <span>{isMuted ? "Unmute" : "Mute"}</span>
        </button>
        <button
          className={`control-btn ${!isCameraOn ? "off" : ""}`}
          onClick={handleToggleCamera}
          title={isCameraOn ? "Turn off camera" : "Turn on camera"}
        >
          <CameraIcon off={!isCameraOn} size={20} />
          <span>{isCameraOn ? "Camera Off" : "Camera On"}</span>
        </button>
        <button
          className="control-btn leave"
          onClick={handleLeaveCall}
          title="End call"
        >
          <PhoneOffIcon size={20} />
          <span>End Call</span>
        </button>
      </div>

      {/* NEW: Transcription Panel for Hearing Participant */}
      {participantType === "hearing" && (
        <HearingTranscriptionPanel
          transcriptionText={myTranscription}
          transcriptionMessages={myTranscriptionMessages}
          isEnabled={showMyTranscription}
          onToggle={() => setShowMyTranscription(!showMyTranscription)}
          error={transcriptionError}
        />
      )}
    </div>
  );
};

export default CommunicationCall;
