import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import { API_BASE_URL } from "../../utils/apiConfig";

export default function MyLibrary() {
  const [email, setEmail] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sendingEmail, setSendingEmail] = useState({});

  useEffect(() => {
    // Auto-load email from localStorage
    const storedEmail = localStorage.getItem("store_user_email");
    if (storedEmail) {
      setEmail(storedEmail);
      load(storedEmail);
    }
  }, []);

  const load = async (userEmail) => {
    const emailToUse = userEmail || email;
    if (!emailToUse) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.get(`/api/books/store/my-library?email=${encodeURIComponent(emailToUse)}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("MyLibrary: failed", e);
      setError("Failed to load library");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Navigation Header */}
      <nav style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
        <Link to="/store" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
        <Link to="/account/orders" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Orders</Link>
        <Link to="/account/library" style={{ color: "var(--btn-primary)", textDecoration: "none", fontWeight: 600 }}>My Library</Link>
        <Link to="/account/wishlist" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Wishlist</Link>
        <Link to="/account/profile" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Profile</Link>
      </nav>
      <h1 style={{ color: "var(--text-primary)", marginBottom: 12 }}>My Library</h1>
      {email && (
        <div style={{ color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
          Showing library for: <strong>{email}</strong>
        </div>
      )}
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "var(--alert-danger-text)" }}>{error}</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((it) => {
          const bookId = it.book_id || it.id;
          const viewUrl = `${API_BASE_URL}/api/books/view/${bookId}`;
          const downloadUrl = it.download_url || it.file_url || (it.file_url?.includes('/api/books/files/') ? `${API_BASE_URL}${it.file_url}` : it.file_url);
          
          const handleSendEmail = async () => {
            if (!email) {
              setError("Email is required");
              return;
            }
            try {
              setSendingEmail({ ...sendingEmail, [bookId]: true });
              await api.post(`/api/books/send-email/${bookId}`, { email });
              alert("Book sent to your email successfully!");
            } catch (err) {
              console.error("Error sending email:", err);
              setError("Failed to send book to email");
            } finally {
              setSendingEmail({ ...sendingEmail, [bookId]: false });
            }
          };
          
          return (
            <div key={it.id} style={{ border: "1px solid var(--border-color)", borderRadius: 10, padding: 16, background: "var(--card-bg)" }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 18, marginBottom: 4 }}>{it.title}</div>
                {it.author && <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>By {it.author}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {downloadUrl && (
                  <a href={viewUrl} target="_blank" rel="noreferrer"
                     style={{ background: "var(--btn-secondary)", color: "var(--text-primary)", padding: "0.5rem 1rem", borderRadius: 6, textDecoration: "none", fontSize: 14 }}>
                    📖 View
                  </a>
                )}
                {downloadUrl && (
                  <a href={downloadUrl} download
                     style={{ background: "var(--btn-primary)", color: "#fff", padding: "0.5rem 1rem", borderRadius: 6, textDecoration: "none", fontSize: 14 }}>
                    ⬇️ Download
                  </a>
                )}
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail[bookId] || !email}
                  style={{
                    background: sendingEmail[bookId] ? "var(--text-muted)" : "var(--btn-primary)",
                    color: "#fff",
                    padding: "0.5rem 1rem",
                    borderRadius: 6,
                    border: "none",
                    cursor: sendingEmail[bookId] || !email ? "not-allowed" : "pointer",
                    fontSize: 14
                  }}
                >
                  {sendingEmail[bookId] ? "Sending..." : "📧 Send to Email"}
                </button>
              </div>
            </div>
          );
        })}
        {!loading && items.length === 0 && email && <div style={{ color: "var(--text-secondary)" }}>No items found.</div>}
      </div>
    </div>
  );
}


