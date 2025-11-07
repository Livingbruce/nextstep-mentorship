import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isForceAnnouncement, setIsForceAnnouncement] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      }
    }
  };

  async function loadAnnouncements() {
    try {
      setLoading(true);
      const data = await api.get("/api/dashboard/announcements");
      setAnnouncements(data);
      setError(null);
    } catch (err) {
      console.error("Error loading announcements:", err);
      setError("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }

  async function addAnnouncement(e) {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setLoading(true);
      const endpoint = isForceAnnouncement ? "/api/dashboard/announcements/force" : "/api/dashboard/announcements";
      const response = await api.post(endpoint, { 
        message: text,
        is_force: isForceAnnouncement
      });
      
      setText("");
      setIsForceAnnouncement(false);
      loadAnnouncements();
      setError(null);
      
      if (isForceAnnouncement && response.stats) {
        const { total_users, sent_successfully, failed } = response.stats;
        setSuccessMessage(
          `🚨 Force announcement sent!\n` +
          `📊 Total users: ${total_users}\n` +
          `✅ Sent successfully: ${sent_successfully}\n` +
          `❌ Failed: ${failed}`
        );
      } else {
        setSuccessMessage(isForceAnnouncement ? 
          "🚨 Force announcement sent to all clients!" : 
          "✅ Announcement posted!");
      }
      
      // Clear success message after 8 seconds for force announcements (more info to read)
      setTimeout(() => setSuccessMessage(null), isForceAnnouncement ? 8000 : 5000);
    } catch (err) {
      console.error("Error adding announcement:", err);
      setError("Failed to add announcement");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAnnouncement(id) {
    if (!window.confirm("Delete this announcement?")) return;

    try {
      await api.delete(`/api/dashboard/announcements/${id}`);
      loadAnnouncements();
      setError(null);
    } catch (err) {
      console.error("Error deleting announcement:", err);
      setError("Failed to delete announcement");
    }
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Define styling objects using theme variables
  const cardStyle = {
    backgroundColor: "var(--card-bg)",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    boxShadow: "var(--shadow)",
    marginBottom: "20px"
  };

  const formStyle = {
    backgroundColor: "var(--card-bg)",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    boxShadow: "var(--shadow)",
    marginBottom: "20px"
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    border: "1px solid var(--input-border)",
    borderRadius: "4px",
    backgroundColor: "var(--input-bg)",
    color: "var(--text-primary)",
    fontSize: "14px"
  };

  const buttonStyle = {
    backgroundColor: "var(--btn-primary)",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px"
  };

  const deleteButtonStyle = {
    backgroundColor: "var(--alert-danger)",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px"
  };

  const messageStyle = {
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "20px",
    border: "1px solid"
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <button style={{
            ...buttonStyle,
            backgroundColor: "var(--btn-secondary)",
            marginBottom: "20px"
          }}>
            ← Back to Dashboard
          </button>
        </Link>
        <h2 style={{ color: "var(--text-primary)", margin: "0" }}>📢 Announcements</h2>
      </div>
      
      {error && (
        <div style={{
          ...messageStyle,
          backgroundColor: "var(--alert-danger-bg)",
          color: "var(--alert-danger-text)",
          borderColor: "var(--alert-danger-border)"
        }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div style={{
          ...messageStyle,
          backgroundColor: successMessage.includes("Force") ? "var(--alert-warning-bg)" : "var(--alert-success-bg)",
          color: successMessage.includes("Force") ? "var(--alert-warning-text)" : "var(--alert-success-text)",
          borderColor: successMessage.includes("Force") ? "var(--alert-warning-border)" : "var(--alert-success-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <span style={{ whiteSpace: 'pre-line' }}>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            style={{
              background: "none",
              border: "none",
              color: successMessage.includes("Force") ? "var(--alert-warning-text)" : "var(--alert-success-text)",
              fontSize: "18px",
              cursor: "pointer",
              padding: "0",
              marginLeft: "10px"
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={formStyle}>
        <h3 style={{ color: "var(--text-primary)", marginBottom: "15px" }}>New Announcement</h3>
        <form onSubmit={addAnnouncement}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              cursor: "pointer",
              color: "var(--text-primary)"
            }}>
              <input
                type="checkbox"
                checked={isForceAnnouncement}
                onChange={(e) => setIsForceAnnouncement(e.target.checked)}
                style={{ marginRight: "8px" }}
              />
              <span style={{ fontWeight: "500" }}>
                🚨 Force Announcement (sends to all clients)
              </span>
            </label>
            <p style={{ 
              fontSize: "12px", 
              color: "var(--text-secondary)", 
              margin: "5px 0 0 25px",
              fontStyle: "italic"
            }}>
              Bypasses normal channels and sends directly to all clients
            </p>
          </div>
          
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isForceAnnouncement ? 
              "Enter urgent announcement message..." : 
              "Enter announcement message..."}
            required
            disabled={loading}
            style={{
              ...inputStyle,
              minHeight: "100px",
              marginBottom: "10px",
              resize: "vertical"
            }}
          />
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              type="submit" 
              disabled={loading || !text.trim()}
              style={{
                ...buttonStyle,
                backgroundColor: loading ? "var(--btn-secondary)" : 
                  isForceAnnouncement ? "var(--alert-danger)" : "var(--btn-primary)",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Posting..." : 
                isForceAnnouncement ? "🚨 Send Force Announcement" : "📢 Post"}
            </button>
            
            {isForceAnnouncement && (
              <button 
                type="button"
                onClick={() => setIsForceAnnouncement(false)}
                style={{
                  ...buttonStyle,
                  backgroundColor: "var(--btn-secondary)"
                }}
              >
                Cancel Force
              </button>
            )}
          </div>
        </form>
      </div>

      <div>
        <h3 style={{ color: "var(--text-primary)", marginBottom: "15px" }}>Recent</h3>
        {announcements.length === 0 ? (
          <div style={{
            ...cardStyle,
            textAlign: "center"
          }}>
            <p style={{ color: "var(--text-secondary)", fontStyle: "italic", margin: 0 }}>
              No announcements found.
            </p>
          </div>
        ) : (
          <div style={cardStyle}>
            {announcements.map((announcement, index) => (
              <div key={announcement.id} style={{ 
                padding: "15px 0", 
                borderBottom: index < announcements.length - 1 ? "1px solid var(--border-color)" : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start"
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 5px 0", fontSize: "16px", color: "var(--text-primary)" }}>
                    {announcement.message}
                  </p>
                  <p style={{ margin: "0", fontSize: "14px", color: "var(--text-secondary)" }}>
                    Posted: {formatDate(announcement.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => deleteAnnouncement(announcement.id)}
                  style={deleteButtonStyle}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
