import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../utils/AuthContext";
import { useTheme } from "../ThemeContext";
import { useSecurity } from "../SecurityContext";

const NavBar = () => {
  const { user, logout } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();
  const { isWarning, timeLeft, formatTime } = useSecurity();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: "/", label: "Dashboard", icon: "🏠" },
    { path: "/appointments", label: "Appointments", icon: "📅" },
    { path: "/mentorships", label: "Mentorships", icon: "🧑‍🏫" },
    { path: "/books", label: "Books", icon: "📚" },
    { path: "/announcements", label: "Announcements", icon: "📢" },
    { path: "/activities", label: "Activities", icon: "🗓" },
    { path: "/contacts", label: "Contacts", icon: "📞" },
    { path: "/profile", label: "Profile", icon: "⚙️" }
  ];

  return (
    <>
      <nav style={{
        background: "var(--header-bg)",
        borderBottom: "1px solid var(--border-color)",
        boxShadow: "var(--shadow)",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "70px"
        }}>
          {/* Logo and Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "var(--accent-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px"
            }}>
              🏥
            </div>
            <div>
              <h1 style={{
                color: "var(--text-primary)",
                margin: 0,
                fontSize: "20px",
                fontWeight: "700"
              }}>
                Counselor Admin
              </h1>
              <p style={{
                color: "var(--text-secondary)",
                margin: 0,
                fontSize: "12px",
                fontWeight: "500"
              }}>
                Welcome, {user?.name || "Counselor"}
              </p>
            </div>
          </div>

          {/* Navigation Menu */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: 1,
            justifyContent: "center",
            maxWidth: "800px"
          }}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  color: isActive(item.path) ? "white" : "var(--text-secondary)",
                  backgroundColor: isActive(item.path) ? "var(--accent-color)" : "transparent",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap"
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.target.style.backgroundColor = "var(--sidebar-hover)";
                    e.target.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path)) {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "var(--text-secondary)";
                  }
                }}
              >
                <span style={{ fontSize: "16px" }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Security Warning */}
            {isWarning && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                backgroundColor: "var(--btn-danger)",
                color: "white",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                <span>⏰</span>
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                backgroundColor: "var(--btn-secondary)",
                color: "var(--text-primary)",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "var(--btn-secondary-hover)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "var(--btn-secondary)";
              }}
            >
              <span>{isDarkMode ? "☀️" : "🌙"}</span>
              <span>{isDarkMode ? "Light" : "Dark"}</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                backgroundColor: "var(--btn-danger)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "var(--btn-danger-hover)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "var(--btn-danger)";
              }}
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default NavBar;
