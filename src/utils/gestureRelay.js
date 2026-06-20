/**
 * Gesture Prediction Relay Service
 * Sends gesture predictions from deaf participant to hearing participant
 * Uses backend API for real-time message relay (same pattern as transcription)
 */

import { getApiUrl } from './apiConfig';

class GestureRelay {
  constructor() {
    this.roomId = null;
    this.participantType = null;
    this.participantName = null;
    this.onMessageCallback = null;
    this.pollingInterval = null;
    this.lastMessageId = 0;
    this.isPolling = false;
  }

  /**
   * Initialize relay for a room
   * @param {string} roomId - Room ID
   * @param {string} participantType - "deaf" or "hearing"
   * @param {string} participantName - Name of the participant
   * @param {Function} onMessage - Callback for received messages
   */
  initialize(roomId, participantType, participantName, onMessage) {
    this.roomId = roomId;
    this.participantType = participantType;
    this.participantName = participantName || "Participant";
    this.onMessageCallback = onMessage;

    console.log(`🤲 Gesture relay initialized for ${participantName} (${participantType}) in room ${roomId}`);

    // If hearing participant, start polling for messages
    if (participantType === "hearing") {
      this.startPolling();
    }
  }

  /**
   * Send gesture prediction (deaf participant only)
   * @param {string} predictionText - The predicted gesture text (e.g., "HELLO", "A")
   */
  async sendGesturePrediction(predictionText) {
    if (this.participantType !== "deaf") {
      console.warn("⚠️ Only deaf participant can send gesture predictions");
      return;
    }

    if (!this.roomId) {
      console.error("❌ Room ID not set");
      return;
    }

    if (!predictionText || predictionText.trim() === "") {
      return; // Don't send empty predictions
    }

    try {
      const url = getApiUrl(`/gesture/${this.roomId}`);
      console.log(`🤲 Sending gesture prediction: "${predictionText}"`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: predictionText.trim(),
          timestamp: Date.now(),
          participantType: this.participantType,
          participantName: this.participantName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        console.error(`❌ Failed to send gesture prediction (${response.status}):`, errorText);
        return;
      }
      
      const result = await response.json();
      console.log("✅ Gesture prediction sent successfully, messageId:", result.messageId);
      return result;
    } catch (error) {
      console.error("❌ Error sending gesture prediction:", error);
      if (error.message && error.message.includes("fetch")) {
        console.error(`   → Backend may not be running or endpoint not found.`);
      }
      // Don't throw - gesture predictions are non-critical
    }
  }

  /**
   * Start polling for gesture predictions (hearing participant only)
   */
  startPolling() {
    if (this.isPolling) {
      console.warn("⚠️ Already polling for gestures");
      return;
    }

    console.log("📡 Starting gesture prediction polling...");
    this.isPolling = true;

    // Poll every 500ms for low latency
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(
          getApiUrl(`/gesture/${this.roomId}?since=${this.lastMessageId}`),
          {
            method: "GET",
          }
        );

        if (response.ok) {
          const messages = await response.json();
          
          if (messages && messages.length > 0) {
            console.log(`🤲 Received ${messages.length} gesture message(s)`);
            messages.forEach((msg) => {
              if (msg.id > this.lastMessageId) {
                this.lastMessageId = msg.id;
                if (this.onMessageCallback) {
                  this.onMessageCallback(msg);
                }
              }
            });
          }
        } else {
          // Log error for debugging
          if (response.status === 404) {
            console.warn(`⚠️ Gesture endpoint not found (404). Backend may need restart.`);
          } else {
            console.warn(`⚠️ Gesture polling error: ${response.status}`);
          }
        }
      } catch (error) {
        // Log error for debugging
        console.warn("⚠️ Gesture polling error:", error.message);
      }
    }, 500); // Poll every 500ms
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPolling = false;
      console.log("⏹️ Stopped gesture prediction polling");
    }
  }

  /**
   * Clean up
   */
  cleanup() {
    this.stopPolling();
    this.roomId = null;
    this.participantType = null;
    this.participantName = null;
    this.onMessageCallback = null;
    this.lastMessageId = 0;
  }
}

// Export singleton instance
export const gestureRelay = new GestureRelay();

