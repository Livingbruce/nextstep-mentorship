import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../utils/apiConfig.js';

const CheckEmail = () => {
  const navigate = useNavigate();
  const [email] = useState(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).email : '');
  const [resendState, setResendState] = useState({ loading: false, message: '', type: '' });

  const handleResendEmail = async () => {
    if (!email) {
      setResendState({
        loading: false,
        message: 'We could not detect your email address. Please go back and sign up again.',
        type: 'error'
      });
      return;
    }

    setResendState({ loading: true, message: '', type: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to resend verification email.');
      }

      let successMessage = data?.message || 'Verification email resent successfully.';
      if (data?.emailStatus === 'queued') {
        successMessage = 'Email queued for delivery. Please check again in a few minutes.';
      } else if (data?.emailStatus === 'delivered') {
        successMessage = 'Your email is already confirmed. You can log in now.';
      }

      setResendState({
        loading: false,
        message: successMessage,
        type: 'success'
      });
    } catch (error) {
      setResendState({
        loading: false,
        message: error.message || 'Unable to resend verification email. Please try again later.',
        type: 'error'
      });
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'Inter', sans-serif",
      boxSizing: "border-box"
    }}>
      {/* Branding */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <div style={{
          width: "60px",
          height: "60px",
          background: "rgba(255,255,255,0.2)",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 10px auto"
        }}>
          <span role="img" aria-label="mail" style={{ fontSize: "30px" }}>📧</span>
        </div>
        <h1 style={{ color: "white", fontSize: "28px", fontWeight: "700", margin: "0 0 5px 0" }}>
          NextStep Mentorship
        </h1>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "15px", margin: 0 }}>
          Check your email to continue
        </p>
      </div>

      {/* Email Check Card */}
      <div style={{
        width: "100%",
        maxWidth: "500px",
        background: "rgba(255,255,255,0.98)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        marginBottom: "auto"
      }}>
        <div style={{ padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>📬</div>
          
          <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 16px 0", color: "#2c3e50" }}>
            Check Your Email
          </h2>
          
          <p style={{ fontSize: "16px", color: "#666", margin: "0 0 24px 0", lineHeight: "1.6" }}>
            We've sent a confirmation email to <strong>{email}</strong>
          </p>
          
          <div style={{ 
            background: "#f8f9ff", 
            padding: "16px", 
            borderRadius: "8px", 
            margin: "20px 0",
            borderLeft: "4px solid #667eea"
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#2c3e50" }}>
              Next Steps:
            </h3>
            <ol style={{ textAlign: "left", fontSize: "14px", color: "#666", margin: "8px 0 0 0", paddingLeft: "16px" }}>
              <li>Check your email inbox</li>
              <li>Click the "Confirm My Account" button</li>
              <li>Complete your professional profile</li>
              <li>Wait for admin approval</li>
            </ol>
          </div>

          <p style={{ fontSize: "14px", color: "#999", margin: "24px 0 16px 0" }}>
            Didn't receive the email? Check your spam folder or try resending.
          </p>

          <button
            onClick={handleResendEmail}
            disabled={resendState.loading}
            style={{
              width: "100%",
              padding: "12px",
              background: resendState.loading ? "rgba(102, 126, 234, 0.05)" : "rgba(102, 126, 234, 0.1)",
              color: resendState.loading ? "#a5b4fc" : "#667eea",
              border: "2px solid #667eea",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: resendState.loading ? "not-allowed" : "pointer",
              marginBottom: "12px"
            }}
          >
            {resendState.loading ? 'Sending...' : 'Resend Confirmation Email'}
          </button>

          {resendState.message && (
            <div
              style={{
                width: "100%",
                borderRadius: "8px",
                padding: "12px",
                border: resendState.type === 'success' ? "1px solid #48bb78" : "1px solid #f56565",
                background: resendState.type === 'success' ? "rgba(72, 187, 120, 0.1)" : "rgba(245, 101, 101, 0.1)",
                color: resendState.type === 'success' ? "#276749" : "#c53030",
                fontSize: "13px",
                marginBottom: "16px"
              }}
            >
              {resendState.message}
            </div>
          )}
          
          <button
            onClick={() => navigate('/login')}
            style={{
              width: "100%",
              padding: "12px",
              background: "transparent",
              color: "#666",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              marginBottom: "16px"
            }}
          >
            Back to Login
          </button>
          
          <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
            Already confirmed? <Link to="/login" style={{ color: "#667eea", textDecoration: "none" }}>Try signing in again</Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        marginTop: "24px",
        textAlign: "center",
        color: "rgba(255,255,255,0.8)",
        fontSize: "12px",
        paddingBottom: "24px"
      }}>
        <p style={{ margin: "4px 0", fontSize: "11px", opacity: 0.7 }}>
          By signing up, you agree to our 
          <a href="#" style={{ color: "rgba(255,255,255,0.9)", textDecoration: "none" }}> Terms of Service </a>
          and 
          <a href="#" style={{ color: "rgba(255,255,255,0.9)", textDecoration: "none" }}> Privacy Policy</a>
        </p>
        
        <p style={{ margin: "4px 0", fontSize: "10px", opacity: 0.6 }}>
          © 2024 NextStep Mentorship. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default CheckEmail;
