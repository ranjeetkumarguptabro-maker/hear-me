import React from "react";

const EarIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill={color} />
    <path d="M12 6C9.79 6 8 7.79 8 10C8 10.55 8.45 11 9 11C9.55 11 10 10.55 10 10C10 8.9 10.9 8 12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12C11.45 12 11 12.45 11 13C11 13.55 11.45 14 12 14C13.1 14 14 14.9 14 16C14 17.1 13.1 18 12 18C10.9 18 10 17.1 10 16C10 15.45 9.55 15 9 15C8.45 15 8 15.45 8 16C8 17.21 9.79 19 12 19C14.21 19 16 17.21 16 16C16 14.79 15.21 14 14 14C13.45 14 13 13.55 13 13C13 12.45 13.45 12 14 12C15.21 12 16 11.21 16 10C16 7.79 14.21 6 12 6Z" fill={color} />
  </svg>
);

const UsersIcon = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" fill={color} />
    <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" fill={color} />
    <path d="M20 9C20 10.1046 19.1046 11 18 11C16.8954 11 16 10.1046 16 9C16 7.89543 16.8954 7 18 7C19.1046 7 20 7.89543 20 9Z" fill={color} />
    <path d="M22 20C22 18.3431 20.6569 17 19 17C17.3431 17 16 18.3431 16 20H22Z" fill={color} />
  </svg>
);

const SettingsIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.14 12.94C19.18 12.64 19.2 12.33 19.2 12C19.2 11.67 19.18 11.36 19.14 11.06L21.16 9.12C21.39 8.89 21.46 8.53 21.34 8.21L19.34 4.29C19.21 3.96 18.88 3.75 18.53 3.79L16.05 4.13C15.55 3.55 14.97 3.05 14.33 2.64L13.96 0.18C13.92 -0.06 13.7 -0.24 13.46 -0.24H10.54C10.3 -0.24 10.08 -0.06 10.04 0.18L9.67 2.64C9.03 3.05 8.45 3.55 7.95 4.13L5.47 3.79C5.12 3.75 4.79 3.96 4.66 4.29L2.66 8.21C2.54 8.53 2.61 8.89 2.84 9.12L4.86 11.06C4.82 11.36 4.8 11.67 4.8 12C4.8 12.33 4.82 12.64 4.86 12.94L2.84 14.88C2.61 15.11 2.54 15.47 2.66 15.79L4.66 19.71C4.79 20.04 5.12 20.25 5.47 20.21L7.95 19.87C8.45 20.45 9.03 20.95 9.67 21.36L10.04 23.82C10.08 24.06 10.3 24.24 10.54 24.24H13.46C13.7 24.24 13.92 24.06 13.96 23.82L14.33 21.36C14.97 20.95 15.55 20.45 16.05 19.87L18.53 20.21C18.88 20.25 19.21 20.04 19.34 19.71L21.34 15.79C21.46 15.47 21.39 15.11 21.16 14.88L19.14 12.94ZM12 15.6C9.97 15.6 8.4 14.03 8.4 12C8.4 9.97 9.97 8.4 12 8.4C14.03 8.4 15.6 9.97 15.6 12C15.6 14.03 14.03 15.6 12 15.6Z" fill={color} />
  </svg>
);

const Header = () => {
  return (
    <header className="comm-header">
      {/* Logo */}
      <div className="comm-header-logo">
        <div className="comm-header-logo-icon glow-primary">
          <EarIcon size={20} color="currentColor" />
        </div>
        <h1 className="comm-header-title">Hear-Me</h1>
      </div>

      {/* Actions */}
      <div className="comm-header-actions">
        <div className="pill-badge">
          <UsersIcon size={14} color="currentColor" />
          <span>2 Connected</span>
        </div>
        <button className="glass-button comm-header-settings">
          <SettingsIcon size={16} color="currentColor" />
        </button>
      </div>
    </header>
  );
};

export default Header;

