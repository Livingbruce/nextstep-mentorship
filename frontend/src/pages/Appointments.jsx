import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../utils/AuthContext";
import api, { fetchWithAuth } from "../utils/api";

const Appointments = () => {
  const { handleAuthError } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [refunds, setRefunds] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [transferDialog, setTransferDialog] = useState({ open: false, apptId: null, date: '', time: '', counselorId: '' });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('appointments');

  async function loadAppointments() {
    try {
      setLoading(true);
      const data = await api.get("/api/dashboard/appointments");
      console.log("Loaded appointments:", data);
      setAppointments(data);
      setError(null);
      try {
        const refundData = await api.get("/api/dashboard/refunds");
        setRefunds(Array.isArray(refundData) ? refundData : []);
      } catch (_) {}
    } catch (err) {
      console.error("Error loading appointments:", err);
      setError("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews() {
    try {
      const data = await api.get("/api/dashboard/reviews");
      setReviews(data);
    } catch (err) {
      console.error("Error loading reviews:", err);
    }
  }

  async function updatePaymentStatus(id, status) {
    try {
      const updated = await fetchWithAuth(`/api/dashboard/appointments/${id}/payment-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: status })
      });
      setSuccessMessage(`✅ Payment status updated to ${status}`);
      await loadAppointments();
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (e) {
      console.error('Payment status update failed:', e);
      setError('Failed to update payment status');
    }
  }

  async function resolveRefund(id, action) {
    try {
      await api.post(`/api/dashboard/refunds/${id}/resolve`, { action });
      setSuccessMessage(action === 'approve' ? '✅ Refund approved' : '✅ Refund rejected');
      await loadAppointments();
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (e) {
      console.error('Resolve refund failed:', e);
      setError('Failed to resolve refund');
    }
  }

  async function cancelAppointment(id) {
    try {
      await api.post(`/api/dashboard/appointments/${id}/cancel`);
      setSuccessMessage("✅ Appointment cancelled!");
      setError(null);
      loadAppointments();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error canceling appointment:", err);
      setError("Failed to cancel appointment");
    }
  }

  async function openTransfer(appointment) {
    try {
      // Prime date/time
      const start = new Date(appointment.start_ts);
      const y = start.getFullYear();
      const m = (start.getMonth() + 1).toString().padStart(2, '0');
      const d = start.getDate().toString().padStart(2, '0');
      const hh = start.getHours().toString().padStart(2, '0');
      const mm = start.getMinutes().toString().padStart(2, '0');
      setTransferDialog({ open: true, apptId: appointment.id, date: `${y}-${m}-${d}`, time: `${hh}:${mm}`, counselorId: '' });

      // Load available counselors for this window
      const startStr = `${y}-${m}-${d} ${hh}:${mm}`;
      const endDate = new Date(y, (parseInt(m) - 1), parseInt(d), parseInt(hh) + 1, parseInt(mm), 0);
      const endYear = endDate.getFullYear();
      const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
      const endDay = endDate.getDate().toString().padStart(2, '0');
      const endHour = endDate.getHours().toString().padStart(2, '0');
      const endMinute = endDate.getMinutes().toString().padStart(2, '0');
      const endStr = `${endYear}-${endMonth}-${endDay} ${endHour}:${endMinute}`;
      const available = await api.get(`/api/dashboard/counselors/available?start_ts=${encodeURIComponent(startStr)}&end_ts=${encodeURIComponent(endStr)}`);
      setCounselors(available);
    } catch (e) {
      console.error('Error opening transfer dialog:', e);
      setError('Failed to open transfer dialog');
    }
  }

  async function submitTransfer() {
    try {
      const { apptId, date, time, counselorId } = transferDialog;
      if (!apptId || !date || !time) {
        setError('Please provide date and time');
        return;
      }
      const new_start_ts = `${date} ${time}`;

      // Compute end time (1 hour later) on client for convenience
      const [Y, M, D] = date.split('-').map(Number);
      const [h, m] = time.split(':').map(Number);
      const endDate = new Date(Y, (M - 1), D, h + 1, m, 0);
      const endYear = endDate.getFullYear();
      const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
      const endDay = endDate.getDate().toString().padStart(2, '0');
      const endHour = endDate.getHours().toString().padStart(2, '0');
      const endMinute = endDate.getMinutes().toString().padStart(2, '0');
      const new_end_ts = `${endYear}-${endMonth}-${endDay} ${endHour}:${endMinute}`;

      await api.post(`/api/dashboard/appointments/${apptId}/transfer`, {
        new_start_ts,
        new_end_ts,
        new_counselor_id: counselorId || undefined,
      });

      setSuccessMessage('✅ Appointment transferred!');
      setError(null);
      setTransferDialog({ open: false, apptId: null, date: '', time: '', counselorId: '' });
      await loadAppointments();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error transferring appointment:', err);
      setError('Failed to transfer appointment');
    }
  }

  function closeTransfer() {
    setTransferDialog({ open: false, apptId: null, date: '', time: '', counselorId: '' });
  }

  const formatDate = (dateString) => {
    // Parse the date - it's already in Nairobi time from the database
    const date = new Date(dateString);
    
    // Use local time methods since the database stores Nairobi time
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const formattedMinute = minute.toString().padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    
    return `${monthNames[month]} ${day}, ${year}, ${displayHour}:${formattedMinute} ${ampm}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#28a745';
      case 'scheduled': return '#ffc107';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  async function postponeAppointment(id) {
    const newDate = prompt("Enter new date in Nairobi time (YYYY-MM-DD HH:mm):\nExample: 2025-09-20 15:30");
    if (!newDate) return;
    
    // Validate the date format before sending
    const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
    if (!dateRegex.test(newDate.trim())) {
      setError("Invalid date format. Please use YYYY-MM-DD HH:mm");
      return;
    }
    
    try {
      // Create date in Nairobi time (database stores Nairobi time)
      const [datePart, timePart] = newDate.trim().split(' ');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      
      // Create date in Nairobi time directly
      const nairobiDate = new Date(
        parseInt(year), 
        parseInt(month) - 1, 
        parseInt(day), 
        parseInt(hour), 
        parseInt(minute)
      );
      
      // Format as Nairobi time string (same format as backend expects)
      const yearStr = nairobiDate.getFullYear();
      const monthStr = (nairobiDate.getMonth() + 1).toString().padStart(2, '0');
      const dayStr = nairobiDate.getDate().toString().padStart(2, '0');
      const hourStr = nairobiDate.getHours().toString().padStart(2, '0');
      const minuteStr = nairobiDate.getMinutes().toString().padStart(2, '0');
      const nairobiDateString = `${yearStr}-${monthStr}-${dayStr} ${hourStr}:${minuteStr}`;
      
      // Calculate end time (assuming 1 hour duration)
      const endDate = new Date(nairobiDate.getTime() + 60 * 60 * 1000);
      const endYearStr = endDate.getFullYear();
      const endMonthStr = (endDate.getMonth() + 1).toString().padStart(2, '0');
      const endDayStr = endDate.getDate().toString().padStart(2, '0');
      const endHourStr = endDate.getHours().toString().padStart(2, '0');
      const endMinuteStr = endDate.getMinutes().toString().padStart(2, '0');
      const endDateString = `${endYearStr}-${endMonthStr}-${endDayStr} ${endHourStr}:${endMinuteStr}`;
      
      await api.post(`/api/dashboard/appointments/${id}/postpone`, { 
        new_start_ts: nairobiDateString,
        new_end_ts: endDateString
      });
      
      setSuccessMessage("✅ Appointment postponed!");
      setError(null);
      
      // Force reload appointments immediately
      await loadAppointments();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error postponing appointment:", err);
      setError("Failed to postpone appointment");
    }
  }

  async function deleteAppointment(id) {
    if (!window.confirm("Permanently delete this canceled appointment?")) {
      return;
    }
    
    try {
      await api.delete(`/api/dashboard/appointments/${id}/delete`);
      setSuccessMessage("✅ Appointment deleted!");
      setError(null);
      loadAppointments();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error deleting appointment:", err);
      setError("Failed to delete appointment");
    }
  }

  async function completeSession(id) {
    const sessionNotes = prompt("Add session notes (optional):");
    if (sessionNotes === null) return; // User cancelled
    
    try {
      await api.post(`/api/dashboard/appointments/${id}/complete`, { session_notes: sessionNotes });
      setSuccessMessage("✅ Session marked as completed! Client will receive review request.");
      setError(null);
      loadAppointments();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error completing session:", err);
      if (err.message.includes('No authentication token')) {
        setError("Session expired. Please log in again.");
        handleAuthError();
      } else {
        setError("Failed to complete session");
      }
    }
  }

  async function markNoShow(id) {
    if (!window.confirm("Mark this appointment as no-show? Client will be notified.")) {
      return;
    }
    
    try {
      await api.post(`/api/dashboard/appointments/${id}/no-show`);
      setSuccessMessage("✅ Marked as no-show! Client has been notified.");
      setError(null);
      loadAppointments();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error marking no-show:", err);
      if (err.message.includes('No authentication token')) {
        setError("Session expired. Please log in again.");
        handleAuthError();
      } else {
        setError("Failed to mark no-show");
      }
    }
  }

  useEffect(() => {
    loadAppointments();
    loadReviews();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading appointments...</p>
      </div>
    );
  }

  const cardStyle = {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: 'var(--shadow)',
    marginBottom: '1rem'
  };

  const buttonStyle = {
    backgroundColor: 'var(--btn-primary)',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  };

  const deleteButtonStyle = {
    backgroundColor: 'var(--btn-danger)',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  };

  const statusBadgeStyle = (status) => ({
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    backgroundColor: status === 'cancelled' ? 'var(--btn-danger)' : 
                    status === 'confirmed' ? 'var(--btn-success)' : 'var(--btn-warning)',
    color: 'white'
  });

  // Section grouping helpers
  const getStartDate = (a) => new Date(a.start_ts || a.appointment_date);
  const getEndDate = (a) => new Date(a.end_ts || a.end_date || a.start_ts || a.appointment_date);
  const now = new Date();
  const isPaid = (a) => (a.payment_status || '').toLowerCase() === 'paid';
  const isUnpaid = (a) => (a.payment_status || 'pending').toLowerCase() !== 'paid';
  const isCancelled = (a) => (a.status || '').toLowerCase() === 'cancelled';

  const upcomingPaid = appointments.filter(a => isPaid(a) && !isCancelled(a) && getStartDate(a) >= now);
  const bookedUnpaid = appointments.filter(a => isUnpaid(a) && !isCancelled(a) && getStartDate(a) >= now);
  const doneSessions = appointments.filter(a => {
    const end = getEndDate(a);
    const st = (a.status || '').toLowerCase();
    const ps = (a.payment_status || '').toLowerCase();
    return (end < now) || st === 'completed' || st === 'cancelled' || ps === 'refunded';
  });

  // Notification items: refund requests + new appointment requests (unpaid & upcoming)
  const newRequests = bookedUnpaid.map(a => ({
    type: 'new_appointment',
    id: a.id,
    title: `New appointment request from ${a.client_name || a.student_name || '#' + (a.client_id || a.student_id)}`,
    detail: `${formatDate(a.start_ts || a.appointment_date)} → ${formatDate(a.end_ts || a.end_date)} | Payment: ${a.payment_method || 'N/A'} (${a.payment_status || 'not yet paid'})`
  }));
  const refundNotices = (refunds || []).map(r => ({
    type: 'refund',
    id: r.id,
    title: `Refund request for appointment ${r.appointment_id}`,
    detail: r.reason || 'No reason provided'
  }));
  const allNotices = [...newRequests, ...refundNotices].filter(n => !dismissedNoticeIds.has(`${n.type}:${n.id}`));
  const clearAllNotices = () => {
    const next = new Set(dismissedNoticeIds);
    allNotices.forEach(n => next.add(`${n.type}:${n.id}`));
    setDismissedNoticeIds(next);
    setNotificationsOpen(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link 
          to="/" 
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            backgroundColor: "var(--btn-secondary)",
            color: "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "var(--btn-secondary-hover)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "var(--btn-secondary)";
          }}
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </Link>
      </div>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{
          color: "var(--text-primary)",
          fontSize: "28px",
          fontWeight: "700",
          margin: 0
        }}>📅 Appointments Management</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Notifications bell */}
          <button
            onClick={() => setNotificationsOpen((o) => !o)}
            title={`Notifications (${allNotices.length})`}
            style={{ backgroundColor: allNotices.length ? 'var(--btn-warning)' : 'var(--btn-secondary)', color: 'white', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer' }}
          >
            🔔 {allNotices.length}
          </button>
          {notificationsOpen && (
            <div style={{ position: 'absolute', right: '2rem', top: '5rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: 'var(--shadow)', width: '420px', maxHeight: '60vh', overflowY: 'auto', zIndex: 10 }}>
              <div style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Notifications</strong>
                <button onClick={clearAllNotices} style={{ background: 'var(--btn-danger)', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Clear all</button>
              </div>
              {allNotices.length === 0 ? (
                <div style={{ padding: '10px', color: 'var(--text-muted)' }}>No notifications</div>
              ) : (
                allNotices.map(n => (
                  <div key={`${n.type}:${n.id}`} style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{n.detail}</div>
                    <div style={{ marginTop: '6px' }}>
                      <button onClick={() => setDismissedNoticeIds(prev => new Set(prev).add(`${n.type}:${n.id}`))} style={{ background: 'var(--btn-secondary)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Dismiss</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sessions:</label>
          <select
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'pending') {
                const el = document.getElementById('section-pending'); if (el) el.scrollIntoView({ behavior: 'smooth' });
              } else if (v === 'unpaid') {
                const el = document.getElementById('section-unpaid'); if (el) el.scrollIntoView({ behavior: 'smooth' });
              } else if (v === 'done') {
                const el = document.getElementById('section-done'); if (el) el.scrollIntoView({ behavior: 'smooth' });
              } else if (v === 'mentorship') {
                window.location.href = '/mentorships';
              }
              e.target.value = '';
            }}
            defaultValue=""
            style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
          >
            <option value="" disabled>Select…</option>
            <option value="pending">Pending (Paid)</option>
            <option value="unpaid">Booked (Unpaid)</option>
            <option value="done">Done Sessions</option>
            <option value="mentorship">Mentorship Session</option>
          </select>
          <Link
            to="/mentorships"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--btn-secondary)',
              color: 'white',
              textDecoration: 'none',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px'
            }}
          >
            🧑‍🏫 Mentorships
          </Link>
          <button
            onClick={loadAppointments}
            style={buttonStyle}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
      
      {error && (
        <div style={{
          backgroundColor: "var(--alert-danger)",
          color: "var(--alert-danger-text)",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "1.5rem",
          border: "1px solid var(--border-color)"
        }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div style={{
          backgroundColor: "var(--alert-success)",
          color: "var(--alert-success-text)",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "1.5rem",
          border: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            style={{
              background: "none",
              border: "none",
              color: "var(--alert-success-text)",
              fontSize: "18px",
              cursor: "pointer",
              padding: "0",
              marginLeft: "10px"
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('appointments')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'appointments' ? 'var(--btn-primary)' : 'transparent',
            color: activeTab === 'appointments' ? 'white' : 'var(--text-primary)',
            border: 'none',
            borderBottom: activeTab === 'appointments' ? '2px solid var(--btn-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          📅 Appointments
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'reviews' ? 'var(--btn-primary)' : 'transparent',
            color: activeTab === 'reviews' ? 'white' : 'var(--text-primary)',
            border: 'none',
            borderBottom: activeTab === 'reviews' ? '2px solid var(--btn-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          ⭐ Reviews ({reviews.length})
        </button>
      </div>

      {activeTab === 'appointments' && (
        <>
          {appointments.length === 0 ? (
            <div style={{
              backgroundColor: "var(--card-bg)",
              padding: "2rem",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
              textAlign: "center",
              boxShadow: "var(--shadow)"
            }}>
              <p style={{ color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
                No appointments found.
              </p>
            </div>
          ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Pending (Paid & Upcoming) */}
          <section id="section-pending">
            <h2 style={{ color: 'var(--text-secondary)', margin: 0 }}>Pending (Paid & Upcoming)</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: '0.75rem' }}>
              {upcomingPaid.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No paid upcoming appointments.</div>
              )}
              {upcomingPaid.map((appointment) => (
                <div key={appointment.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: "0 0 8px 0", fontWeight: "500", fontSize: "16px", color: "var(--text-primary)" }}>
                        {appointment.client_name || appointment.student_name ? (
                          <>Client: {appointment.client_name || appointment.student_name}</>
                        ) : (
                          <>Client: #{appointment.client_id || appointment.student_id}</>
                        )}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>ID: {appointment.id}</p>
                      <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                        {formatDate(appointment.start_ts || appointment.appointment_date)} → {formatDate(appointment.end_ts || appointment.end_date)}
                      </p>
                      <div style={statusBadgeStyle(appointment.status || 'pending')}>
                        {appointment.status || 'pending'}
                      </div>
                      <details style={{ marginTop: '8px' }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Show details</summary>
                        <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {appointment.client_name && (<div>Name: {appointment.client_name}</div>)}
                          {appointment.client_contact && (<div>Contact: {appointment.client_contact}</div>)}
                          {appointment.session_type && (<div>Session: {appointment.session_type}</div>)}
                          {appointment.session_duration && (<div>Duration: {appointment.session_duration}</div>)}
                          {appointment.payment_method && (<div>Payment: {appointment.payment_method} ({appointment.payment_status || 'not yet paid'})</div>)}
                        </div>
                      </details>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => cancelAppointment(appointment.id)} style={deleteButtonStyle}>Cancel</button>
                      <button onClick={() => postponeAppointment(appointment.id)} style={{ backgroundColor: "var(--btn-warning)", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>Postpone</button>
                      <button onClick={() => openTransfer(appointment)} style={{ backgroundColor: "var(--btn-primary)", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>Transfer</button>
                      {(appointment.session_status === 'scheduled' || !appointment.session_status) && (
                        <>
                          <button onClick={() => completeSession(appointment.id)} style={{ backgroundColor: "var(--btn-success)", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>Complete</button>
                          <button onClick={() => markNoShow(appointment.id)} style={{ backgroundColor: "var(--btn-danger)", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>No Show</button>
                        </>
                      )}
                      {appointment.session_status === 'completed' && (
                        <span style={{ color: "var(--btn-success)", fontSize: "12px", fontWeight: "600" }}>✓ Completed</span>
                      )}
                      {appointment.session_status === 'no_show' && (
                        <span style={{ color: "var(--btn-danger)", fontSize: "12px", fontWeight: "600" }}>✗ No Show</span>
                      )}
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Payment:</label>
                      <select value={(appointment.payment_status || 'paid').toLowerCase()} onChange={(e) => updatePaymentStatus(appointment.id, e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-background)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
                        <option value="paid">paid</option>
                        <option value="pending">unpaid</option>
                        <option value="refunded">refunded</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Booked (Unpaid & Upcoming) */}
          <section id="section-unpaid">
            <h2 style={{ color: 'var(--text-secondary)', margin: 0 }}>Booked (Unpaid)</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: '0.75rem' }}>
              {bookedUnpaid.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No unpaid upcoming appointments.</div>
              )}
              {bookedUnpaid.map((appointment) => (
                <div key={appointment.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: "0 0 8px 0", fontWeight: "500", fontSize: "16px", color: "var(--text-primary)" }}>
                        {appointment.client_name || appointment.student_name ? (
                          <>Client: {appointment.client_name || appointment.student_name}</>
                        ) : (
                          <>Client: #{appointment.client_id || appointment.student_id}</>
                        )}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>ID: {appointment.id}</p>
                      <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                        {formatDate(appointment.start_ts || appointment.appointment_date)} → {formatDate(appointment.end_ts || appointment.end_date)}
                      </p>
                      <div style={statusBadgeStyle(appointment.status || 'pending')}>
                        {appointment.status || 'pending'}
                      </div>
                      <details style={{ marginTop: '8px' }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Show details</summary>
                        <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {appointment.client_name && (<div>Name: {appointment.client_name}</div>)}
                          {appointment.client_contact && (<div>Contact: {appointment.client_contact}</div>)}
                          {appointment.session_type && (<div>Session: {appointment.session_type}</div>)}
                          {appointment.session_duration && (<div>Duration: {appointment.session_duration}</div>)}
                          {appointment.payment_method && (<div>Payment: {appointment.payment_method} ({appointment.payment_status || 'not yet paid'})</div>)}
                        </div>
                      </details>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: 'center' }}>
                      <button onClick={() => cancelAppointment(appointment.id)} style={deleteButtonStyle}>Cancel</button>
                      <button onClick={() => postponeAppointment(appointment.id)} style={{ backgroundColor: "var(--btn-warning)", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>Postpone</button>
                      <button onClick={() => openTransfer(appointment)} style={{ backgroundColor: "var(--btn-primary)", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>Transfer</button>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Payment:</label>
                      <select value={(appointment.payment_status || 'pending').toLowerCase()} onChange={(e) => updatePaymentStatus(appointment.id, e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-background)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
                        <option value="pending">unpaid</option>
                        <option value="paid">paid</option>
                        <option value="refunded">refunded</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Done Sessions */}
          <section id="section-done">
            <h2 style={{ color: 'var(--text-secondary)', margin: 0 }}>Done Sessions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: '0.75rem' }}>
              {doneSessions.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No finished sessions.</div>
              )}
              {doneSessions.map((appointment) => (
                <div key={appointment.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: "0 0 8px 0", fontWeight: "500", fontSize: "16px", color: "var(--text-primary)" }}>
                        Client: {appointment.client_name || appointment.student_name || `#${appointment.client_id || appointment.student_id}`}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>ID: {appointment.id}</p>
                      <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                        {formatDate(appointment.start_ts || appointment.appointment_date)} → {formatDate(appointment.end_ts || appointment.end_date)}
                      </p>
                      <div style={statusBadgeStyle(appointment.status || 'pending')}>
                        {appointment.status || 'pending'}
                      </div>
                      <details style={{ marginTop: '8px' }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Show details</summary>
                        <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {appointment.session_type && (<div>Session: {appointment.session_type}</div>)}
                          {appointment.session_duration && (<div>Duration: {appointment.session_duration}</div>)}
                          {appointment.payment_method && (<div>Payment: {appointment.payment_method} ({appointment.payment_status || 'not yet paid'})</div>)}
                        </div>
                      </details>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: 'center' }}>
                      <button onClick={() => deleteAppointment(appointment.id)} style={deleteButtonStyle}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          </div>
          )}
        </>
      )}

      {activeTab === 'reviews' && (
        <div>
          {reviews.length === 0 ? (
            <div style={{
              backgroundColor: "var(--card-bg)",
              padding: "2rem",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
              textAlign: "center"
            }}>
              <h3 style={{ color: "var(--text-primary)", marginBottom: "1rem" }}>No Reviews Yet</h3>
              <p style={{ color: "var(--text-secondary)" }}>Client reviews will appear here once they complete their sessions and leave feedback.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {reviews.map((review) => (
                <div key={review.id} style={{
                  backgroundColor: "var(--card-bg)",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  boxShadow: "var(--shadow-sm)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <div>
                      <h4 style={{ color: "var(--text-primary)", margin: "0 0 0.5rem 0", fontSize: "16px" }}>
                        {review.client_name}
                      </h4>
                      <p style={{ color: "var(--text-secondary)", margin: "0", fontSize: "14px" }}>
                        Session on {new Date(review.appointment_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "2px" }}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} style={{ color: i < review.rating ? "#fbbf24" : "#d1d5db", fontSize: "18px" }}>
                            ⭐
                          </span>
                        ))}
                      </div>
                      <span style={{ 
                        color: review.session_quality === 'excellent' ? '#10b981' : 
                               review.session_quality === 'good' ? '#3b82f6' :
                               review.session_quality === 'average' ? '#f59e0b' : '#ef4444',
                        fontSize: "12px",
                        fontWeight: "600",
                        textTransform: "uppercase"
                      }}>
                        {review.session_quality}
                      </span>
                    </div>
                  </div>
                  
                  {review.review_text && (
                    <div style={{ marginBottom: "1rem" }}>
                      <p style={{ color: "var(--text-primary)", margin: "0", lineHeight: "1.5" }}>
                        "{review.review_text}"
                      </p>
                    </div>
                  )}
                  
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center", fontSize: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Would recommend:</span>
                      <span style={{ 
                        color: review.would_recommend ? "#10b981" : "#ef4444",
                        fontWeight: "600"
                      }}>
                        {review.would_recommend ? "Yes" : "No"}
                      </span>
                    </div>
                    {review.additional_feedback && (
                      <div style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
                        Additional: {review.additional_feedback}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {transferDialog.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px', width: '420px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Transfer Appointment</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>New Date</label>
                <input type="date" value={transferDialog.date} onChange={(e) => setTransferDialog({ ...transferDialog, date: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div style={{ width: '140px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>New Time</label>
                <input type="time" value={transferDialog.time} onChange={(e) => setTransferDialog({ ...transferDialog, time: e.target.value })} style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Transfer to Therapist (optional)</label>
              <select value={transferDialog.counselorId} onChange={(e) => setTransferDialog({ ...transferDialog, counselorId: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--card-background)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}>
                <option value="">Keep current therapist</option>
                {counselors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={closeTransfer} style={{ background: 'var(--btn-secondary)', border: 'none', padding: '6px 12px', borderRadius: '6px' }}>Cancel</button>
              <button onClick={submitTransfer} style={{ background: 'var(--btn-primary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px' }}>Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
