import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/bookingForm.css";

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingData = location.state?.bookingData;

  useEffect(() => {
    // If no booking data, redirect back to booking form
    if (!bookingData) {
      navigate("/booking");
    }
  }, [bookingData, navigate]);

  if (!bookingData) {
    return null;
  }

  return (
    <div className="booking-page">
      <div className="booking-card" style={{ maxWidth: "700px", margin: "2rem auto" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
          <h1 style={{ color: "#1a202c", marginBottom: "1rem", fontSize: "2rem", fontWeight: "700" }}>
            Your Appointment is Being Processed
          </h1>
          <p style={{ color: "#2d3748", fontSize: "1.1rem", lineHeight: "1.6", marginBottom: "2rem" }}>
            Thank you for submitting your booking request. We have received your information and are processing your appointment.
          </p>

          <div style={{ 
            background: "#1e3a8a", 
            padding: "1.5rem", 
            borderRadius: "8px", 
            marginBottom: "2rem",
            textAlign: "left",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
          }}>
            <h2 style={{ color: "#ffffff", marginBottom: "1rem", fontSize: "1.2rem", fontWeight: "600" }}>
              Booking Details
            </h2>
            <div style={{ color: "#ffffff", lineHeight: "1.8" }}>
              {bookingData.appointmentCode && (
                <div><strong>Appointment Code:</strong> {bookingData.appointmentCode}</div>
              )}
              {bookingData.counselor && (
                <div><strong>Counselor:</strong> {bookingData.counselor}</div>
              )}
              {bookingData.appointmentDate && (
                <div><strong>Scheduled Date:</strong> {new Date(bookingData.appointmentDate).toLocaleString('en-KE', {
                  timeZone: 'Africa/Nairobi',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}</div>
              )}
            </div>
          </div>

          <div style={{ 
            background: "#ebf8ff", 
            padding: "1.5rem", 
            borderRadius: "8px", 
            marginBottom: "2rem",
            borderLeft: "4px solid #3182ce",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)"
          }}>
            <h3 style={{ color: "#1a202c", marginBottom: "0.75rem", fontSize: "1.1rem", fontWeight: "600" }}>
              What Happens Next?
            </h3>
            <ul style={{ 
              color: "#2d3748", 
              lineHeight: "1.8", 
              textAlign: "left",
              paddingLeft: "1.5rem",
              margin: 0
            }}>
              <li>Our team will review your booking request</li>
              <li>You will receive a confirmation message via email and/or Telegram once your appointment is approved</li>
              <li>Payment confirmation will be sent after your payment is verified</li>
              <li>You will receive reminders 1 day and 1 hour before your appointment</li>
            </ul>
          </div>

          <div style={{ 
            background: "#f0f4f8", 
            padding: "1.5rem", 
            borderRadius: "8px", 
            marginBottom: "2rem",
            border: "1px solid #cbd5e0"
          }}>
            <p style={{ color: "#2d3748", marginBottom: "0.5rem", fontWeight: "600" }}>
              <strong>Need to make changes?</strong>
            </p>
            <p style={{ color: "#4a5568", fontSize: "0.9rem" }}>
              Please contact us at{" "}
              <a href="mailto:nextstepmentorship@gmail.com" style={{ color: "var(--btn-primary)" }}>
                nextstepmentorship@gmail.com
              </a>{" "}
              or call +254 712 345 678
            </p>
          </div>

          <button
            onClick={() => navigate("/booking")}
            style={{
              background: "var(--btn-primary)",
              color: "white",
              border: "none",
              padding: "0.75rem 2rem",
              borderRadius: "6px",
              fontSize: "1rem",
              cursor: "pointer",
              fontWeight: "500",
              marginTop: "1rem"
            }}
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;

