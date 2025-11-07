import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../utils/AuthContext";

const AuthPortal = () => {
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
          
          // Get verification status from localStorage
          const verificationStatus = JSON.parse(localStorage.getItem('verificationStatus') || '{}');
          const signupStep = localStorage.getItem('signupStep');
          const personalInfoSaved = localStorage.getItem('personalInfoSaved');
          const professionalInfoSaved = localStorage.getItem('professionalInfoSaved');
          
          // Also check database to see if user has completed all required fields
          let hasCompletedRegistration = false;
          let isApproved = false;
          try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/get-user-by-email?email=${encodeURIComponent(loginForm.email)}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
              const data = await response.json();
              const user = data.user;
              
              // Check if user has completed all required fields
              hasCompletedRegistration = !!(
                user.therapist_id && 
                user.specialization && 
                user.experience && 
                user.education_background && 
                user.target_conditions && 
                user.therapeutic_approach && 
                user.national_id_number
              );
              
              // Check if user is approved
              isApproved = user.verification_status === 'approved';
            }
          } catch (error) {
            console.error('❌ Error checking database completion:', error);
          }
          
          // Smart redirect based on verification status and progress
          if (!verificationStatus.emailConfirmed) {
            // Email not confirmed - redirect to email check page
            navigate('/check-email');
          } else if (hasCompletedRegistration || signupStep === '4' || professionalInfoSaved) {
            // User completed all steps - check if approved
            if (isApproved) {
              navigate('/');
            } else {
              navigate('/signup?verified=true&step=4');
            }
          } else if (signupStep === '3' || personalInfoSaved) {
            // User is on professional details step
            navigate('/signup?verified=true&step=3');
          } else if (signupStep === '2') {
            // User is on personal information step
            navigate('/signup?verified=true&step=2');
          } else if (!verificationStatus.profileComplete) {
            // Email confirmed but profile incomplete - redirect to step 2
            navigate('/signup?verified=true');
          } else if (!verificationStatus.adminApproved) {
            // Profile complete but not admin approved - redirect to review page
            navigate('/signup?verified=true&step=4');
          } else {
            // Everything complete - redirect to dashboard
            navigate('/');
          }
    } catch (error) {
      alert('Oops! Wrong email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
      }}>
        <div style={{
          color: "white",
          fontSize: "18px",
          textAlign: "center"
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgba(255,255,255,0.3)",
            borderTop: "3px solid white",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px auto"
          }}></div>
          Loading...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "16px 16px 0",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
    }}>
      {/* Logo and Header */}
      <div style={{
        textAlign: "center",
        marginBottom: "24px",
        color: "white"
      }}>
        <div style={{
          width: "60px",
          height: "60px",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.25)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
          margin: "0 auto 12px auto",
          border: "2px solid rgba(255,255,255,0.3)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
        }}>
          🚀
        </div>
        <h1 style={{
          fontSize: "28px",
          fontWeight: "600",
          margin: "0 0 4px 0",
          color: "white"
        }}>
          NextStep Mentorship
        </h1>
        <p style={{
          fontSize: "14px",
          opacity: 0.9,
          margin: 0,
          fontWeight: "300"
        }}>
          Join our network of mental health professionals
        </p>
      </div>

      {/* Auth Card */}
      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "rgba(255,255,255,0.98)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        marginBottom: "auto"
      }}>
        {/* Sign In Form */}
        <div style={{ padding: "24px" }}>
          <div style={{ position: "relative", marginBottom: "12px" }}>
            <input
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
              placeholder="Enter your email"
              style={{
                width: "100%",
                padding: "14px",
                border: "2px solid #e9ecef",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                background: "white",
                color: "#333 !important",
                outline: "none",
                transition: "border-color 0.2s ease",
                WebkitTextFillColor: "#333",
                WebkitBoxShadow: "0 0 0 1000px white inset"
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e9ecef"}
            />
          </div>
          
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              placeholder="Enter your password"
              style={{
                width: "100%",
                padding: "14px 45px 14px 14px",
                border: "2px solid #e9ecef",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                background: "white",
                color: "#333 !important",
                outline: "none",
                transition: "border-color 0.2s ease",
                WebkitTextFillColor: "#333",
                WebkitBoxShadow: "0 0 0 1000px white inset"
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e9ecef"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: "#666",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "14px",
              background: isLoading ? "#ccc" : "linear-gradient(45deg, #667eea, #764ba2)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              marginBottom: "12px",
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
          
          <p style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#666",
            margin: "0 0 8px 0"
          }}>
            Don't have an account? <Link to="/signup" style={{ color: "#667eea", textDecoration: "none" }}>Sign up</Link>
          </p>
          
          <p style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#666",
            margin: 0
          }}>
            <Link to="/forgot-password" style={{ color: "#667eea", textDecoration: "none" }}>
              Forgot your password?
            </Link>
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
          By signing in, you agree to our 
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

export default AuthPortal;