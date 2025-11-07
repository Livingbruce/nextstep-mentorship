import React, { createContext, useContext, useState, useEffect } from 'react'

// Version 1.0.5 - Final fix for JSON parse error and function hoisting - FORCE NEW BUILD - 2025-01-19 15:47

const AuthContext = createContext()

export { AuthContext }

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')
      const tokenExpiry = localStorage.getItem('tokenExpiry')
      
      // Check if token has expired (30 minutes = 30 * 60 * 1000 ms)
      const now = Date.now()
      const isTokenExpired = tokenExpiry && now > parseInt(tokenExpiry)
      
      if (token && storedUser && !isTokenExpired) {
        try {
          // First, try to restore user from localStorage for immediate UI update
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
          
          // Then verify with API in background (don't block UI)
          const envUrl = import.meta.env.VITE_API_BASE_URL;
          const apiBaseUrl = envUrl || (import.meta.env.DEV ? 'http://localhost:5000' : '');
          // Use relative URL if no env URL (same domain = no CORS)
          fetch(`${apiBaseUrl}/api/auth/me`, {
            credentials: 'include', // Required for CORS with credentials
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }).then(async (response) => {
            if (response.ok) {
              const freshUserData = await response.json();
              setUser(freshUserData);
              setIsAuthenticated(true);
              localStorage.setItem('user', JSON.stringify(freshUserData));
              // Update token expiry
              localStorage.setItem('tokenExpiry', (now + 30 * 60 * 1000).toString());
            } else if (response.status === 401 || response.status === 403) {
              // Token is invalid, clear it
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('tokenExpiry');
              setUser(null);
              setIsAuthenticated(false);
            }
          }).catch((apiError) => {
            console.error('API auth check failed:', apiError);
            // Keep user logged in if API fails but token exists
          });
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('tokenExpiry');
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        // Token expired or missing
        if (isTokenExpired) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('tokenExpiry');
        }
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('tokenExpiry')
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
    
    // Set up token refresh every 25 minutes (5 minutes before expiry)
    const refreshInterval = setInterval(() => {
      const token = localStorage.getItem('token')
      const tokenExpiry = localStorage.getItem('tokenExpiry')
      const now = Date.now()
      
      if (token && tokenExpiry && now < parseInt(tokenExpiry)) {
        // Extend token by another 30 minutes
        localStorage.setItem('tokenExpiry', (now + 30 * 60 * 1000).toString())
        console.log('🔄 Token refreshed automatically')
      }
    }, 25 * 60 * 1000) // 25 minutes
    
    // Clean up interval on unmount
    return () => clearInterval(refreshInterval)
  }, [])

  const loginUser = async (email, password) => {
    try {
      // Get API base URL - use relative URL when on same domain (Netlify)
      const envUrl = import.meta.env.VITE_API_BASE_URL;
      const apiBaseUrl = envUrl || (import.meta.env.DEV ? 'http://localhost:5000' : '');
      // If no env URL in production, use relative URL (same domain = no CORS needed)
      
      // Real API authentication
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        credentials: 'include', // Required for CORS with credentials
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.counselor || data.user));
      localStorage.setItem('verificationStatus', JSON.stringify(data.verificationStatus || {}));
      // Set token expiry to 30 minutes from now
      localStorage.setItem('tokenExpiry', (Date.now() + 30 * 60 * 1000).toString());
      setUser(data.counselor || data.user);
      setIsAuthenticated(true);
      
      return data.counselor || data.user;
    } catch (error) {
      console.error('Login failed:', error)
      throw error;
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('tokenExpiry')
    setUser(null)
    setIsAuthenticated(false)
  }

  const handleAuthError = () => {
    console.log('🔄 Handling authentication error - clearing session');
    logout();
    // Redirect to login page
    window.location.href = '/login';
  }

  const value = {
    user,
    isAuthenticated,
    loading,
    login: loginUser,
    logout,
    handleAuthError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
