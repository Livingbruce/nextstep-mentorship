import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../utils/AuthContext";
import api from "../utils/api";

const Absence = () => {
  const { user, handleAuthError } = useContext(AuthContext);
  const [absenceDays, setAbsenceDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadAbsenceDays();
  }, []);

  const loadAbsenceDays = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/dashboard/absence");
      console.log("Absence days response:", response); // Debug log
      setAbsenceDays(response || []);
    } catch (err) {
      console.error("Error loading absence days:", err);
      if (err.message?.includes("401") || err.message?.includes("403")) {
        handleAuthError();
        return;
      }
      setError("Failed to load absence days");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate) {
      setError("Please select a date");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      console.log("Submitting absence:", { date: selectedDate, reason: reason || "Personal absence" }); // Debug log
      const response = await api.post("/api/dashboard/absence", {
        date: selectedDate,
        reason: reason || "Personal absence"
      });
      console.log("Absence creation response:", response); // Debug log
      
      setSuccess("Absence day marked successfully!");
      setSelectedDate("");
      setReason("");
      loadAbsenceDays();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error marking absence:", err);
      if (err.message?.includes("401") || err.message?.includes("403")) {
        handleAuthError();
        return;
      }
      setError("Failed to mark absence day");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this absence day?")) {
      return;
    }

    try {
      await api.delete(`/api/dashboard/absence/${id}`);
      setSuccess("Absence day removed successfully!");
      loadAbsenceDays();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting absence:", err);
      if (err.message?.includes("401") || err.message?.includes("403")) {
        handleAuthError();
        return;
      }
      setError("Failed to remove absence day");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "50vh",
        fontSize: "18px",
        color: "var(--text-primary)"
      }}>
        Loading absence days...
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ 
          color: "var(--text-primary)", 
          marginBottom: "10px",
          fontSize: "28px",
          fontWeight: "600"
        }}>
          📅 Absence Management
        </h1>
        <p style={{ 
          color: "var(--text-secondary)", 
          fontSize: "16px",
          marginBottom: "20px"
        }}>
          Mark days when you'll be unavailable for appointments. This helps prevent clients from booking during your absence.
        </p>
      </div>

      {error && (
        <div style={{
          backgroundColor: "#fee2e2",
          border: "1px solid #fecaca",
          color: "#dc2626",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "20px",
          fontSize: "14px"
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: "#dcfce7",
          border: "1px solid #bbf7d0",
          color: "#16a34a",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "20px",
          fontSize: "14px"
        }}>
          ✅ {success}
        </div>
      )}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
        gap: "30px",
        marginBottom: "30px"
      }}>
        {/* Add Absence Form */}
        <div style={{
          backgroundColor: "var(--card-background)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ 
            color: "var(--text-primary)", 
            marginBottom: "20px",
            fontSize: "20px",
            fontWeight: "600"
          }}>
            Mark Absence Day
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                color: "var(--text-primary)",
                marginBottom: "8px",
                fontWeight: "500",
                fontSize: "14px"
              }}>
                Select Date *
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getMinDate()}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  backgroundColor: "var(--input-background)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--primary-color)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border-color)"}
              />
            </div>

            {!selectedDate && (
              <div style={{
                backgroundColor: "var(--background-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                padding: "8px 12px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>📅</span>
                <span>Please select a date to enable the button</span>
              </div>
            )}

            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                color: "var(--text-primary)",
                marginBottom: "8px",
                fontWeight: "500",
                fontSize: "14px"
              }}>
                Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Personal leave, Conference, Training..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  backgroundColor: "var(--input-background)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--primary-color)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border-color)"}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedDate}
              style={{
                width: "100%",
                padding: "12px 20px",
                backgroundColor: submitting || !selectedDate ? "var(--border-color)" : "var(--primary-color)",
                color: submitting || !selectedDate ? "var(--text-secondary)" : "white",
                border: submitting || !selectedDate ? "1px solid var(--border-color)" : "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: submitting || !selectedDate ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: submitting || !selectedDate ? 0.8 : 1,
                boxShadow: submitting || !selectedDate ? "none" : "0 2px 4px rgba(0,0,0,0.1)"
              }}
              onMouseEnter={(e) => {
                if (!submitting && selectedDate) {
                  e.target.style.backgroundColor = "var(--primary-color-dark, #0056b3)";
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting && selectedDate) {
                  e.target.style.backgroundColor = "var(--primary-color)";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                }
              }}
            >
              {submitting ? "Marking..." : !selectedDate ? "Select a date first" : "Mark Absence Day"}
            </button>
          </form>
        </div>

        {/* Working Hours Info */}
        <div style={{
          backgroundColor: "var(--card-background)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ 
            color: "var(--text-primary)", 
            marginBottom: "20px",
            fontSize: "20px",
            fontWeight: "600"
          }}>
            🕒 Working Hours (Kenya Standards)
          </h2>
          
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ 
              color: "var(--text-primary)", 
              fontSize: "16px",
              fontWeight: "500",
              marginBottom: "8px"
            }}>
              Regular Hours
            </h3>
            <p style={{ 
              color: "var(--text-secondary)", 
              fontSize: "14px",
              marginBottom: "4px"
            }}>
              📅 <strong>Monday - Friday:</strong> 8:00 AM - 5:00 PM
            </p>
            <p style={{ 
              color: "var(--text-secondary)", 
              fontSize: "14px",
              marginBottom: "4px"
            }}>
              🚫 <strong>Weekends:</strong> No appointments
            </p>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ 
              color: "var(--text-primary)", 
              fontSize: "16px",
              fontWeight: "500",
              marginBottom: "8px"
            }}>
              Break Times
            </h3>
            <p style={{ 
              color: "var(--text-secondary)", 
              fontSize: "14px",
              marginBottom: "4px"
            }}>
              🍽️ <strong>Lunch Break:</strong> 12:00 PM - 1:00 PM (1 hour)
            </p>
          </div>

          <div style={{
            backgroundColor: "var(--background-secondary)",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)"
          }}>
            <p style={{ 
              color: "var(--text-primary)", 
              fontSize: "13px",
              fontWeight: "500",
              margin: "0"
            }}>
              ⚠️ Clients cannot book appointments during break times or outside working hours.
            </p>
          </div>
        </div>
      </div>

      {/* Absence Days List */}
      <div style={{
        backgroundColor: "var(--card-background)",
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ 
          color: "var(--text-primary)", 
          marginBottom: "20px",
          fontSize: "20px",
          fontWeight: "600"
        }}>
          Your Absence Days ({absenceDays.length})
        </h2>

        {absenceDays.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--text-secondary)"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📅</div>
            <p style={{ fontSize: "16px", margin: "0" }}>
              No absence days marked yet
            </p>
            <p style={{ fontSize: "14px", margin: "8px 0 0 0" }}>
              Mark days when you'll be unavailable for appointments
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {absenceDays.map((day) => (
              <div
                key={day.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px",
                  backgroundColor: "var(--background-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  transition: "background-color 0.2s"
                }}
              >
                <div>
                  <div style={{
                    color: "var(--text-primary)",
                    fontWeight: "500",
                    fontSize: "16px",
                    marginBottom: "4px"
                  }}>
                    {formatDate(day.date)}
                  </div>
                  {day.reason && (
                    <div style={{
                      color: "var(--text-secondary)",
                      fontSize: "14px"
                    }}>
                      {day.reason}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(day.id)}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "background-color 0.2s"
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = "#fecaca"}
                  onMouseOut={(e) => e.target.style.backgroundColor = "#fee2e2"}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Absence;
