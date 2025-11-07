import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const VerificationPending = () => {
  const navigate = useNavigate();

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
          <span role="img" aria-label="pending" style={{ fontSize: "30px" }}>⏳</span>
        </div>
        <h1 style={{ color: "white", fontSize: "28px", fontWeight: "700", margin: "0 0 5px 0" }}>
          NextStep Mentorship
        </h1>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "15px", margin: 0 }}>
          Your application is under review
        </p>
      </div>

      {/* Pending Card */}
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
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>📋</div>
          
          <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 16px 0", color: "#2c3e50" }}>
            Verification Pending
          </h2>
          
          <p style={{ fontSize: "16px", color: "#666", margin: "0 0 24px 0", lineHeight: "1.6" }}>
            Your therapist profile has been submitted and is currently under review by our admin team.
          </p>
          
          <div style={{ 
            background: "#fff3cd", 
            padding: "16px", 
            borderRadius: "8px", 
            margin: "20px 0",
            borderLeft: "4px solid #ffc107"
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#856404" }}>
              What happens next?
            </h3>
            <ul style={{ textAlign: "left", fontSize: "14px", color: "#856404", margin: "8px 0 0 0", paddingLeft: "16px" }}>
              <li>Our team reviews your documents</li>
              <li>We verify your credentials</li>
              <li>You'll receive an approval email</li>
              <li>Then you can access the platform</li>
            </ul>
          </div>

          <div style={{ 
            background: "#f8f9ff", 
            padding: "12px", 
            borderRadius: "8px", 
            margin: "20px 0"
          }}>
            <p style={{ fontSize: "14px", color: "#667eea", fontWeight: "500", margin: 0 }}>
              ⏱️ Estimated review time: 24-48 hours
            </p>
          </div>

          <button
            onClick={() => navigate('/login')}
            style={{
              width: "100%",
              padding: "12px",
              background: "rgba(102, 126, 234, 0.1)",
              color: "#667eea",
              border: "2px solid #667eea",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer"
            }}
          >
            Return to Login (Check Status)
          </button>
          
          <div style={{ marginTop: "20px", fontSize: "12px", color: "#999" }}>
            <p>Questions? Contact our support team</p>
            <Link to="/contact" style={{ color: "#667eea", textDecoration: "none" }}>support@nextstepmentorship.com</Link>
          </div>
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

export default VerificationPending;
