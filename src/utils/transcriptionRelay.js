/**
 * Transcription Relay Service
 * Sends transcription text from hearing participant to deaf participant
 * Uses backend API for real-time message relay
 */

import { getApiUrl } from "./apiConfig";

class TranscriptionRelay {
  constructor() {
    this.roomId = null;
    this.participantType = null;
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

    console.log(
      `📡 Transcription relay initialized for ${participantName} (${participantType}) in room ${roomId}`
    );

    // If deaf participant, start polling for messages
    if (participantType === "deaf") {
      this.startPolling();
    }
  }

  /**
   * Send transcription text (hearing participant only)
   * @param {Object} message - Message object { type, text, timestamp }
   */
  async sendTranscription(message) {
    if (this.participantType !== "hearing") {
      console.warn("⚠️ Only hearing participant can send transcription");
      throw new Error("Only hearing participant can send transcription");
    }

    if (!this.roomId) {
      console.error("❌ Room ID not set");
      throw new Error("Room ID not set");
    }

    try {
      const url = getApiUrl(`/transcription/${this.roomId}`);
      console.log(`📤 Sending to: ${url}`, message);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: message.type,
          text: message.text,
          timestamp: message.timestamp,
          participantType: this.participantType,
          participantName: this.participantName,
        }),
      });

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => response.statusText);
        console.error(
          `❌ Failed to send transcription (${response.status}):`,
          errorText
        );

        if (response.status === 404) {
          throw new Error(
            "Backend endpoint not found (404). Make sure backend is running and has the transcription endpoints."
          );
        } else if (response.status === 500) {
          throw new Error(
            "Backend server error (500). Check backend console for errors."
          );
        } else {
          throw new Error(
            `Failed to send transcription: ${response.status} ${errorText}`
          );
        }
      }

      console.log("✅ Transcription sent successfully");
      return await response.json();
    } catch (error) {
      console.error("❌ Error sending transcription:", error);

      if (error.message && error.message.includes("fetch")) {
        throw new Error(`Cannot connect to backend.`);
      }

      throw error;
    }
  }

  /**
   * Start polling for transcription messages (deaf participant only)
   */
  startPolling() {
    if (this.isPolling) {
      console.warn("⚠️ Already polling");
      return;
    }

    console.log("📡 Starting transcription polling...");
    this.isPolling = true;

    // Poll every 500ms for low latency
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(
          getApiUrl(
            `/transcription/${this.roomId}?since=${this.lastMessageId}`
          ),
          {
            method: "GET",
          }
        );

        if (response.ok) {
          const messages = await response.json();

          if (messages && messages.length > 0) {
            messages.forEach((msg) => {
              if (msg.id > this.lastMessageId) {
                this.lastMessageId = msg.id;
                if (this.onMessageCallback) {
                  this.onMessageCallback(msg);
                }
              }
            });
          }
        }
      } catch (error) {
        // Silently fail - backend might not be ready yet
        // console.warn("⚠️ Polling error:", error.message);
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
      console.log("⏹️ Stopped transcription polling");
    }
  }

  /**
   * Clean up
   */
  cleanup() {
    this.stopPolling();
    this.roomId = null;
    this.participantType = null;
    this.onMessageCallback = null;
    this.lastMessageId = 0;
  }
}

// Export singleton instance
export const transcriptionRelay = new TranscriptionRelay();
