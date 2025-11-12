import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../utils/api";

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get(`/api/books/store/books/${id}`);
        setBook(data || null);
      } catch (e) {
        console.error("Store: failed to load book", e);
        setError("Failed to load book");
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  if (loading) return <div style={{ padding: "2rem" }}><p>Loading...</p></div>;
  if (error) return <div style={{ padding: "2rem" }}><p style={{ color: "var(--alert-danger-text)" }}>{error}</p></div>;
  if (!book) return null;

  const formatLabel = (() => {
    if (book.format) {
      return book.format.toLowerCase() === "hard" ? "📦 Hard copy" : "💾 Soft copy";
    }
    if (book.file_url) return "💾 Soft copy";
    return "📦 Hard copy";
  })();

  const price = (cents) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(
      Math.max(0, Number(cents || 0) / 100)
    );

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Navigation Header */}
      <nav style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
        <Link to="/store" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
        <Link to="/account/orders" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Orders</Link>
        <Link to="/account/library" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Library</Link>
        <Link to="/account/wishlist" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Wishlist</Link>
        <Link to="/account/profile" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Profile</Link>
      </nav>
      <Link to="/store" style={{ color: "var(--btn-primary)", textDecoration: "none" }}>← Back to books</Link>
      <div style={{ display: "flex", gap: 24, marginTop: 16, alignItems: "flex-start" }}>
        <div style={{ border: "1px solid var(--border-color)", borderRadius: 10, overflow: "hidden", background: "#f5f7fb", flexShrink: 0 }}>
          {book.cover_image_url ? (
            <img src={book.cover_image_url} alt={book.title} style={{ display: "block", width: "auto", height: "auto" }} />
          ) : (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No cover</div>
          )}
        </div>
        <div>
          <h1 style={{ margin: "0 0 6px 0", color: "var(--text-primary)" }}>{book.title}</h1>
          <div style={{ color: "var(--text-secondary)", marginBottom: 8, fontSize: 16 }}>
            by <strong>{book.author || "Unknown author"}</strong>
            {book.counselor_name && (
              <span style={{ color: "var(--text-muted)", fontSize: 14, display: "block", marginTop: 4 }}>
                Published by {book.counselor_name}
              </span>
            )}
          </div>
          <div style={{ color: "var(--btn-success)", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
            {price(book.price_cents)}
          </div>
          <div style={{ marginBottom: 12, color: "var(--text-secondary)", fontSize: 14 }}>
            {book.chapter_count && <span>📖 {book.chapter_count} chapters</span>}
            {book.chapter_count && book.page_count && <span> • </span>}
            {book.page_count && <span>📄 {book.page_count} pages</span>}
            {(book.chapter_count || book.page_count) && " • "}
            <span>{formatLabel}</span>
          </div>
          <div style={{ marginBottom: 16, padding: "12px", background: "var(--bg-secondary)", borderRadius: 8 }}>
            <h3 style={{ color: "var(--text-primary)", margin: "0 0 8px 0", fontSize: 16, fontWeight: 600 }}>Description</h3>
            <p style={{ color: "var(--text-primary)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
              {book.description && book.description.trim().length > 0
                ? book.description
                : "No description available."}
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button
              onClick={() => navigate(`/store/books/${book.id}/checkout`)}
              style={{ background: "var(--btn-primary)", color: "#fff", border: "none", padding: "0.75rem 1rem", borderRadius: 6 }}
            >
              Buy this book
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


