import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function OrderThanks() {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order;

  useEffect(() => {
    if (!order) {
      navigate("/store", { replace: true });
    }
  }, [order, navigate]);

  if (!order) return null;

  return (
    <div style={{ padding: "2rem", maxWidth: 700, margin: "0 auto" }}>
      {/* Navigation Header */}
      <nav style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
        <Link to="/store" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
        <Link to="/account/orders" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Orders</Link>
        <Link to="/account/library" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Library</Link>
        <Link to="/account/wishlist" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Wishlist</Link>
        <Link to="/account/profile" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Profile</Link>
      </nav>

      <div style={{ textAlign: "center", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
        <h1 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>Order Received!</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          Thank you, {order.client_name || "friend"}! We have received your order for{" "}
          <strong>{order.book_title || "your book"}</strong>.
        </p>

        <div style={{ textAlign: "left", background: "var(--bg-secondary)", padding: "1.5rem", borderRadius: 8, marginBottom: "1.5rem" }}>
          <h3 style={{ color: "var(--text-primary)", margin: "0 0 0.75rem 0" }}>What's next?</h3>
          <ul style={{ color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: "1.25rem", margin: 0 }}>
            <li>You will receive a payment confirmation shortly after verification.</li>
            <li>{order.format === "hard" ? "We will ship the book to your address once payment is confirmed." : "You will unlock the digital copy in your library once payment is confirmed."}</li>
            <li>Track order status anytime from the <Link to="/account/orders" style={{ color: "var(--btn-primary)" }}>My Orders</Link> page.</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Link
            to="/store"
            style={{
              background: "var(--btn-primary)",
              color: "#fff",
              padding: "0.75rem 1.5rem",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 500
            }}
          >
            Continue shopping
          </Link>
          <Link
            to="/account/orders"
            style={{
              background: "var(--btn-secondary)",
              color: "var(--text-primary)",
              padding: "0.75rem 1.5rem",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 500
            }}
          >
            View my orders
          </Link>
        </div>
      </div>
    </div>
  );
}


