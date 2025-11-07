import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const CheckEmail = () => {
  const navigate = useNavigate();
  const [email] = useState(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).email : '');

  const handleResendEmail = async () => {
    // TODO: Implement resend email functionality
    alert('✅ Resend email functionality will be implemented soon!');
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
            style={{
              width: "100%",
              padding: "12px",
              background: "rgba(102, 126, 234, 0.1)",
              color: "#667eea",
              border: "2px solid #667eea",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              marginBottom: "16px"
            }}
          >
            Resend Confirmation Email
          </button>
          
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
