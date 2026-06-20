import React from "react";

const Sidebar = ({ activeItem, onItemClick }) => {
  return (
    <div className="sidebar">
      {/* Top Icon */}
      <div className="sidebar-icon top-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill="#FFA500" />
          <circle cx="12" cy="5" r="2" fill="#FFA500" />
          <circle cx="19" cy="12" r="2" fill="#FFA500" />
          <circle cx="12" cy="19" r="2" fill="#FFA500" />
          <circle cx="5" cy="12" r="2" fill="#FFA500" />
          <line x1="12" y1="7" x2="12" y2="9" stroke="#FFA500" strokeWidth="2" />
          <line x1="12" y1="15" x2="12" y2="17" stroke="#FFA500" strokeWidth="2" />
          <line x1="17" y1="12" x2="15" y2="12" stroke="#FFA500" strokeWidth="2" />
          <line x1="9" y1="12" x2="7" y2="12" stroke="#FFA500" strokeWidth="2" />
        </svg>
      </div>

      {/* Menu Items */}
      <div className="sidebar-menu">
        <button
          className={`sidebar-item ${activeItem === "home" ? "active" : ""}`}
          onClick={() => onItemClick("home")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>

        <button
          className={`sidebar-item ${activeItem === "power" ? "active" : ""}`}
          onClick={() => onItemClick("power")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </button>

        <button
          className={`sidebar-item ${activeItem === "calendar" ? "active" : ""}`}
          onClick={() => onItemClick("calendar")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>

        <button
          className={`sidebar-item ${activeItem === "document" ? "active" : ""}`}
          onClick={() => onItemClick("document")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </button>

        <button
          className={`sidebar-item ${activeItem === "settings" ? "active" : ""}`}
          onClick={() => onItemClick("settings")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m-4.242 0L5.636 17.364M18.364 6.636l-4.243 4.243m-4.242 0L5.636 6.636" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;







