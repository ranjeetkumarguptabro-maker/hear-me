import React from "react";

const ParticipantVideos = ({ participants = [] }) => {
  // Default participants for demo
  const defaultParticipants = [
    { id: 1, name: "Jackie Starling", isOnline: true, videoRef: null },
    { id: 2, name: "Floyd Miles", isOnline: true, videoRef: null },
  ];

  const displayParticipants = participants.length > 0 ? participants : defaultParticipants;

  return (
    <div className="participant-videos-container">
      {displayParticipants.slice(0, 2).map((participant) => (
        <div key={participant.id} className="participant-video-tile">
          <div className="participant-video-placeholder">
            <div className="participant-avatar-large">
              {participant.name.charAt(0)}
            </div>
            {participant.isOnline && (
              <div className="participant-status-badge online"></div>
            )}
          </div>
          <div className="participant-name-small">{participant.name}</div>
        </div>
      ))}
      {displayParticipants.length > 2 && (
        <div className="participant-video-tile more-participants">
          <div className="participant-video-placeholder">
            <span className="more-count">+{displayParticipants.length - 2}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantVideos;







