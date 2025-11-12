import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";

export default function MyOrders() {
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      setOrders([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.get(`/api/books/store/my-orders?email=${encodeURIComponent(emailToUse)}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("MyOrders: failed", e);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const price = (cents) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(
      Math.max(0, Number(cents || 0) / 100)
    );

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Navigation Header */}
      <nav style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
        <Link to="/store" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
        <Link to="/account/orders" style={{ color: "var(--btn-primary)", textDecoration: "none", fontWeight: 600 }}>My Orders</Link>
        <Link to="/account/library" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Library</Link>
        <Link to="/account/wishlist" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Wishlist</Link>
        <Link to="/account/profile" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Profile</Link>
      </nav>
      <h1 style={{ color: "var(--text-primary)", marginBottom: 12 }}>My Orders</h1>
      {email && (
        <div style={{ color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
          Showing orders for: <strong>{email}</strong>
        </div>
      )}
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "var(--alert-danger-text)" }}>{error}</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {orders.map((o) => (
          <div key={o.id} style={{ border: "1px solid var(--border-color)", borderRadius: 10, padding: 12, background: "var(--card-bg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{o.book_title}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>{o.book_author}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6 }}>
                  Status: {o.order_status} • Payment: {o.payment_status || "pending"}
                </div>
              </div>
              <div style={{ color: "var(--btn-success)", fontWeight: 700 }}>{price(o.total_amount_cents)}</div>
            </div>
            {o.tracking_number && (
              <div style={{ marginTop: 6, color: "var(--text-secondary)" }}>
                📦 Tracking: {o.tracking_number} {o.shipping_company ? `(${o.shipping_company})` : ""}
              </div>
            )}
          </div>
        ))}
        {!loading && orders.length === 0 && email && <div style={{ color: "var(--text-secondary)" }}>No orders found.</div>}
      </div>
    </div>
  );
}


