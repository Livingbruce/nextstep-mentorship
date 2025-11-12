import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function EmailLogin() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if already logged in
    const storedEmail = localStorage.getItem("store_user_email");
    if (storedEmail) {
      // Redirect to intended page or home
      const from = location.state?.from?.pathname || "/store";
      navigate(from, { replace: true });
    }
  }, [navigate, location]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    // Store email in localStorage
    localStorage.setItem("store_user_email", email);
    
    // Redirect to intended page or home
    const from = location.state?.from?.pathname || "/store";
    navigate(from, { replace: true });
  };

  return (
    <div style={{ 
      padding: "2rem", 
      maxWidth: 500, 
      margin: "4rem auto",
      background: "var(--card-bg)",
      borderRadius: 12,
      border: "1px solid var(--border-color)",
      boxShadow: "var(--shadow)"
    }}>
      <h1 style={{ color: "var(--text-primary)", marginBottom: "1rem", textAlign: "center" }}>
        Welcome to Bookstore
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", textAlign: "center" }}>
        Enter your email to continue
      </p>

      {error && (
        <div style={{
          background: "var(--alert-danger)",
          color: "var(--alert-danger-text)",
          padding: "12px",
          borderRadius: 6,
          marginBottom: "1rem"
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          required
          autoFocus
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid var(--input-border)",
            borderRadius: 6,
            marginBottom: "1rem",
            fontSize: "1rem",
            background: "var(--input-bg)",
            color: "var(--text-primary)"
          }}
        />
        <button
          type="submit"
          style={{
            width: "100%",
            background: "var(--btn-primary)",
            color: "#fff",
            border: "none",
            padding: "0.75rem 1rem",
            borderRadius: 6,
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Continue
        </button>
      </form>
    </div>
  );
}

