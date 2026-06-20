import React from "react";

/**
 * Communication Controls Panel
 * Fine-grained toggles for transcription sources and feature routing
 */
const CommunicationControls = ({
  // Transcription Source Toggles
  transcribeLocalVoice,
  setTranscribeLocalVoice,
  transcribeRemoteVoice,
  setTranscribeRemoteVoice,
  
  // Text → Sign/GIF Routing Toggles
  sendLocalTextToSign,
  setSendLocalTextToSign,
  sendRemoteTextToSign,
  setSendRemoteTextToSign,
  
  // Feature Enable/Disable Toggles
  azureSpeechToTextEnabled,
  setAzureSpeechToTextEnabled,
  signLanguageGifEnabled,
  setSignLanguageGifEnabled,
  aiPredictionEnabled,
  setAiPredictionEnabled,
  
  // Azure Call Controls
  isCallActive,
  callState,
  onStartCall,
  onJoinRoom,
  onGenerateRoomId,
  onEndCall,
  calleeId,
  setCalleeId,
  currentRoomId = null,
  error = null,
  myUserId = "",
  isLoadingMyUserId = false,
}) => {
  return (
    <div className="communication-controls-panel">
      <div className="controls-section">
        <h4 className="controls-section-title">Azure Video Call</h4>
        
        {/* Display current user's ID */}
        {myUserId && (
          <div style={{ 
            marginBottom: "12px", 
            padding: "8px 12px", 
            background: "rgba(76, 175, 80, 0.15)", 
            border: "1px solid rgba(76, 175, 80, 0.3)", 
            borderRadius: "6px",
            fontSize: "11px"
          }}>
            <div style={{ color: "#4caf50", fontWeight: "600", marginBottom: "4px" }}>Your User ID:</div>
            <div style={{ 
              fontFamily: "monospace", 
              background: "rgba(0,0,0,0.3)", 
              padding: "4px 8px", 
              borderRadius: "4px",
              wordBreak: "break-all",
              fontSize: "10px"
            }}>
              {myUserId}
            </div>
            <div style={{ marginTop: "4px", fontSize: "10px", color: "rgba(255, 255, 255, 0.7)" }}>
              Share this ID with others to receive calls
            </div>
          </div>
        )}
        
        {isLoadingMyUserId && (
          <div style={{ marginBottom: "12px", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)" }}>
            Loading your user ID...
          </div>
        )}

        <div className="call-controls-row">
          {!isCallActive ? (
            <>
              {/* Room-based calling */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Enter Room ID to join"
                    value={calleeId || ""}
                    onChange={(e) => setCalleeId(e.target.value)}
                    className="callee-input"
                    style={{ flex: 1 }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && calleeId && calleeId.trim()) {
                        onJoinRoom?.(calleeId.trim());
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (onGenerateRoomId) {
                        const newRoomId = onGenerateRoomId();
                        setCalleeId(newRoomId);
                      }
                    }}
                    className="control-btn"
                    style={{ whiteSpace: "nowrap", padding: "8px 12px" }}
                    title="Create new room"
                  >
                    🆕 Create Room
                  </button>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => {
                      if (calleeId && calleeId.trim()) {
                        onJoinRoom?.(calleeId.trim());
                      }
                    }}
                    disabled={!calleeId || !calleeId.trim() || callState === "connecting"}
                    className="control-btn start-call-btn"
                    style={{ flex: 1 }}
                  >
                    {callState === "connecting" ? "Joining..." : "Join Room"}
                  </button>
                </div>
                {currentRoomId && (
                  <div style={{ 
                    marginTop: "4px", 
                    padding: "6px 8px", 
                    background: "rgba(33, 150, 243, 0.15)", 
                    border: "1px solid rgba(33, 150, 243, 0.3)", 
                    borderRadius: "4px",
                    fontSize: "11px"
                  }}>
                    <div style={{ color: "#2196f3", fontWeight: "600", marginBottom: "2px" }}>Current Room:</div>
                    <div style={{ 
                      fontFamily: "monospace", 
                      background: "rgba(0,0,0,0.3)", 
                      padding: "2px 6px", 
                      borderRadius: "3px",
                      wordBreak: "break-all",
                      fontSize: "10px"
                    }}>
                      {currentRoomId}
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "9px", color: "rgba(255, 255, 255, 0.7)" }}>
                      Share this Room ID with others to join
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={onEndCall}
              className="control-btn end-call-btn"
            >
              Leave Room
            </button>
          )}
          {callState && callState !== "disconnected" && (
            <span className={`call-status status-${callState.toLowerCase().replace(/\s+/g, '-')}`}>
              {callState === "Connecting" ? "🔄 Connecting..." : 
               callState === "Connected" ? "✅ Connected" : 
               callState === "Ringing" ? "📞 Ringing..." :
               callState}
            </span>
          )}
        </div>
        {error && (
          <div style={{ 
            marginTop: "12px", 
            padding: "10px 12px", 
            background: "rgba(244, 67, 54, 0.2)", 
            border: "1px solid rgba(244, 67, 54, 0.5)", 
            borderRadius: "6px",
            fontSize: "12px",
            color: "#f44336",
            lineHeight: "1.5"
          }}>
            ⚠️ <strong>Error:</strong> {error}
          </div>
        )}
        <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", marginTop: "12px", lineHeight: "1.6" }}>
          <div style={{ marginBottom: "6px", fontWeight: "600", color: "rgba(255, 215, 0, 0.8)" }}>📋 Setup Required:</div>
          <div style={{ marginTop: "4px", fontSize: "10px", paddingLeft: "8px" }}>
            1. Install SDK: <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "3px", fontSize: "10px" }}>pip install azure-communication-identity</code>
          </div>
          <div style={{ marginTop: "4px", fontSize: "10px", paddingLeft: "8px" }}>
            2. Start backend: <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "3px", fontSize: "10px" }}>cd backend && python main.py</code>
          </div>
          <div style={{ marginTop: "4px", fontSize: "10px", paddingLeft: "8px" }}>
            3. Verify connection string in <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "3px", fontSize: "10px" }}>backend/main.py</code>
          </div>
          {myUserId && (
            <div style={{ marginTop: "8px", fontSize: "10px", paddingLeft: "8px", color: "rgba(255, 215, 0, 0.9)", fontWeight: "600" }}>
              ✅ Your User ID is loaded above. Use that format (8:acs:...) when calling others.
            </div>
          )}
        </div>
      </div>

      <div className="controls-section">
        <h4 className="controls-section-title">Voice Transcription Source</h4>
        <div className="toggle-group">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={transcribeLocalVoice}
              onChange={(e) => setTranscribeLocalVoice(e.target.checked)}
              disabled={!azureSpeechToTextEnabled}
            />
            <span>Transcribe My Voice</span>
          </label>
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={transcribeRemoteVoice}
              onChange={(e) => setTranscribeRemoteVoice(e.target.checked)}
              disabled={!azureSpeechToTextEnabled}
            />
            <span>Transcribe Participant Voice</span>
          </label>
        </div>
      </div>

      <div className="controls-section">
        <h4 className="controls-section-title">Text → Sign Language / GIF</h4>
        <div className="toggle-group">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={sendLocalTextToSign}
              onChange={(e) => setSendLocalTextToSign(e.target.checked)}
              disabled={!signLanguageGifEnabled || !transcribeLocalVoice}
            />
            <span>Send My Text to Sign Language</span>
          </label>
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={sendRemoteTextToSign}
              onChange={(e) => setSendRemoteTextToSign(e.target.checked)}
              disabled={!signLanguageGifEnabled || !transcribeRemoteVoice}
            />
            <span>Send Participant Text to Sign Language</span>
          </label>
        </div>
      </div>

      <div className="controls-section">
        <h4 className="controls-section-title">Feature Controls</h4>
        <div className="toggle-group">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={azureSpeechToTextEnabled}
              onChange={(e) => setAzureSpeechToTextEnabled(e.target.checked)}
            />
            <span>Azure Speech-to-Text</span>
          </label>
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={signLanguageGifEnabled}
              onChange={(e) => setSignLanguageGifEnabled(e.target.checked)}
            />
            <span>Sign Language / GIF Rendering</span>
          </label>
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={aiPredictionEnabled}
              onChange={(e) => setAiPredictionEnabled(e.target.checked)}
            />
            <span>AI Prediction Panel</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default CommunicationControls;

