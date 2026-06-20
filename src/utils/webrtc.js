/**
 * WebRTC Utilities for Video Calling
 * Handles peer-to-peer connections, signaling, and audio/video streams
 */

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * Create a WebRTC peer connection
 */
export function createPeerConnection(onRemoteStream) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  // Handle remote stream
  pc.ontrack = (event) => {
    console.log("📹 Received remote stream:", event.streams[0]);
    if (onRemoteStream) {
      onRemoteStream(event.streams[0]);
    }
  };

  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("🧊 ICE candidate:", event.candidate);
    }
  };

  // Handle connection state changes
  pc.onconnectionstatechange = () => {
    console.log("🔌 Connection state:", pc.connectionState);
  };

  return pc;
}

/**
 * Create offer and set local description
 */
export async function createOffer(pc) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return offer;
}

/**
 * Create answer and set local description
 */
export async function createAnswer(pc) {
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

/**
 * Set remote description from offer/answer
 */
export async function setRemoteDescription(pc, description) {
  await pc.setRemoteDescription(new RTCSessionDescription(description));
}

/**
 * Add ICE candidate
 */
export async function addIceCandidate(pc, candidate) {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

/**
 * Get user media (camera + microphone)
 */
export async function getUserMedia() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: true,
    });
    return stream;
  } catch (error) {
    console.error("Error accessing media:", error);
    throw error;
  }
}

/**
 * Extract audio stream from a video stream
 */
export function getAudioStream(stream) {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const destination = audioContext.createMediaStreamDestination();
  source.connect(destination);
  return destination.stream;
}







