import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";

export default function Wishlist() {
  const [email, setEmail] = useState("");
  const [bookId, setBookId] = useState("");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    // Auto-load email from localStorage
    const storedEmail = localStorage.getItem("store_user_email");
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  const add = async () => {
    try {
      setMessage(null);
      if (!email || !bookId) {
        setMessage("Email and Book ID are required");
        return;
      }
      await api.post(`/api/books/store/wishlist/${encodeURIComponent(bookId)}`, { email });
      setMessage("Added to wishlist");
    } catch (e) {
      console.error("Wishlist add: failed", e);
      setMessage("Failed to add");
    }
  };

  const remove = async () => {
    try {
      setMessage(null);
      if (!email || !bookId) {
        setMessage("Email and Book ID are required");
        return;
      }
      // Simple fetch for DELETE with body (api.delete enforces auth)
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/books/store/wishlist/${encodeURIComponent(bookId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      setMessage("Removed from wishlist");
    } catch (e) {
      console.error("Wishlist remove: failed", e);
      setMessage("Failed to remove");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 700, margin: "0 auto" }}>
      {/* Navigation Header */}
      <nav style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
        <Link to="/store" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
        <Link to="/account/orders" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Orders</Link>
        <Link to="/account/library" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Library</Link>
        <Link to="/account/wishlist" style={{ color: "var(--btn-primary)", textDecoration: "none", fontWeight: 600 }}>Wishlist</Link>
        <Link to="/account/profile" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Profile</Link>
      </nav>
      <h1 style={{ color: "var(--text-primary)", marginBottom: 12 }}>Wishlist</h1>
      {email && (
        <div style={{ color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
          Managing wishlist for: <strong>{email}</strong>
        </div>
      )}
      <div style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Book ID"
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          style={{ padding: "0.75rem", border: "1px solid var(--input-border)", borderRadius: 6 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={add} style={{ background: "var(--btn-primary)", color: "#fff", border: "none", padding: "0.75rem 1rem", borderRadius: 6 }}>
            Add
          </button>
          <button onClick={remove} style={{ background: "var(--btn-danger)", color: "#fff", border: "none", padding: "0.75rem 1rem", borderRadius: 6 }}>
            Remove
          </button>
        </div>
        {message && <div style={{ color: "var(--text-secondary)" }}>{message}</div>}
      </div>
    </div>
  );
}


