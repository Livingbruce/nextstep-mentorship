import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../utils/api";

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    client_address: "",
    client_city: "",
    client_country: "",
    client_county: "",
    client_postal_code: "",
    payment_method: "mpesa", // mpesa | bank
    payment_reference: ""
  });

  useEffect(() => {
    // Auto-fill email from localStorage
    const storedEmail = localStorage.getItem("store_user_email");
    if (storedEmail) {
      setForm(prev => ({ ...prev, client_email: storedEmail }));
      
      // Try to load profile data from orders
      const loadProfile = async () => {
        try {
          const orders = await api.get(`/api/books/store/my-orders?email=${encodeURIComponent(storedEmail)}`);
          if (orders && orders.length > 0) {
            const latestOrder = orders[0];
            setForm(prev => ({
              ...prev,
              client_name: latestOrder.client_name || prev.client_name,
              client_phone: latestOrder.client_phone || prev.client_phone,
              client_address: latestOrder.client_address || prev.client_address,
              client_city: latestOrder.client_city || prev.client_city,
              client_country: latestOrder.client_country || prev.client_country,
              client_county: latestOrder.client_county || prev.client_county,
              client_postal_code: latestOrder.client_postal_code || prev.client_postal_code,
            }));
          }
        } catch (e) {
          // Ignore errors, just use email
        }
      };
      loadProfile();
    }

    const fetchBook = async () => {
      try {
        setLoading(true);
        const data = await api.get(`/api/books/store/books/${id}`);
        setBook(data || null);
      } catch (e) {
        console.error("Checkout: failed to load book", e);
        setError("Failed to load book");
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const result = await api.post(`/api/books/store/books/${id}/purchase`, form);
      if (result?.success) {
        navigate("/store/thanks", { state: { order: { ...result.order, book_title: book?.title, format: book?.format || result.order?.format } } });
      } else {
        setError("Failed to create order");
      }
    } catch (e) {
      console.error("Checkout: failed", e);
      setError("Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const price = (cents) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(
      Math.max(0, Number(cents || 0) / 100)
    );

  if (loading && !book) return <div style={{ padding: "2rem" }}><p>Loading...</p></div>;
  if (error && !book) return <div style={{ padding: "2rem" }}><p style={{ color: "var(--alert-danger-text)" }}>{error}</p></div>;
  if (!book) return null;

  const requireShipping = book.format === "hard";

  return (
    <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
      {/* Navigation Header */}
      <nav style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
        <Link to="/store" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
        <Link to="/account/orders" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Orders</Link>
        <Link to="/account/library" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Library</Link>
        <Link to="/account/wishlist" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Wishlist</Link>
        <Link to="/account/profile" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Profile</Link>
      </nav>
      <h1 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>Checkout</h1>
      <div style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
        {book.title} • {price(book.price_cents)} • {book.format === "soft" ? "Soft copy" : "Hard copy"}
      </div>

      {error && <div style={{ color: "var(--alert-danger-text)", marginBottom: 12 }}>{error}</div>}

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input name="client_name" placeholder="Full name" value={form.client_name} onChange={onChange} required
            style={{ padding: "0.75rem", border: "1px solid var(--input-border)", borderRadius: 6 }} />
          <input name="client_email" type="email" placeholder="Email" value={form.client_email} onChange={onChange} required
            style={{ padding: "0.75rem", border: "1px solid var(--input-border)", borderRadius: 6 }} />
        </div>
        <input name="client_phone" placeholder="Phone number" value={form.client_phone} onChange={onChange} required
          style={{ padding: "0.75rem", border: "1px solid var(--input-border)", borderRadius: 6 }} />

        {requireShipping && (
          <>
            <input name="client_address" placeholder="Street address" value={form.client_address} onChange={onChange} required
              style={{ padding: "0.75rem", border: "1px solid var(--input-border)", borderRadius: 6 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input name="client_city" placeholder="City" value={form.client_city} onChange={onChange} required
                style={{ padding: "0.75rem", border: "1px solid var(--input-border)", borderRadius: 6 }} />
              <input name="client_country" placeholder="Country" value={form.client_country} onChange={onChange} required
                style={{ padding: "0.75rem", border: "1px solid var(--input-border)", borderRadius: 6 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input name="client_county" placeholder="County (optional)" value={form.client_county} onChange={onChange}
                style={{ padding: "0.75rem", border: "1px solid var(--input-border)", borderRadius: 6 }} />
              <input name="client_postal_code" placeholder="Postal code (optional)" value={form.client_postal_code} onChange={onChange}
                style={{ padding: "0.75rem", border: "1px solid var(--input-border)", borderRadius: 6 }} />
            </div>
          </>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <select name="payment_method" value={form.payment_method} onChange={onChange}
            style={{ padding: "0.75rem", border: "1px solid var(--input-border)", borderRadius: 6 }}>
            <option value="mpesa">M-Pesa</option>
            <option value="bank">Bank</option>
          </select>
          <input name="payment_reference" placeholder="Payment reference (optional)" value={form.payment_reference} onChange={onChange}
            style={{ padding: "0.75rem", border: "1px solid var(--input-border)", borderRadius: 6 }} />
        </div>

        <button type="submit" disabled={loading}
          style={{ background: "var(--btn-primary)", color: "#fff", border: "none", padding: "0.75rem 1rem", borderRadius: 6 }}>
          {loading ? "Processing..." : "Place Order"}
        </button>
      </form>
    </div>
  );
}


