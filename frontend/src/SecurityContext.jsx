import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContext } from './utils/AuthContext';

const SecurityContext = createContext();

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

export const SecurityProvider = ({ children }) => {
  const { logout } = useContext(AuthContext);
  const [isWarning, setIsWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Auto-logout after 30 minutes of inactivity (1800 seconds)
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before logout
  
  useEffect(() => {
    let timeoutId;
    let warningTimeoutId;
    let intervalId;

    const resetTimer = () => {
      // Clear existing timeouts
      clearTimeout(timeoutId);
      clearTimeout(warningTimeoutId);
      clearInterval(intervalId);
      setIsWarning(false);
      setTimeLeft(0);

      // Set warning timeout (5 minutes before logout)
      warningTimeoutId = setTimeout(() => {
        setIsWarning(true);
        setTimeLeft(WARNING_TIME / 1000); // Convert to seconds
        
        // Start countdown
        intervalId = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              logout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, INACTIVITY_TIMEOUT - WARNING_TIME);

      // Set logout timeout
      timeoutId = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT);
    };

    // Activity events that reset the timer
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Initial timer setup
    resetTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
      clearTimeout(timeoutId);
      clearTimeout(warningTimeoutId);
      clearInterval(intervalId);
    };
  }, [logout]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const extendSession = () => {
    setIsWarning(false);
    setTimeLeft(0);
    // Reset timer by triggering a fake activity event
    document.dispatchEvent(new Event('mousedown'));
  };

  const value = {
    isWarning,
    timeLeft,
    formatTime,
    extendSession
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
      {isWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--card-bg)',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>
              ⏰
            </div>
            <h2 style={{
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              fontSize: '1.5rem'
            }}>
              Session Timeout Warning
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              You will be automatically logged out due to inactivity in:
            </p>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'var(--btn-danger)',
              marginBottom: '2rem',
              fontFamily: 'monospace'
            }}>
              {formatTime(timeLeft)}
            </div>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={extendSession}
                className="btn-modern btn-primary-modern"
                style={{
                  padding: '12px 24px',
                  fontSize: '1rem'
                }}
              >
                Stay Logged In
              </button>
              <button
                onClick={logout}
                className="btn-modern btn-secondary-modern"
                style={{
                  padding: '12px 24px',
                  fontSize: '1rem'
                }}
              >
                Logout Now
              </button>
            </div>
          </div>
        </div>
      )}
    </SecurityContext.Provider>
  );
};
