import React from "react";

const ParticipantsSidebar = ({ participants = [] }) => {
  // Default participants for demo with stock images
  const defaultParticipants = [
    {
      id: 1,
      name: "Jackie Starling",
      isOnline: true,
      isSpeaking: false,
      avatar: "J",
      imageUrl:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=300&fit=crop&crop=faces&auto=format",
    },
  ];

  const displayParticipants =
    participants.length > 0 ? participants : defaultParticipants;
  const mainParticipants = displayParticipants.slice(0, 1);

  return (
    <div className="participants-sidebar">
      {/* Main Participants (Large Video Feeds) */}
      <div className="participants-main-list">
        {mainParticipants.map((participant) => (
          <div
            key={participant.id}
            className={`participant-item-large ${
              participant.isSpeaking ? "speaking" : ""
            }`}
          >
            <div className="participant-video-large">
              {participant.imageUrl ? (
                <img
                  src={participant.imageUrl}
                  alt={participant.name}
                  className="participant-video-image"
                  onError={(e) => {
                    // Fallback to avatar if image fails to load
                    e.target.style.display = "none";
                    const avatar = e.target.nextElementSibling;
                    if (avatar) avatar.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className="participant-avatar-large"
                style={{ display: participant.imageUrl ? "none" : "flex" }}
              >
                {participant.avatar || participant.name.charAt(0)}
              </div>
              {participant.isOnline && (
                <div className="participant-status online"></div>
              )}
            </div>
            <div className="participant-name-large">{participant.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantsSidebar;
