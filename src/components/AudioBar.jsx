import React, { useState } from "react";

const PlayIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5V19L19 12L8 5Z" fill={color} />
  </svg>
);

const PauseIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="4" height="16" fill={color} />
    <rect x="14" y="4" width="4" height="16" fill={color} />
  </svg>
);

const AudioBar = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Simulated waveform bars
  const waveformBars = [0.4, 0.7, 0.5, 0.9, 0.3, 0.8, 0.6, 0.4, 0.7, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.7, 0.5, 0.8, 0.6, 0.4];

  return (
    <div className="audio-bar">
      {/* Play/Pause Button */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="audio-bar-play-btn"
      >
        {isPlaying ? (
          <PauseIcon size={20} color="currentColor" />
        ) : (
          <PlayIcon size={20} color="currentColor" />
        )}
      </button>

      {/* Waveform Visualization */}
      <div className="audio-bar-waveform">
        {waveformBars.map((height, index) => (
          <div
            key={index}
            className="waveform-bar"
            style={{
              height: `${height * 100}%`,
              animationDelay: `${index * 0.05}s`,
              animation: isPlaying ? `waveform 1.2s ease-in-out infinite` : "none",
              transform: isPlaying ? undefined : `scaleY(${height})`,
            }}
          />
        ))}
      </div>

      {/* Timestamp */}
      <div className="audio-bar-time">
        {isPlaying ? "0:12" : "0:00"} / 0:45
      </div>
    </div>
  );
};

export default AudioBar;

