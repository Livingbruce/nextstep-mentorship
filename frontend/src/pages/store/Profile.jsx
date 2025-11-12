import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";

export default function Profile() {
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: ""
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    const storedEmail = localStorage.getItem("store_user_email");
    if (storedEmail) {
      setEmail(storedEmail);
      loadProfile(storedEmail);
    }
  }, []);

  const loadProfile = async (userEmail) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch orders to get client details
      const orders = await api.get(`/api/books/store/my-orders?email=${encodeURIComponent(userEmail)}`);
      
      if (orders && orders.length > 0) {
        // Use the most recent order for profile data
        const latestOrder = orders[0];
        setProfile({
          email: userEmail,
          name: latestOrder.client_name,
          phone: latestOrder.client_phone,
          address: latestOrder.client_address,
          city: latestOrder.client_city,
          country: latestOrder.client_country,
          county: latestOrder.client_county,
          postal_code: latestOrder.client_postal_code,
          total_orders: orders.length
        });
      } else {
        // No orders yet, just show email
        setProfile({
          email: userEmail,
          name: "",
          phone: "",
          total_orders: 0
        });
      }
    } catch (e) {
      console.error("Profile: failed to load", e);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (passwordForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Store password hash in localStorage (in production, this would be sent to backend)
      // For now, we'll just store a flag that password is set
      localStorage.setItem("store_user_password_set", "true");
      localStorage.setItem("store_user_password_hash", btoa(passwordForm.password)); // Simple encoding (not secure, but works for demo)
      
      setSuccess("Password set successfully");
      setPasswordForm({ password: "", confirmPassword: "" });
      setShowPasswordForm(false);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error("Profile: failed to set password", e);
      setError("Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("store_user_email");
    localStorage.removeItem("store_user_password_set");
    localStorage.removeItem("store_user_password_hash");
    window.location.href = "/store/login";
  };

  if (loading && !profile) {
    return <div style={{ padding: "2rem" }}><p>Loading...</p></div>;
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Navigation Header */}
      <nav style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
        <Link to="/store" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
        <Link to="/account/orders" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Orders</Link>
        <Link to="/account/library" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>My Library</Link>
        <Link to="/account/wishlist" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Wishlist</Link>
        <Link to="/account/profile" style={{ color: "var(--btn-primary)", textDecoration: "none", fontWeight: 600 }}>Profile</Link>
      </nav>

      <h1 style={{ color: "var(--text-primary)", marginBottom: "1.5rem" }}>My Profile</h1>

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

      {success && (
        <div style={{
          background: "var(--alert-success)",
          color: "var(--alert-success-text)",
          padding: "12px",
          borderRadius: 6,
          marginBottom: "1rem"
        }}>
          {success}
        </div>
      )}

      {profile && (
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: 12,
          padding: "1.5rem",
          marginBottom: "1.5rem"
        }}>
          <h2 style={{ color: "var(--text-primary)", marginBottom: "1rem" }}>Account Information</h2>
          
          <div style={{ display: "grid", gap: "12px", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", color: "var(--text-secondary)", fontSize: 14, marginBottom: 4 }}>Email</label>
              <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{profile.email}</div>
            </div>
            
            {profile.name && (
              <div>
                <label style={{ display: "block", color: "var(--text-secondary)", fontSize: 14, marginBottom: 4 }}>Full Name</label>
                <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{profile.name}</div>
              </div>
            )}
            
            {profile.phone && (
              <div>
                <label style={{ display: "block", color: "var(--text-secondary)", fontSize: 14, marginBottom: 4 }}>Phone</label>
                <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{profile.phone}</div>
              </div>
            )}
            
            {profile.address && (
              <div>
                <label style={{ display: "block", color: "var(--text-secondary)", fontSize: 14, marginBottom: 4 }}>Address</label>
                <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {profile.address}
                  {profile.city && `, ${profile.city}`}
                  {profile.county && `, ${profile.county}`}
                  {profile.country && `, ${profile.country}`}
                  {profile.postal_code && ` ${profile.postal_code}`}
                </div>
              </div>
            )}
            
            <div>
              <label style={{ display: "block", color: "var(--text-secondary)", fontSize: 14, marginBottom: 4 }}>Total Orders</label>
              <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{profile.total_orders}</div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
            <h3 style={{ color: "var(--text-primary)", marginBottom: "1rem" }}>Security</h3>
            
            {!showPasswordForm && (
              <div>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  {localStorage.getItem("store_user_password_set") === "true" 
                    ? "Password is set. You can change it below."
                    : "No password set. Set a password to secure your account."}
                </p>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  style={{
                    background: "var(--btn-primary)",
                    color: "#fff",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 500
                  }}
                >
                  {localStorage.getItem("store_user_password_set") === "true" ? "Change Password" : "Set Password"}
                </button>
              </div>
            )}

            {showPasswordForm && (
              <form onSubmit={handleSetPassword} style={{ maxWidth: 400 }}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: 14, marginBottom: 4 }}>New Password</label>
                  <input
                    type="password"
                    name="password"
                    value={passwordForm.password}
                    onChange={handlePasswordChange}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid var(--input-border)",
                      borderRadius: 6,
                      background: "var(--input-bg)",
                      color: "var(--text-primary)"
                    }}
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: 14, marginBottom: 4 }}>Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid var(--input-border)",
                      borderRadius: 6,
                      background: "var(--input-bg)",
                      color: "var(--text-primary)"
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: "var(--btn-primary)",
                      color: "#fff",
                      border: "none",
                      padding: "0.75rem 1.5rem",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 500
                    }}
                  >
                    Save Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordForm({ password: "", confirmPassword: "" });
                      setError(null);
                    }}
                    style={{
                      background: "var(--btn-secondary)",
                      color: "var(--text-primary)",
                      border: "none",
                      padding: "0.75rem 1.5rem",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 500
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
            <button
              onClick={handleLogout}
              style={{
                background: "var(--btn-danger)",
                color: "#fff",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

