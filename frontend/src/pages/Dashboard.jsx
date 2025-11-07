import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../ThemeContext";
import { AuthContext } from "../utils/AuthContext";
import { useSecurity } from "../SecurityContext";
import { fetchWithAuth } from "../utils/api";
import { ThemeIcon, RefreshIcon, BellIcon, SettingsIcon, LogoutIcon, IconStyles } from "../components/Icons";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useContext(AuthContext);
  const { isWarning, timeLeft, formatTime } = useSecurity();
  const [stats, setStats] = useState({
    appointments: 0,
    announcements: 0,
    activities: 0,
    books: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setActivitiesLoading(true);
      await Promise.all([loadStats(), loadRecentActivities(), loadNotifications()]);
    };
    
    loadInitialData();
  }, []);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const loadNotifications = async () => {
    try {
      const [notificationData, refundData] = await Promise.all([
        fetchWithAuth("/api/notifications/recent").catch(() => []),
        fetchWithAuth("/api/dashboard/refunds").catch(() => [])
      ]);

      const mappedNotifications = (notificationData || []).map((n) => ({
        id: n.id,
        message: n.message,
        createdAt: n.created_at ? new Date(n.created_at).toISOString() : new Date().toISOString(),
        type: n.type || "info"
      }));

      const refundAlerts = (refundData || []).map((refund) => ({
        id: `refund-${refund.id}`,
        message: `Refund request pending for appointment ${refund.appointment_id}`,
        createdAt: (refund.created_at || refund.updated_at)
          ? new Date(refund.created_at || refund.updated_at).toISOString()
          : new Date().toISOString(),
        type: "refund"
      }));

      const combined = [...refundAlerts, ...mappedNotifications]
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .map((notification) => ({
          ...notification,
          time: formatNotificationTime(notification.createdAt)
        }));

      setNotifications(combined);
    } catch (error) {
      console.error("Error loading notifications:", error);
      setNotifications([]);
    }
  };

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return "Unknown time";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  };

  // Refresh all data
  const refreshData = async () => {
    setIsRefreshing(true);
    setLoading(true);
    setActivitiesLoading(true);
    await Promise.all([loadStats(), loadRecentActivities()]);
    setIsRefreshing(false);
  };

  const loadStats = async () => {
    try {
      const [appointments, announcements, activities, books] = await Promise.all([
        fetchWithAuth("/api/dashboard/appointments").catch(() => []),
        fetchWithAuth("/api/dashboard/announcements").catch(() => []),
        fetchWithAuth("/api/activities").catch(() => []),
        fetchWithAuth("/api/dashboard/books").catch(() => [])
      ]);

      setStats({
        appointments: appointments.length || 0,
        announcements: announcements.length || 0,
        activities: activities.length || 0,
        books: books.length || 0
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      setActivitiesLoading(true);
      const response = await fetchWithAuth("/api/recent-activity");
      if (response && response.success && Array.isArray(response.activities)) {
        setRecentActivities(response.activities);
      } else if (Array.isArray(response)) {
        setRecentActivities(response);
      } else {
        setRecentActivities([]);
      }
    } catch (error) {
      console.error("Error loading recent activities:", error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const clearRecentActivities = async () => {
    if (!window.confirm("Are you sure you want to clear old activities? This will delete activities older than 30 days.")) {
      return;
    }

    try {
      setActivitiesLoading(true);
      const response = await fetchWithAuth("/recent-activity/clear", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ days: 30 })
      });

      if (response.success) {
        alert(`Successfully cleared ${response.details.activities + response.details.announcements + response.details.appointments} old activities!`);
        // Reload activities to show updated list
        await loadRecentActivities();
      } else {
        alert("Failed to clear activities. Please try again.");
      }
    } catch (error) {
      console.error("Error clearing recent activities:", error);
      alert("Error clearing activities. Please try again.");
    } finally {
      setActivitiesLoading(false);
    }
  };


  const quickActions = [
    {
      title: "Appointments",
      description: "Schedule and manage appointments",
      icon: "📅",
      path: "/appointments",
      colorClass: "counseling-secondary"
    },
    {
      title: "Books",
      description: "Manage book inventory",
      icon: "📚",
      path: "/books",
      colorClass: "counseling-warm"
    },
    {
      title: "Announcements",
      description: "Post student announcements",
      icon: "📢",
      path: "/announcements",
      colorClass: "counseling-accent"
    },
    {
      title: "Activities",
      description: "Plan counseling activities",
      icon: "🗓",
      path: "/activities",
      colorClass: "counseling-cool"
    },
    {
      title: "Absence",
      description: "Mark unavailable days",
      icon: "❌",
      path: "/absence",
      colorClass: "counseling-warm"
    },
    {
      title: "Profile",
      description: "Update your profile",
      icon: "⚙️",
      path: "/profile",
      colorClass: "counseling-secondary"
    },
    {
      title: "Contacts",
      description: "Manage contact details",
      icon: "📞",
      path: "/contacts",
      colorClass: "counseling-accent"
    },
    {
      title: "Support Tickets",
      description: "Handle support requests",
      icon: "🎫",
      path: "/support-tickets",
      colorClass: "counseling-warm"
    },
    {
      title: "Department",
      description: "Department information",
      icon: "🏢",
      path: "/department",
      colorClass: "counseling-cool"
    },
    {
      title: "Notifications",
      description: "Internal notifications",
      icon: "🔔",
      path: "/notifications",
      colorClass: "counseling-primary"
    }
  ];

  // Helper functions for activity display
  const getActivityIcon = (type) => {
    switch (type) {
      case 'activity':
        return '🗓';
      case 'appointment':
        return '📅';
      case 'announcement':
        return '📢';
      case 'support':
        return '🎫';
      default:
        return '📊';
    }
  };

  const getActivityIconColor = (type) => {
    switch (type) {
      case 'activity':
        return '#3B82F6'; // Blue
      case 'appointment':
        return '#10B981'; // Green
      case 'announcement':
        return '#F59E0B'; // Yellow
      case 'support':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const formatActivityTime = (dateString) => {
    if (!dateString) return 'Unknown time';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const statCards = [
    {
      title: "Appointments",
      value: stats.appointments,
      icon: "📅",
      colorClass: "counseling-primary",
      description: "Total appointments"
    },
    {
      title: "Announcements",
      value: stats.announcements,
      icon: "📢",
      colorClass: "counseling-accent",
      description: "Active announcements"
    },
    {
      title: "Activities",
      value: stats.activities,
      icon: "🗓",
      colorClass: "counseling-cool",
      description: "Scheduled activities"
    },
    {
      title: "Books",
      value: stats.books,
      icon: "📚",
      colorClass: "counseling-warm",
      description: "Books for sale"
    }
  ];

  return (
    <div className="dashboard-container" style={{ padding: "0" }}>
      <IconStyles />
      {/* Header with Theme Toggle and Logout */}
      <div style={{
        background: "var(--header-bg)",
        borderBottom: "1px solid var(--border-color)",
        boxShadow: "var(--shadow)",
        padding: "16px 24px",
        marginBottom: "24px",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        backdropFilter: "blur(10px)"
      }}>
        <div style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "40px"
        }}>
          {/* Logo and Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: "0 0 auto" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              backgroundColor: "var(--accent-color)"
            }}>
              🏥
            </div>
            <div>
              <div style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "16px",
                marginBottom: "8px"
              }}>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start"
                }}>
                  <span style={{
                    fontFamily: "'Brush Script MT', cursive, 'Lucida Handwriting', cursive",
                    color: "var(--text-primary)",
                    fontSize: "32px",
                    fontWeight: "400",
                    fontStyle: "italic",
                    textShadow: "0 0 10px rgba(0,0,0,0.1)",
                    lineHeight: "1"
                  }}>
                    NextStep
                  </span>
                  <span style={{
                    fontFamily: "'Brush Script MT', cursive, 'Lucida Handwriting', cursive",
                    color: "var(--text-secondary)",
                    fontSize: "25px",
                    fontWeight: "400",
                    fontStyle: "italic",
                    lineHeight: "1",
                    marginTop: "-2px"
                  }}>
                    mentorship
                  </span>
                </div>
                <span style={{
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  color: "var(--text-primary)",
                  fontSize: "32px",
                  fontWeight: "600",
                  fontStyle: "normal",
                  lineHeight: "1"
                }}>
                  Dashboard
                </span>
              </div>
              <p style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "var(--text-secondary)",
                margin: 0,
                fontSize: "16px",
                fontWeight: "500",
                fontStyle: "normal"
              }}>
                Welcome, {user?.name || "Counselor"}
              </p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            flex: "1",
            justifyContent: "flex-end",
            marginRight: "16px"
          }}>
            <a href="/dashboard" style={{
              color: "var(--accent-color)",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: "600",
              padding: "6px 0",
              borderBottom: "2px solid var(--accent-color)"
            }}>
              DASHBOARD
            </a>
            <a href="/appointments" style={{
              color: "var(--text-primary)",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: "500",
              padding: "6px 0",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "var(--accent-color)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "var(--text-primary)";
            }}>
              APPOINTMENTS
            </a>
            <a href="/books" style={{
              color: "var(--text-primary)",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: "500",
              padding: "6px 0",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "var(--accent-color)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "var(--text-primary)";
            }}>
              BOOKS
            </a>
            <a href="/announcements" style={{
              color: "var(--text-primary)",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: "500",
              padding: "6px 0",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "var(--accent-color)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "var(--text-primary)";
            }}>
              ANNOUNCEMENTS
            </a>
            <a href="/profile" style={{
              color: "var(--text-primary)",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: "500",
              padding: "6px 0",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "var(--accent-color)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "var(--text-primary)";
            }}>
              PROFILE
            </a>
          </nav>

          {/* Right Side Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "0 0 auto" }}>
            {/* Security Warning */}
            {isWarning && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                backgroundColor: "var(--btn-danger)",
                color: "white",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                <span>⏰</span>
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={refreshData}
              className="icon-button"
              title="Refresh Data"
              disabled={isRefreshing}
            >
              <RefreshIcon size={18} isSpinning={isRefreshing} />
            </button>

            {/* Notifications Button */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  // Navigate to notifications page when clicked
                  if (!showNotifications && notifications.length > 0) {
                    navigate('/notifications');
                  }
                }}
                className={`icon-button ${showNotifications ? 'active' : ''}`}
                title={notifications.length > 0 ? `${notifications.length} notifications` : "Notifications"}
              >
                <BellIcon size={18} hasNotifications={notifications.length > 0} />
                {notifications.length > 0 && (
                  <div className="notification-badge">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </div>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="notification-dropdown" style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "8px",
                  width: "320px",
                  backgroundColor: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 1001,
                  maxHeight: "400px",
                  overflowY: "auto"
                }}>
                  <div style={{
                    padding: "16px",
                    borderBottom: "1px solid var(--border-color)"
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "var(--text-primary)",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>Notifications</span>
                      <button onClick={() => setNotifications([])} style={{ background: 'var(--btn-danger)', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Clear all</button>
                    </h3>
                  </div>
                  <div>
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div key={notification.id} style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--border-color)",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "var(--hover-bg)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                        }}>
                          <p style={{
                            margin: "0 0 4px 0",
                            fontSize: "14px",
                            color: "var(--text-primary)",
                            lineHeight: "1.4"
                          }}>
                            {notification.message}
                          </p>
                          <p style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "var(--text-muted)"
                          }}>
                            {notification.time}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div style={{
                        padding: "24px 16px",
                        textAlign: "center",
                        color: "var(--text-muted)"
                      }}>
                        No notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="icon-button"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <ThemeIcon size={18} isDarkMode={isDarkMode} />
            </button>

            {/* Settings Button */}
            <Link to="/profile" style={{ textDecoration: "none" }}>
              <button
                className="icon-button"
                title="Settings"
              >
                <SettingsIcon size={18} />
              </button>
            </Link>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="icon-button"
              title="Logout"
              style={{
                color: "var(--btn-danger)"
              }}
            >
              <LogoutIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: "0 24px" }}>

      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
        marginBottom: "32px"
      }}>
        {statCards.map((stat, index) => (
          <div key={index} className="stats-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                  fontWeight: "500",
                  margin: "0 0 4px 0",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  {stat.title}
                </p>
                <p style={{
                  color: "var(--text-primary)",
                  fontSize: "32px",
                  fontWeight: "700",
                  margin: "0 0 4px 0"
                }}>
                  {loading ? "..." : stat.value}
                </p>
                <p style={{
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  margin: 0
                }}>
                  {stat.description}
                </p>
              </div>
              <div className={`icon-container ${stat.colorClass}`} style={{
                width: "60px",
                height: "60px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px"
              }}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="modern-card" style={{ padding: "32px" }}>
        <h2 style={{
          color: "var(--text-primary)",
          fontSize: "24px",
          fontWeight: "600",
          margin: "0 0 24px 0"
        }}>
          Quick Actions
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px"
        }}>
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.path}
              style={{
                textDecoration: "none",
                color: "inherit"
              }}
            >
              <div className="quick-action-card" style={{
                padding: "24px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div className={`icon-container ${action.colorClass}`} style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px"
                  }}>
                    {action.icon}
                  </div>
                  <div>
                    <h3 style={{
                      color: "var(--text-primary)",
                      fontSize: "18px",
                      fontWeight: "600",
                      margin: "0 0 4px 0"
                    }}>
                      {action.title}
                    </h3>
                    <p style={{
                      color: "var(--text-secondary)",
                      fontSize: "14px",
                      margin: 0,
                      lineHeight: "1.4"
                    }}>
                      {action.description}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="modern-card" style={{ padding: "32px", marginTop: "24px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px"
        }}>
          <h2 style={{
            color: "var(--text-primary)",
            fontSize: "24px",
            fontWeight: "600",
            margin: 0
          }}>
            Recent Activity
          </h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={refreshData}
              style={{
                background: "var(--accent-color)",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
              disabled={isRefreshing}
            >
              <RefreshIcon size={16} isSpinning={isRefreshing} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={clearRecentActivities}
              style={{
                background: "var(--btn-danger)",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "var(--btn-danger-hover)"}
              onMouseLeave={(e) => e.target.style.background = "var(--btn-danger)"}
            >
              Clear Old
            </button>
          </div>
        </div>
        
        {activitiesLoading ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            color: "var(--text-muted)"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", marginBottom: "16px" }}>⏳</div>
              <p style={{ margin: 0 }}>Loading recent activity...</p>
            </div>
          </div>
        ) : recentActivities.length > 0 ? (
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {recentActivities.map((activity, index) => (
              <div
                key={`${activity.type}-${activity.id}-${index}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  padding: "16px",
                  borderBottom: index < recentActivities.length - 1 ? "1px solid var(--border-color)" : "none",
                  transition: "background-color 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                }}
              >
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: "16px",
                  fontSize: "18px",
                  background: getActivityIconColor(activity.type),
                  color: "white",
                  flexShrink: 0
                }}>
                  {getActivityIcon(activity.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "4px"
                  }}>
                    <h4 style={{
                      color: "var(--text-primary)",
                      fontSize: "16px",
                      fontWeight: "600",
                      margin: 0,
                      marginBottom: "4px"
                    }}>
                      {activity.category}
                    </h4>
                    <span style={{
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      marginLeft: "16px"
                    }}>
                      {formatActivityTime(activity.date || activity.created_at)}
                    </span>
                  </div>
                  <p style={{
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                    margin: 0,
                    lineHeight: "1.4"
                  }}>
                    {activity.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            color: "var(--text-muted)",
            fontSize: "16px"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
              <p style={{ margin: 0 }}>No recent activity found</p>
              <p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>
                Your recent activities will appear here
              </p>
            </div>
          </div>
        )}
      </div>

      </div>
    </div>
  );
};

export default Dashboard;