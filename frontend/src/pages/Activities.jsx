import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    activity_date: "",
    activity_time: ""
  });
  const [editingActivity, setEditingActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadActivities();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get("/api/activities");
      setActivities(data);
    } catch (err) {
      console.error("Error loading activities:", err);
      setError("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.activity_date || !form.activity_time) {
      setError("Please fill in all required fields");
      return;
    }

    console.log("Submitting activity form:", form);

    try {
      setLoading(true);
      setError(null);

      if (editingActivity) {
        // Update existing activity
        const updatedActivity = await api.put(`/api/activities/${editingActivity.id}`, form);
        setActivities(activities.map(activity => 
          activity.id === editingActivity.id ? updatedActivity : activity
        ));
        setEditingActivity(null);
        
        // Reload activities to ensure consistency
        loadActivities();
      } else {
        // Add new activity
        const created = await api.post("/api/activities", form);
        if (created && created.id) {
          setActivities([created, ...activities]);
        }
      }

      // Reload activities to ensure consistency
      loadActivities();

      // Reset form
      setForm({
        title: "",
        description: "",
        activity_date: "",
        activity_time: ""
      });
    } catch (err) {
      console.error("Error saving activity:", err);
      setError("Failed to save activity");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this activity?")) return;

    console.log("Deleting activity with ID:", id);

    try {
      setLoading(true);
      const response = await api.delete(`/api/activities/${id}`);
      console.log("Delete response:", response);
      setActivities(activities.filter(activity => activity.id !== id));
      setError(null);
      
      // Reload activities to ensure consistency
      loadActivities();
    } catch (err) {
      console.error("Error deleting activity:", err);
      setError("Failed to delete activity");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (activity) => {
    setEditingActivity(activity);
    // Format time to HH:mm if it comes as HH:mm:ss
    const time = activity.activity_time ? activity.activity_time.substring(0, 5) : "";
    setForm({
      title: activity.title,
      description: activity.description || "",
      activity_date: activity.activity_date,
      activity_time: time
    });
  };

  const handleCancelEdit = () => {
    setEditingActivity(null);
    setForm({
      title: "",
      description: "",
      activity_date: "",
      activity_time: ""
    });
  };

  const formatDateTime = (activity) => {
    try {
      // Handle both old and new date formats
      let dateStr;
      if (activity.activity_date && activity.activity_time) {
        // New format: separate date and time
        // Extract just the date part if it's a timestamp
        const datePart = activity.activity_date.includes('T') ? 
          activity.activity_date.split('T')[0] : 
          activity.activity_date;
        
        // Format time to HH:mm if it comes as HH:mm:ss
        const time = activity.activity_time.substring(0, 5);
        dateStr = `${datePart}T${time}`;
      } else if (activity.full_datetime) {
        // Old format: combined datetime
        dateStr = activity.full_datetime;
      } else {
        return "Invalid Date";
      }
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.error("Invalid date string:", dateStr);
        return "Invalid Date";
      }
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid Date";
    }
  };

  const isPastActivity = (activity) => {
    try {
      const now = new Date();
      let activityDateTime;
      
      if (activity.activity_date && activity.activity_time) {
        // Extract just the date part if it's a timestamp
        const datePart = activity.activity_date.includes('T') ? 
          activity.activity_date.split('T')[0] : 
          activity.activity_date;
        
        // Format time to HH:mm if it comes as HH:mm:ss
        const time = activity.activity_time.substring(0, 5);
        activityDateTime = new Date(`${datePart}T${time}`);
      } else if (activity.full_datetime) {
        activityDateTime = new Date(activity.full_datetime);
      } else {
        return false;
      }
      
      return activityDateTime < now;
    } catch (error) {
      console.error("Date comparison error:", error);
      return false;
    }
  };

  // Define styling objects using theme variables
  const cardStyle = {
    backgroundColor: "var(--card-bg)",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    boxShadow: "var(--shadow)",
    marginBottom: "20px"
  };

  const formStyle = {
    backgroundColor: "var(--card-bg)",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    boxShadow: "var(--shadow)",
    marginBottom: "20px"
  };

  const inputStyle = {
    padding: "10px",
    border: "1px solid var(--input-border)",
    borderRadius: "4px",
    backgroundColor: "var(--input-bg)",
    color: "var(--text-primary)",
    fontSize: "14px"
  };

  const buttonStyle = {
    backgroundColor: "var(--btn-primary)",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px"
  };

  const editButtonStyle = {
    backgroundColor: "var(--btn-warning)",
    color: "var(--btn-warning-text)",
    border: "none",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px"
  };

  const deleteButtonStyle = {
    backgroundColor: "var(--alert-danger)",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px"
  };

  const messageStyle = {
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "20px",
    border: "1px solid"
  };

  if (loading && activities.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p style={{ color: "var(--text-primary)" }}>Loading activities...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <button style={{
            ...buttonStyle,
            backgroundColor: "var(--btn-secondary)",
            marginBottom: "20px"
          }}>
            ← Back to Dashboard
          </button>
        </Link>
        <h1 style={{ color: "var(--text-primary)", margin: "0" }}>🗓 Activities</h1>
      </div>
      
      {error && (
        <div style={{
          ...messageStyle,
          backgroundColor: "var(--alert-danger-bg)",
          color: "var(--alert-danger-text)",
          borderColor: "var(--alert-danger-border)"
        }}>
          {error}
        </div>
      )}

      {/* Add/Edit Activity Form */}
      <div style={formStyle}>
        <h3 style={{ color: "var(--text-primary)", marginBottom: "15px" }}>{editingActivity ? "Edit Activity" : "Add Activity"}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
            <input
              type="text"
              name="title"
              placeholder="Activity Title"
              value={form.title}
              onChange={handleChange}
              required
              disabled={loading}
              style={inputStyle}
            />
            <input
              type="date"
              name="activity_date"
              value={form.activity_date}
              onChange={handleChange}
              required
              disabled={loading}
              style={inputStyle}
            />
            <input
              type="time"
              name="activity_time"
              value={form.activity_time}
              onChange={handleChange}
              required
              disabled={loading}
              style={inputStyle}
            />
            <input
              type="text"
              name="description"
              placeholder="Description (optional)"
              value={form.description}
              onChange={handleChange}
              disabled={loading}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              type="submit" 
              disabled={loading || !form.title.trim() || !form.activity_date || !form.activity_time}
              style={{
                ...buttonStyle,
                backgroundColor: loading ? "var(--btn-secondary)" : "var(--btn-primary)",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Saving..." : (editingActivity ? "Update" : "Add")}
            </button>
            {editingActivity && (
              <button 
                type="button"
                onClick={handleCancelEdit}
                disabled={loading}
                style={{
                  ...buttonStyle,
                  backgroundColor: "var(--btn-secondary)"
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List Activities */}
      <div>
        <h3 style={{ color: "var(--text-primary)", marginBottom: "15px" }}>Activities ({activities.length})</h3>
        {activities.length === 0 ? (
          <div style={{
            ...cardStyle,
            textAlign: "center"
          }}>
            <p style={{ color: "var(--text-secondary)", fontStyle: "italic", margin: 0 }}>
              No activities found.
            </p>
          </div>
        ) : (
          <div style={cardStyle}>
            {activities.map((activity, index) => (
              <div key={activity.id} style={{ 
                padding: "15px 0", 
                borderBottom: index < activities.length - 1 ? "1px solid var(--border-color)" : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                opacity: isPastActivity(activity) ? 0.6 : 1
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 5px 0", fontWeight: "500", fontSize: "16px", color: "var(--text-primary)" }}>
                    {activity.title}
                    {isPastActivity(activity) && (
                      <span style={{ 
                        fontSize: "12px", 
                        color: "var(--text-secondary)", 
                        marginLeft: "10px",
                        fontStyle: "italic"
                      }}>
                        (Past)
                      </span>
                    )}
                  </p>
                  {activity.description && (
                    <p style={{ margin: "0 0 5px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                      {activity.description}
                    </p>
                  )}
                  <p style={{ margin: "0", fontSize: "14px", color: "var(--text-secondary)" }}>
                    📅 {formatDate(activity.activity_date)} at {activity.activity_time}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => handleEdit(activity)}
                    disabled={loading}
                    style={editButtonStyle}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(activity.id)}
                    disabled={loading}
                    style={deleteButtonStyle}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Activities;
