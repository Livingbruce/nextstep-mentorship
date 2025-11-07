import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../utils/AuthContext";
import api, { fetchWithAuth } from "../utils/api";

// Add CSS to fix dropdown option colors
const dropdownStyle = `
  select {
    background-color: var(--card-bg);
    color: var(--text-primary);
  }
  select option {
    background-color: var(--card-bg);
    color: var(--text-primary);
  }
  select option:checked,
  select option:hover {
    background-color: var(--btn-primary);
    color: #ffffff;
  }
`;

const SupportTickets = () => {
  const { handleAuthError } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  useEffect(() => {
    loadTickets();
  }, [page, filterStatus, filterPriority]);

  async function loadTickets() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (filterStatus) params.append("status", filterStatus);
      if (filterPriority) params.append("priority", filterPriority);
      
      const response = await api.get(`/api/dashboard/support/tickets?${params}`);
      
      if (response && response.success) {
        setTickets(response.tickets || []);
        setTotalPages(response.pagination?.totalPages || 1);
      } else if (Array.isArray(response)) {
        setTickets(response);
        setTotalPages(1);
      } else if (response && response.tickets) {
        setTickets(response.tickets || []);
        setTotalPages(response.pagination?.totalPages || 1);
      } else {
        setTickets([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error loading support tickets:", err);
      setError("Failed to load support tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  async function sendReply(ticketId) {
    if (!replyText.trim()) {
      alert("Please enter a reply message");
      return;
    }

    try {
      setReplying(true);
      await api.post(`/api/dashboard/support/tickets/${ticketId}/reply`, {
        message: replyText.trim(),
        is_internal: false
      });
      
      setReplyText("");
      setSelectedTicket(null);
      await loadTickets();
      alert("Reply sent successfully!");
    } catch (err) {
      console.error("Error sending reply:", err);
      alert("Failed to send reply");
    } finally {
      setReplying(false);
    }
  }

  async function updateTicketStatus(ticketId, status) {
    try {
      await api.patch(`/api/dashboard/support/tickets/${ticketId}/status`, { status });
      setSelectedTicket(null);
      await loadTickets();
      alert("Ticket status updated!");
    } catch (err) {
      console.error("Error updating ticket status:", err);
      alert("Failed to update ticket status");
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'replied': return '#8b5cf6';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div>Loading support tickets...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <style>{dropdownStyle}</style>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ 
          color: "var(--text-primary)", 
          marginBottom: "10px",
          fontSize: "28px",
          fontWeight: "600"
        }}>
          🎫 Support Tickets
        </h1>
        <p style={{ 
          color: "var(--text-secondary)", 
          fontSize: "16px",
          marginBottom: "20px"
        }}>
          Manage and respond to support requests from students and clients.
        </p>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: "var(--card-background)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "15px",
        marginBottom: "20px",
        display: "flex",
        gap: "15px",
        flexWrap: "wrap"
      }}>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            backgroundColor: "var(--card-background)",
            color: "var(--text-primary)",
            cursor: "pointer",
            appearance: "none",
            backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
            backgroundSize: "16px",
            paddingRight: "32px"
          }}
        >
          <option value="" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>All Statuses</option>
          <option value="open" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>Open</option>
          <option value="in_progress" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>In Progress</option>
          <option value="replied" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>Replied</option>
          <option value="resolved" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>Resolved</option>
          <option value="closed" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>Closed</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => {
            setFilterPriority(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            backgroundColor: "var(--card-background)",
            color: "var(--text-primary)",
            cursor: "pointer",
            appearance: "none",
            backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
            backgroundSize: "16px",
            paddingRight: "32px"
          }}
        >
          <option value="" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>All Priorities</option>
          <option value="urgent" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>Urgent</option>
          <option value="high" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>High</option>
          <option value="medium" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>Medium</option>
          <option value="low" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>Low</option>
        </select>

        <button
          onClick={() => {
            setFilterStatus("");
            setFilterPriority("");
            setPage(1);
          }}
          style={{
            padding: "8px 16px",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            backgroundColor: "var(--card-background)",
            color: "var(--text-primary)",
            cursor: "pointer"
          }}
        >
          Clear Filters
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: "#fee2e2",
          border: "1px solid #fca5a5",
          borderRadius: "8px",
          padding: "15px",
          marginBottom: "20px",
          color: "#991b1b"
        }}>
          {error}
        </div>
      )}

      {tickets.length === 0 ? (
        <div style={{
          backgroundColor: "var(--card-background)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>🎫</div>
          <h2 style={{ 
            color: "var(--text-primary)",
            fontSize: "24px",
            fontWeight: "600",
            marginBottom: "12px"
          }}>
            No Support Tickets
          </h2>
          <p style={{ color: "var(--text-secondary)" }}>
            No support tickets found. Check back later for new tickets.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: "15px", marginBottom: "20px" }}>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  backgroundColor: "var(--card-background)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "20px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onClick={() => setSelectedTicket(ticket)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      color: "var(--text-primary)",
                      fontSize: "18px",
                      fontWeight: "600",
                      marginBottom: "8px"
                    }}>
                      {ticket.subject || "No Subject"}
                    </h3>
                    <p style={{ 
                      color: "var(--text-secondary)",
                      fontSize: "14px",
                      marginBottom: "10px",
                      whiteSpace: "pre-wrap"
                    }}>
                      {ticket.description?.substring(0, 150)}{ticket.description?.length > 150 ? "..." : ""}
                    </p>
                    <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", fontSize: "13px" }}>
                      {ticket.category && (
                        <span style={{ color: "var(--text-secondary)" }}>
                          📁 Category: <strong>{ticket.category}</strong>
                        </span>
                      )}
                      <span style={{ color: "var(--text-secondary)" }}>
                        👤 From: {ticket.student_name || ticket.telegram_username || "Unknown"}
                      </span>
                      {ticket.admission_no && (
                        <span style={{ color: "var(--text-secondary)" }}>
                          🎓 Admission: {ticket.admission_no}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      backgroundColor: getStatusColor(ticket.status) + "20",
                      color: getStatusColor(ticket.status)
                    }}>
                      {ticket.status?.toUpperCase() || "OPEN"}
                    </span>
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      backgroundColor: getPriorityColor(ticket.priority) + "20",
                      color: getPriorityColor(ticket.priority)
                    }}>
                      {ticket.priority?.toUpperCase() || "MEDIUM"}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{
                  padding: "8px 16px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  backgroundColor: page === 1 ? "var(--card-background)" : "var(--button-primary)",
                  color: page === 1 ? "var(--text-secondary)" : "white",
                  cursor: page === 1 ? "not-allowed" : "pointer"
                }}
              >
                Previous
              </button>
              <span style={{ 
                padding: "8px 16px",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center"
              }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                style={{
                  padding: "8px 16px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  backgroundColor: page === totalPages ? "var(--card-background)" : "var(--button-primary)",
                  color: page === totalPages ? "var(--text-secondary)" : "white",
                  cursor: page === totalPages ? "not-allowed" : "pointer"
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}
        onClick={() => setSelectedTicket(null)}
        >
          <div
            style={{
              backgroundColor: "var(--card-background)",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflow: "auto",
              width: "100%"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "20px" }}>
              <h2 style={{ 
                color: "var(--text-primary)",
                fontSize: "24px",
                fontWeight: "600",
                marginBottom: "10px"
              }}>
                {selectedTicket.subject || "Support Ticket"}
              </h2>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "var(--text-secondary)"
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "15px", marginBottom: "15px", flexWrap: "wrap" }}>
                <span style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  backgroundColor: getStatusColor(selectedTicket.status) + "20",
                  color: getStatusColor(selectedTicket.status)
                }}>
                  Status: {selectedTicket.status?.toUpperCase() || "OPEN"}
                </span>
                <span style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  backgroundColor: getPriorityColor(selectedTicket.priority) + "20",
                  color: getPriorityColor(selectedTicket.priority)
                }}>
                  Priority: {selectedTicket.priority?.toUpperCase() || "MEDIUM"}
                </span>
                {selectedTicket.category && (
                  <span style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    backgroundColor: "#3b82f620",
                    color: "#3b82f6"
                  }}>
                    Category: {selectedTicket.category}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: "15px", fontSize: "14px", color: "var(--text-secondary)" }}>
                <div><strong>From:</strong> {selectedTicket.student_name || selectedTicket.telegram_username || "Unknown"}</div>
                {selectedTicket.admission_no && (
                  <div><strong>Admission:</strong> {selectedTicket.admission_no}</div>
                )}
                <div><strong>Created:</strong> {new Date(selectedTicket.created_at).toLocaleString()}</div>
              </div>

              <div style={{
                backgroundColor: "var(--background)",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px"
              }}>
                <h3 style={{ 
                  color: "var(--text-primary)",
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "10px"
                }}>
                  Description:
                </h3>
                <p style={{ 
                  color: "var(--text-primary)",
                  whiteSpace: "pre-wrap"
                }}>
                  {selectedTicket.description}
                </p>
              </div>

              {/* Replies */}
              {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ 
                    color: "var(--text-primary)",
                    fontSize: "16px",
                    fontWeight: "600",
                    marginBottom: "15px"
                  }}>
                    Conversation:
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedTicket.replies.map((reply, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          backgroundColor: reply.sender_type === "counselor" ? "#3b82f620" : "#f3f4f6",
                          borderLeft: "3px solid",
                          borderLeftColor: reply.sender_type === "counselor" ? "#3b82f6" : "#6b7280"
                        }}
                      >
                        <div style={{ 
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "var(--text-secondary)",
                          marginBottom: "5px"
                        }}>
                          {reply.sender_type === "counselor" ? reply.counselor_name || "Counselor" : "Student"} • {new Date(reply.created_at).toLocaleString()}
                        </div>
                        <div style={{ color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                          {reply.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reply Form */}
            <div style={{ marginBottom: "20px" }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  backgroundColor: "var(--card-background)",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  resize: "vertical"
                }}
              />
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  onClick={() => sendReply(selectedTicket.id)}
                  disabled={replying || !replyText.trim()}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: replying || !replyText.trim() ? "var(--card-background)" : "var(--button-primary)",
                    color: replying || !replyText.trim() ? "var(--text-secondary)" : "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: replying || !replyText.trim() ? "not-allowed" : "pointer",
                    fontWeight: "600"
                  }}
                >
                  {replying ? "Sending..." : "Send Reply"}
                </button>
                
                {/* Status Actions */}
                <select
                  value={selectedTicket.status}
                  onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                  style={{
                    padding: "10px 12px",
                    paddingRight: "32px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    backgroundColor: "var(--card-background)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    appearance: "none",
                    backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center",
                    backgroundSize: "16px"
                  }}
                >
                  <option value="open" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>Open</option>
                  <option value="in_progress" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>In Progress</option>
                  <option value="replied" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>Replied</option>
                  <option value="resolved" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>Resolved</option>
                  <option value="closed" style={{ backgroundColor: "var(--card-background)", color: "var(--text-primary)" }}>Closed</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;
