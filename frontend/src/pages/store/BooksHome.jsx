import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../utils/api";

export default function BooksHome() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [format, setFormat] = useState(searchParams.get("format") || "");

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        const qp = [];
        if (q) qp.push(`q=${encodeURIComponent(q)}`);
        if (format) qp.push(`format=${encodeURIComponent(format)}`);
        const url = `/api/books/store/books${qp.length ? "?" + qp.join("&") : ""}`;
        const data = await api.get(url);
        setBooks(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Store: failed to load books", e);
        setError("Failed to load books");
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [q, format]);

  const applyFilters = (e) => {
    e.preventDefault();
    const next = {};
    if (q) next.q = q;
    if (format) next.format = format;
    setSearchParams(next);
  };

  const price = (cents) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(
      Math.max(0, Number(cents || 0) / 100)
    );

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Navigation Header */}
      <nav style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <Link to="/store" style={{ color: "var(--btn-primary)", textDecoration: "none", fontWeight: 600 }}>Home</Link>
          <Link to="/account/orders" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Orders</Link>
          <Link to="/account/library" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Library</Link>
          <Link to="/account/wishlist" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Wishlist</Link>
          <Link to="/account/profile" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Profile</Link>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
          {localStorage.getItem("store_user_email") && (
            <span>Logged in as: <strong>{localStorage.getItem("store_user_email")}</strong></span>
          )}
        </div>
      </nav>

      <h1 style={{ color: "var(--text-primary)", marginBottom: "1rem" }}>Books</h1>

      <form onSubmit={applyFilters} style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title or author"
          style={{
            padding: "0.75rem",
            border: "1px solid var(--input-border)",
            borderRadius: 6,
            flex: 1,
          }}
        />
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          style={{ padding: "0.75rem", border: "1px solid var(--input-border)", borderRadius: 6 }}
        >
          <option value="">All formats</option>
          <option value="soft">Soft copy</option>
          <option value="hard">Hard copy</option>
        </select>
        <button
          type="submit"
          style={{ background: "var(--btn-primary)", color: "#fff", border: "none", padding: "0.75rem 1rem", borderRadius: 6 }}
        >
          Apply
        </button>
      </form>

      {loading && <p style={{ color: "var(--text-secondary)" }}>Loading...</p>}
      {error && <p style={{ color: "var(--alert-danger-text)" }}>{error}</p>}

      <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {books.map((b) => {
          const formatLabel = (() => {
            if (b.format) {
              return b.format.toLowerCase() === "hard" ? "📦 Hard copy" : "💾 Soft copy";
            }
            return "Format not specified";
          })();

          return (
            <Link
              key={b.id}
              to={`/store/books/${b.id}`}
              style={{
                textDecoration: "none",
                border: "1px solid var(--border-color)",
                borderRadius: 10,
                background: "var(--card-bg)",
                overflow: "hidden",
              }}
            >
              <div style={{ height: 160, background: "#f5f7fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {b.cover_image_url ? (
                  <img src={b.cover_image_url} alt={b.title} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>No cover</span>
                )}
              </div>
              <div style={{ padding: "12px" }}>
                <div style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: 6 }}>{b.title}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 4 }}>by {b.author || "Unknown"}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 6, lineHeight: 1.4, maxHeight: "3em", overflow: "hidden" }}>
                  {b.description && b.description.trim().length > 0 ? b.description : "No description available."}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4 }}>
                  {b.chapter_count && <span>{b.chapter_count} chapters</span>}
                  {b.chapter_count && b.page_count && " • "}
                  {b.page_count && <span>{b.page_count} pages</span>}
                  {(b.chapter_count || b.page_count) && " • "}
                  <span>{formatLabel}</span>
                </div>
                <div style={{ color: "var(--btn-success)", fontWeight: 600 }}>{price(b.price_cents)}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}


