import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../utils/AuthContext";
import { fetchWithAuth } from "../utils/api";

const Notifications = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("reviews");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineCounselors, setOnlineCounselors] = useState([]);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth("/api/dashboard/reviews");
      setReviews(data || []);
    } catch (error) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: Date.now(),
        sender: user?.name || "You",
        text: message.trim(),
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages([...messages, newMessage]);
      setMessage("");
    }
  };

  const getRatingStars = (rating) => {
    return "⭐".repeat(rating) + "☆".repeat(5 - rating);
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return "#10B981"; // Green
    if (rating >= 3) return "#F59E0B"; // Yellow
    return "#EF4444"; // Red
  };

  const getQualityColor = (quality) => {
    const colors = {
      excellent: "#10B981",
      good: "#3B82F6",
      average: "#F59E0B",
      poor: "#EF4444"
    };
    return colors[quality] || "#6B7280";
  };

  const tabs = [
    { id: "reviews", label: "📝 Reviews", icon: "⭐" },
    { id: "chat", label: "💬 Counselor Chat", icon: "💬" }
  ];

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ 
          color: "var(--text-primary)", 
          marginBottom: "10px",
          fontSize: "28px",
          fontWeight: "600"
        }}>
          🔔 Notifications
        </h1>
        <p style={{ 
          color: "var(--text-secondary)", 
          fontSize: "16px",
          marginBottom: "20px"
        }}>
          View your reviews and communicate with other counselors.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "24px",
        borderBottom: "2px solid var(--border-color)"
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 24px",
              backgroundColor: activeTab === tab.id ? "var(--accent-color)" : "transparent",
              color: activeTab === tab.id ? "white" : "var(--text-secondary)",
              border: "none",
              borderRadius: "8px 8px 0 0",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        <div>
          {loading ? (
            <div style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--text-secondary)"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>⏳</div>
              <p>Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "60px 20px",
              backgroundColor: "var(--card-background)",
              borderRadius: "12px",
              border: "1px solid var(--border-color)"
            }}>
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>📝</div>
              <h2 style={{ 
                color: "var(--text-primary)", 
                fontSize: "24px",
                fontWeight: "600",
                marginBottom: "12px"
              }}>
                No Reviews Yet
              </h2>
              <p style={{ 
                color: "var(--text-secondary)", 
                fontSize: "16px"
              }}>
                You haven't received any reviews yet. Complete sessions to get feedback from clients.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "20px" }}>
              {reviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    backgroundColor: "var(--card-background)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    padding: "24px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                  }}
                >
                  {/* Review Header */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "16px"
                  }}>
                    <div>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "8px"
                      }}>
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          backgroundColor: "var(--accent-color)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: "600"
                        }}>
                          {review.client_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <h3 style={{
                            margin: 0,
                            color: "var(--text-primary)",
                            fontSize: "16px",
                            fontWeight: "600"
                          }}>
                            {review.client_name || "Anonymous Client"}
                          </h3>
                          <p style={{
                            margin: "4px 0 0 0",
                            color: "var(--text-secondary)",
                            fontSize: "12px"
                          }}>
                            {review.client_contact}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: "6px 12px",
                      backgroundColor: getQualityColor(review.session_quality),
                      color: "white",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      textTransform: "capitalize"
                    }}>
                      {review.session_quality || "N/A"}
                    </div>
                  </div>

                  {/* Rating */}
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px"
                    }}>
                      <span style={{
                        fontSize: "18px",
                        color: getRatingColor(review.rating),
                        fontWeight: "600"
                      }}>
                        {getRatingStars(review.rating)}
                      </span>
                      <span style={{
                        color: getRatingColor(review.rating),
                        fontWeight: "600"
                      }}>
                        {review.rating}/5
                      </span>
                    </div>
                  </div>

                  {/* Review Text */}
                  {review.review_text && (
                    <div style={{
                      backgroundColor: "var(--input-background)",
                      padding: "16px",
                      borderRadius: "8px",
                      marginBottom: "12px"
                    }}>
                      <p style={{
                        margin: 0,
                        color: "var(--text-primary)",
                        lineHeight: "1.6"
                      }}>
                        "{review.review_text}"
                      </p>
                    </div>
                  )}

                  {/* Additional Feedback */}
                  {review.additional_feedback && (
                    <div style={{ marginBottom: "12px" }}>
                      <p style={{
                        color: "var(--text-secondary)",
                        fontSize: "12px",
                        margin: "0 0 4px 0"
                      }}>
                        📝 Additional Feedback:
                      </p>
                      <p style={{
                        color: "var(--text-primary)",
                        fontSize: "14px",
                        margin: 0
                      }}>
                        {review.additional_feedback}
                      </p>
                    </div>
                  )}

                  {/* Recommendation */}
                  {review.would_recommend !== null && (
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      backgroundColor: review.would_recommend ? "#10B981" : "#EF4444",
                      color: "white",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}>
                      {review.would_recommend ? "✓ Would Recommend" : "✗ Would Not Recommend"}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{
                    marginTop: "16px",
                    paddingTop: "16px",
                    borderTop: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{
                      color: "var(--text-secondary)",
                      fontSize: "12px"
                    }}>
                      📅 {new Date(review.created_at).toLocaleDateString()} at {new Date(review.created_at).toLocaleTimeString()}
                    </span>
                    {review.appointment_date && (
                      <span style={{
                        color: "var(--text-secondary)",
                        fontSize: "12px"
                      }}>
                        Session: {new Date(review.appointment_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px" }}>
          {/* Online Counselors Sidebar */}
          <div style={{
            backgroundColor: "var(--card-background)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "20px",
            height: "600px",
            overflowY: "auto"
          }}>
            <h3 style={{
              color: "var(--text-primary)",
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "16px"
            }}>
              💼 Online Counselors
            </h3>
            
            {onlineCounselors.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-secondary)"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
                <p style={{
                  margin: "0 0 8px 0",
                  color: "var(--text-primary)",
                  fontSize: "16px",
                  fontWeight: "600"
                }}>
                  No Other Counselors Online
                </p>
                <p style={{
                  margin: 0,
                  fontSize: "14px"
                }}>
                  When other counselors are available, they'll appear here for collaboration.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {onlineCounselors.map((counselor) => (
                <div
                  key={counselor.id}
                  style={{
                    padding: "12px",
                    backgroundColor: "var(--input-background)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    border: "2px solid transparent"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                    e.currentTarget.style.borderColor = "var(--accent-color)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--input-background)";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: counselor.status === "available" ? "#10B981" :
                                     counselor.status === "busy" ? "#F59E0B" : "#6B7280",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "600",
                      position: "relative"
                    }}>
                      {counselor.name.split(" ").map(n => n[0]).join("")}
                      <div style={{
                        position: "absolute",
                        bottom: "0",
                        right: "0",
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: counselor.status === "available" ? "#10B981" :
                                       counselor.status === "busy" ? "#F59E0B" : "#6B7280",
                        border: "2px solid white"
                      }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: 0,
                        color: "var(--text-primary)",
                        fontSize: "14px",
                        fontWeight: "600"
                      }}>
                        {counselor.name}
                      </p>
                      <p style={{
                        margin: "4px 0 0 0",
                        color: "var(--text-secondary)",
                        fontSize: "12px"
                      }}>
                        {counselor.status.charAt(0).toUpperCase() + counselor.status.slice(1)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Chat Area */}
          <div style={{
            backgroundColor: "var(--card-background)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            height: "600px",
            overflow: "hidden"
          }}>
            {/* Chat Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "600"
                }}>
                  CS
                </div>
                <div>
                  <p style={{
                    margin: 0,
                    color: "var(--text-primary)",
                    fontSize: "16px",
                    fontWeight: "600"
                  }}>
                    Counselor Chat
                  </p>
                  <p style={{
                    margin: "4px 0 0 0",
                    color: "var(--text-secondary)",
                    fontSize: "12px"
                  }}>
                    {onlineCounselors.length === 0 
                      ? "No other counselors online" 
                      : `Communicating with ${onlineCounselors.filter(c => c.status === "available").length} counselor${onlineCounselors.filter(c => c.status === "available").length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              padding: "20px",
              overflowY: "auto",
              backgroundColor: "var(--bg-secondary)"
            }}>
              {messages.length === 0 ? (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "var(--text-secondary)"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                    {onlineCounselors.length === 0 ? "👥" : "💬"}
                  </div>
                  <p style={{ margin: 0 }}>
                    {onlineCounselors.length === 0 ? "No other counselors online" : "No messages yet"}
                  </p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px" }}>
                    {onlineCounselors.length === 0 
                      ? "When other counselors join, you can collaborate here" 
                      : "Start a conversation with your colleagues"}
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        flexDirection: msg.sender === "You" ? "row-reverse" : "row",
                        gap: "8px"
                      }}
                    >
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: msg.sender === "You" ? "var(--accent-color)" : "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "600",
                        fontSize: "12px",
                        flexShrink: 0
                      }}>
                        {msg.sender[0]}
                      </div>
                      <div style={{
                        maxWidth: "70%",
                        backgroundColor: msg.sender === "You" ? "var(--accent-color)" : "var(--card-background)",
                        color: msg.sender === "You" ? "white" : "var(--text-primary)",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: "1px solid var(--border-color)"
                      }}>
                        <p style={{
                          margin: "0 0 4px 0",
                          fontWeight: "600",
                          fontSize: "12px"
                        }}>
                          {msg.sender}
                        </p>
                        <p style={{ margin: 0, fontSize: "14px" }}>
                          {msg.text}
                        </p>
                        <p style={{
                          margin: "4px 0 0 0",
                          fontSize: "11px",
                          opacity: 0.7
                        }}>
                          {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              gap: "12px"
            }}>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && onlineCounselors.length > 0 && sendMessage()}
                placeholder={onlineCounselors.length === 0 ? "No counselors available..." : "Type a message..."}
                disabled={onlineCounselors.length === 0}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "24px",
                  backgroundColor: "var(--input-background)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                  opacity: onlineCounselors.length === 0 ? 0.5 : 1,
                  cursor: onlineCounselors.length === 0 ? "not-allowed" : "text"
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim() || onlineCounselors.length === 0}
                style={{
                  padding: "12px 24px",
                  backgroundColor: message.trim() && onlineCounselors.length > 0 ? "var(--btn-primary)" : "var(--btn-secondary)",
                  color: "white",
                  border: "none",
                  borderRadius: "24px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: message.trim() && onlineCounselors.length > 0 ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                  opacity: onlineCounselors.length === 0 ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (message.trim() && onlineCounselors.length > 0 && !e.target.disabled) {
                    e.target.style.backgroundColor = "var(--btn-primary-hover)";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = message.trim() && onlineCounselors.length > 0 ? "var(--btn-primary)" : "var(--btn-secondary)";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;