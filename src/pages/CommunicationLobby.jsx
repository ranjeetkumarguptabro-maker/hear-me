import React, { useState, useCallback } from "react";
import { CopyIcon } from "../components/Icons";
import "./CommunicationLobby.css";

const CommunicationLobby = () => {
  console.log("✅ CommunicationLobby component rendering");

  const [roomId, setRoomId] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState("");
  const [participantType, setParticipantType] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  // Generate random room ID
  const generateRoomId = useCallback(() => {
    const newRoomId = Math.random().toString(36).substring(2, 10).toUpperCase();
    setRoomId(newRoomId);
    setError("");
  }, []);

  // Create room on backend
  const handleCreateRoom = useCallback(async () => {
    if (!roomId.trim()) {
      setError("Please generate a room ID first");
      return;
    }

    try {
      setIsCreating(true);
      setError("");

      const { getApiUrl } = await import("../utils/apiConfig");
      const response = await fetch(getApiUrl("/room"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: roomId.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || "Failed to create room"
        );
      }

      const data = await response.json();
      const azureId = data.azureRoomId || data.groupCallId;

      if (!azureId) {
        throw new Error("No Azure room ID returned from server");
      }

      setCreatedRoomId(roomId.trim());
      console.log("✅ Room created:", roomId.trim());
    } catch (err) {
      console.error("❌ Error creating room:", err);
      setError(err.message || "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  }, [roomId]);

  // Copy room code to clipboard
  const handleCopyRoomCode = useCallback(() => {
    if (createdRoomId) {
      navigator.clipboard
        .writeText(createdRoomId)
        .then(() => {
          alert("Room code copied to clipboard!");
        })
        .catch(() => {
          alert("Failed to copy room code");
        });
    }
  }, [createdRoomId]);

  // Join room
  const handleJoinRoom = useCallback(() => {
    if (!roomId.trim()) {
      setError("Please enter or generate a room ID");
      return;
    }

    if (!participantType) {
      setError("Please select participant type");
      return;
    }

    if (!participantName.trim()) {
      setError("Please enter your name");
      return;
    }

    // Navigate to call page with room ID, participant type, and name
    const encodedName = encodeURIComponent(participantName.trim());
    window.location.href = `/communication/call/${roomId.trim()}?type=${participantType}&name=${encodedName}`;
  }, [roomId, participantType, participantName]);

  return (
    <div className="communication-lobby">
      <div className="lobby-container">
        <header className="lobby-header">
          <button 
            onClick={() => window.location.href = "/"}
            className="btn-generate"
            style={{ marginBottom: '24px', padding: '8px 20px', fontSize: '12px' }}
          >
            ← Back to Home
          </button>
          <h1>Video calls for everyone</h1>
          <p>Real-time AI-powered communication that breaks barriers between deaf and hearing communities.</p>
        </header>

        <main className="lobby-actions">
          <section className="action-section">
            <h2>Start a meeting</h2>
            <div className="room-creation">
              <button
                className="btn-generate"
                onClick={generateRoomId}
                disabled={isCreating}
              >
                {roomId ? "Regenerate Code" : "Generate Room Code"}
              </button>
              {roomId && (
                <div className="room-code-display">
                  <span className="room-code">{roomId}</span>
                  <button
                    className="btn-copy"
                    onClick={handleCopyRoomCode}
                    title="Copy room code"
                  >
                    <CopyIcon size={18} />
                  </button>
                </div>
              )}
              <button
                className="btn-create-room"
                onClick={handleCreateRoom}
                disabled={isCreating || !roomId}
              >
                {isCreating ? "Creating..." : "Create New Room"}
              </button>
              {createdRoomId && (
                <div className="room-created-success">
                  <span>Room "{createdRoomId}" is ready!</span>
                  <button
                    className="btn-copy-room"
                    onClick={handleCopyRoomCode}
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="action-section">
            <h2>Join a meeting</h2>
            <div className="join-section">
              <input
                type="text"
                className="room-code-input"
                placeholder="Enter room code"
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value.toUpperCase());
                  setError("");
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleJoinRoom();
                  }
                }}
              />
              <p style={{ fontSize: '12px', color: '#7a748f', marginTop: 'auto' }}>
                Paste the code provided by the meeting organizer to join the conversation instantly.
              </p>
            </div>
          </section>
        </main>

        <section className="participant-name-section">
          <h3>What should we call you?</h3>
          <div className="name-input-wrap">
            <input
              type="text"
              className="name-input"
              placeholder="Your name"
              value={participantName}
              onChange={(e) => {
                setParticipantName(e.target.value);
                setError("");
              }}
              maxLength={50}
            />
          </div>
        </section>

        <section className="participant-type-selection">
          <h3>Choose your experience</h3>
          <div className="type-options">
            <button
              className={`type-option ${
                participantType === "deaf" ? "selected" : ""
              }`}
              onClick={() => setParticipantType("deaf")}
            >
              <span className="type-icon">👂</span>
              <span className="type-label">
                <strong>Deaf Participant</strong><br/>
                Includes sign-to-text and transcription receiver features.
              </span>
            </button>
            <button
              className={`type-option ${
                participantType === "hearing" ? "selected" : ""
              }`}
              onClick={() => setParticipantType("hearing")}
            >
              <span className="type-icon">👤</span>
              <span className="type-label">
                <strong>Hearing Participant</strong><br/>
                Includes voice-to-sign and live audio transcription features.
              </span>
            </button>
          </div>
        </section>

        {error && <div className="error-message">{error}</div>}

        <footer className="join-button-container">
          <button
            className="btn-join"
            onClick={handleJoinRoom}
            disabled={
              !roomId.trim() || !participantType || !participantName.trim()
            }
          >
            Enter Meeting Room
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CommunicationLobby;
