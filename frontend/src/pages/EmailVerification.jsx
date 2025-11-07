import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the URL.');
      return;
    }

    // Verify the email token
    verifyEmailToken(token);
  }, [token]);

  const verifyEmailToken = async (verificationToken) => {
    try {
      const response = await fetch(`http://localhost:5000/api/auth/confirm-email?token=${verificationToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        
        // Store user email and name for the personal info step
        if (data.user && data.user.email) {
          localStorage.setItem('userEmailForVerification', data.user.email);
          localStorage.setItem('verifiedUserId', data.user.id);
          // Extract first name from full name (ensure we handle edge cases)
          const firstName = data.user.name ? data.user.name.split(' ')[0] : 'there';
          console.log('🔍 DEBUG EmailVerification:');
          console.log('- Full name:', data.user.name);
          console.log('- Extracted firstName:', firstName);
          console.log('- Storing in localStorage...');
          localStorage.setItem('userFirstName', firstName);
          console.log('- Stored userFirstName:', localStorage.getItem('userFirstName'));
        }
        
        // Redirect to signup page after 3 seconds
        setTimeout(() => {
          navigate('/signup?verified=true');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Email verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
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
          <span role="img" aria-label="rocket" style={{ fontSize: "30px" }}>🚀</span>
        </div>
        <h1 style={{ color: "white", fontSize: "28px", fontWeight: "700", margin: "0 0 5px 0" }}>
          NextStep Mentorship
        </h1>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "15px", margin: 0 }}>
          Verifying your email address
        </p>
      </div>

      {/* Verification Status Card */}
      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "rgba(255,255,255,0.98)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        marginBottom: "auto"
      }}>
        <div style={{ padding: "32px", textAlign: "center" }}>
          {status === 'verifying' && (
            <>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 12px 0", color: "#2c3e50" }}>
                Verifying Your Email...
              </h2>
              <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                Please wait while we confirm your email address.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 12px 0", color: "#27ae60" }}>
                Email Verified!
              </h2>
              <p style={{ fontSize: "14px", color: "#666", margin: "0 0 20px 0" }}>
                {message}
              </p>
              <p style={{ fontSize: "12px", color: "#999", margin: 0 }}>
                Redirecting you to complete your profile...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 12px 0", color: "#e74c3c" }}>
                Verification Failed
              </h2>
              <p style={{ fontSize: "14px", color: "#666", margin: "0 0 20px 0" }}>
                {message}
              </p>
              <button
                onClick={() => navigate('/signup')}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                Go to Sign Up
              </button>
            </>
          )}
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

export default EmailVerification;
