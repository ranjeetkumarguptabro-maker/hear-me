/**
 * Video Call Component
 * Handles WebRTC video calling with room/link sharing
 */

import React, { useState, useRef, useEffect } from "react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

// Azure Speech credentials
const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const AZURE_REGION = import.meta.env.VITE_AZURE_REGION || "westeurope";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const VideoCall = ({ onRemoteTranscription }) => {
  const [roomId, setRoomId] = useState("");
  const [isInCall, setIsInCall] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [remoteTranscription, setRemoteTranscription] = useState("");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const signalingChannelRef = useRef(null);
  const recognizerRef = useRef(null);

  // Generate room ID from URL or create new one
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get("room");
    if (urlRoomId) {
      setRoomId(urlRoomId);
      setIsHost(false);
    } else {
      const newRoomId = Math.random().toString(36).substring(2, 9).toUpperCase();
      setRoomId(newRoomId);
      setIsHost(true);
    }
  }, []);

  // Initialize signaling
  useEffect(() => {
    if (!roomId) return;

    try {
      const channel = new BroadcastChannel(`webrtc-${roomId}`);
      signalingChannelRef.current = channel;

      channel.onmessage = async (event) => {
        const { type, data } = event.data;
        console.log("📨 Received signal:", type);

        if (!pcRef.current) return;

        switch (type) {
          case "offer":
            await handleOffer(data);
            break;
          case "answer":
            await handleAnswer(data);
            break;
          case "ice-candidate":
            await handleIceCandidate(data);
            break;
        }
      };

      return () => {
        channel.close();
      };
    } catch (error) {
      console.error("Error setting up signaling:", error);
    }
  }, [roomId]);

  // Handle offer
  const handleOffer = async (offer) => {
    if (!pcRef.current) return;

    await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);

    sendSignal("answer", answer);
  };

  // Handle answer
  const handleAnswer = async (answer) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

  // Handle ICE candidate
  const handleIceCandidate = async (candidate) => {
    if (!pcRef.current) return;
    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
  };

  // Send signal
  const sendSignal = (type, data) => {
    if (signalingChannelRef.current) {
      signalingChannelRef.current.postMessage({ type, data });
    }
  };

  // Start call (host)
  const handleStartCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log("📹 Received remote stream");
        const remoteStream = event.streams[0];
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }

        // Start transcription of remote audio
        startRemoteTranscription(remoteStream);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("ice-candidate", event.candidate);
        }
      };

      pcRef.current = pc;

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal("offer", offer);

      setIsInCall(true);
    } catch (error) {
      console.error("Error starting call:", error);
      alert("Failed to start call. Please check permissions.");
    }
  };

  // Join call (guest)
  const handleJoinCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log("📹 Received remote stream");
        const remoteStream = event.streams[0];
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }

        // Start transcription of remote audio
        startRemoteTranscription(remoteStream);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("ice-candidate", event.candidate);
        }
      };

      pcRef.current = pc;

      setIsInCall(true);
      // Guest will wait for offer from host
    } catch (error) {
      console.error("Error joining call:", error);
      alert("Failed to join call. Please check permissions.");
    }
  };

  // Start transcription of remote audio using Azure Speech-to-Text
  const startRemoteTranscription = async (remoteAudioStream) => {
    try {
      console.log("🎤 Starting remote audio transcription...");

      // Extract audio track from remote stream
      const audioTracks = remoteAudioStream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn("No audio track in remote stream");
        return;
      }

      // Create a new MediaStream with just the audio track
      const audioStream = new MediaStream([audioTracks[0]]);

      // Note: Azure Speech SDK browser version has limitations with custom streams
      // For production, you'd want server-side processing
      // For now, we'll use Web Speech API as fallback for remote audio
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setRemoteTranscription(transcript);
          if (onRemoteTranscription) {
            onRemoteTranscription(transcript);
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
        };

        recognition.start();
        recognizerRef.current = recognition;
      } else {
        console.warn("Web Speech API not supported. Remote transcription unavailable.");
      }
    } catch (error) {
      console.error("Error starting remote transcription:", error);
    }
  };

  // End call
  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setIsInCall(false);
    setRemoteTranscription("");
  };

  // Get shareable link
  const getShareableLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?room=${roomId}`;
  };

  // Copy link to clipboard
  const copyLink = () => {
    navigator.clipboard.writeText(getShareableLink());
    alert("Link copied to clipboard!");
  };

  return (
    <div className="video-call-container">
      <div className="video-call-header">
        <h2>Video Call</h2>
        {roomId && (
          <div className="room-info">
            <span>Room ID: {roomId}</span>
            {isHost && (
              <button onClick={copyLink} className="copy-link-btn">
                Copy Link
              </button>
            )}
          </div>
        )}
      </div>

      {!isInCall ? (
        <div className="call-controls">
          {isHost ? (
            <button onClick={handleStartCall} className="start-call-btn">
              Start Call
            </button>
          ) : (
            <button onClick={handleJoinCall} className="join-call-btn">
              Join Call
            </button>
          )}
          <div className="share-link">
            <p>Share this link:</p>
            <input type="text" value={getShareableLink()} readOnly />
            <button onClick={copyLink}>Copy</button>
          </div>
        </div>
      ) : (
        <div className="video-call-content">
          <div className="video-grid">
            <div className="video-container local">
              <video ref={localVideoRef} autoPlay playsInline muted />
              <div className="video-label">You</div>
            </div>
            {remoteStream && (
              <div className="video-container remote">
                <video ref={remoteVideoRef} autoPlay playsInline />
                <div className="video-label">Remote Participant</div>
              </div>
            )}
          </div>

          {remoteTranscription && (
            <div className="remote-transcription">
              <h3>Remote Participant Speech:</h3>
              <p>{remoteTranscription}</p>
            </div>
          )}

          <button onClick={handleEndCall} className="end-call-btn">
            End Call
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoCall;







