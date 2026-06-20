/**
 * Simple Signaling Service
 * Uses BroadcastChannel for same-origin signaling (demo)
 * For production, replace with Socket.io or WebSocket server
 */

let signalingChannel = null;

/**
 * Initialize signaling channel
 */
export function initSignaling(roomId, onSignal) {
  try {
    signalingChannel = new BroadcastChannel(`webrtc-${roomId}`);
    
    signalingChannel.onmessage = (event) => {
      const { type, data } = event.data;
      console.log("📨 Received signal:", type);
      
      if (onSignal) {
        onSignal(type, data);
      }
    };

    return true;
  } catch (error) {
    console.error("Error initializing signaling:", error);
    return false;
  }
}

/**
 * Send signal (offer, answer, ICE candidate)
 */
export function sendSignal(type, data) {
  if (signalingChannel) {
    signalingChannel.postMessage({ type, data });
    console.log("📤 Sent signal:", type);
  }
}

/**
 * Close signaling channel
 */
export function closeSignaling() {
  if (signalingChannel) {
    signalingChannel.close();
    signalingChannel = null;
  }
}

/**
 * Generate a random room ID
 */
export function generateRoomId() {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}
