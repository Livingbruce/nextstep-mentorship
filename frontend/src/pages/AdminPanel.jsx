import React, { useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import { fetchWithAuth } from "../utils/api.js";
import "../styles/admin.css";

const emptyOverview = {
  stats: {
    counselors: { total: 0, active: 0, pending: 0 },
    appointments: {
      total: 0,
      pending_payments: 0,
      confirmed: 0,
      completed: 0,
    },
    reviews: { total_reviews: 0, avg_rating: 0 },
  },
  recentAppointments: [],
  performance: [],
};

const AdminPanel = () => {
  const [overview, setOverview] = useState(emptyOverview);
  const [pendingCounselors, setPendingCounselors] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [standardPricing, setStandardPricing] = useState([]);
  const [pricingDraft, setPricingDraft] = useState([]);
  const [mentorshipPricing, setMentorshipPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingPricing, setSavingPricing] = useState(false);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [
        overviewData,
        pendingData,
        performanceData,
        standardData,
        mentorshipData,
      ] = await Promise.all([
        fetchWithAuth("/api/admin/overview"),
        fetchWithAuth("/api/admin/counselors/pending"),
        fetchWithAuth("/api/admin/performance"),
        fetchWithAuth("/api/admin/pricing/standard"),
        fetchWithAuth("/api/admin/pricing/mentorship"),
      ]);
      setOverview(overviewData || emptyOverview);
      setPendingCounselors(Array.isArray(pendingData) ? pendingData : []);
      setPerformance(Array.isArray(performanceData) ? performanceData : []);
      setStandardPricing(Array.isArray(standardData) ? standardData : []);
      setPricingDraft(Array.isArray(standardData) ? standardData : []);
      setMentorshipPricing(
        Array.isArray(mentorshipData) ? mentorshipData : []
      );
    } catch (err) {
      console.error("Admin panel load error:", err);
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCounselorAction = async (id, action) => {
    try {
      setError(null);
      await fetchWithAuth(`/api/admin/counselors/${id}/${action}`, {
        method: "POST",
      });
      await loadAdminData();
    } catch (err) {
      console.error(`Counselor ${action} failed`, err);
      setError(err.message || `Failed to ${action} counselor`);
    }
  };

  const updatePricingDraft = (id, amount) => {
    setPricingDraft((prev) =>
    prev.map((item) =>
        item.id === id ? { ...item, amount_cents: parseInt(amount, 10) || 0 } : item
      )
    );
  };

  const savePricing = async () => {
    try {
      setSavingPricing(true);
      setError(null);
      await fetchWithAuth("/api/admin/pricing/standard", {
        method: "PUT",
        body: JSON.stringify({ pricing: pricingDraft }),
      });
      await loadAdminData();
    } catch (err) {
      console.error("Pricing update failed:", err);
      setError(err.message || "Failed to update pricing");
    } finally {
      setSavingPricing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const stats = overview?.stats ?? emptyOverview.stats;
  const leaderboard = performance.slice(0, 10);
  const maxSessions =
    leaderboard.reduce(
      (max, item) => Math.max(max, Number(item.completed_sessions) || 0),
      1
    ) || 1;

  return (
    <div className="admin-panel">
      <header className="admin-panel__header">
        <div>
          <h1>Admin Control Center</h1>
          <p>Monitor counselor activity, approvals, and pricing</p>
        </div>
        <button className="admin-panel__refresh" onClick={loadAdminData}>
          🔄 Refresh
        </button>
      </header>

      {error && <div className="admin-panel__error-banner">{error}</div>}

      <section className="admin-grid">
        <div className="admin-card">
          <p className="admin-card__label">Counselors</p>
          <h2>{stats.counselors?.total ?? 0}</h2>
          <p className="admin-card__meta">
            Active: {stats.counselors?.active ?? 0} · Pending:{" "}
            {stats.counselors?.pending ?? 0}
          </p>
        </div>
        <div className="admin-card">
          <p className="admin-card__label">Appointments</p>
          <h2>{stats.appointments?.total ?? 0}</h2>
          <p className="admin-card__meta">
            Pending payments: {stats.appointments?.pending_payments ?? 0}
          </p>
        </div>
        <div className="admin-card">
          <p className="admin-card__label">Average Rating</p>
          <h2>{Number(stats.reviews?.avg_rating || 0).toFixed(1)}</h2>
          <p className="admin-card__meta">
            {stats.reviews?.total_reviews ?? 0} reviews
          </p>
        </div>
        <div className="admin-card">
          <p className="admin-card__label">Completed Sessions</p>
          <h2>{stats.appointments?.completed ?? 0}</h2>
          <p className="admin-card__meta">
            Confirmed: {stats.appointments?.confirmed ?? 0}
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h3>Performance & Rankings</h3>
            <p>Top counselors by rating and completed sessions</p>
          </div>
        </div>
        <div className="admin-ranking">
          {leaderboard.length === 0 && (
            <p className="admin-empty">No performance data yet.</p>
          )}
          {leaderboard.map((item, index) => {
            const sessions = Number(item.completed_sessions) || 0;
            const rating = Number(item.avg_rating || 0).toFixed(1);
            const width = Math.max((sessions / maxSessions) * 100, 5);
            return (
              <div key={item.id} className="admin-ranking__row">
                <div className="admin-ranking__position">{index + 1}</div>
                <div className="admin-ranking__info">
                  <p className="admin-ranking__name">{item.name}</p>
                  <p className="admin-ranking__meta">
                    {sessions} sessions · {rating} ⭐
                  </p>
                  <div className="admin-ranking__bar">
                    <span style={{ width: `${width}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="admin-split">
        <div className="admin-section">
          <div className="admin-section__header">
            <div>
              <h3>Pending Counselor Approvals</h3>
              <p>Review credentials and approve or reject</p>
            </div>
          </div>
          {pendingCounselors.length === 0 ? (
            <p className="admin-empty">No pending counselor applications.</p>
          ) : (
            <div className="admin-table">
              <div className="admin-table__header">
                <span>Name</span>
                <span>Email</span>
                <span>Specialization</span>
                <span>Actions</span>
              </div>
              {pendingCounselors.map((counselor) => (
                <div key={counselor.id} className="admin-table__row">
                  <span>{counselor.name}</span>
                  <span>{counselor.email}</span>
                  <span>{counselor.specialization || "N/A"}</span>
                  <span className="admin-actions">
                    <button
                      onClick={() =>
                        handleCounselorAction(counselor.id, "approve")
                      }
                    >
                      Approve
                    </button>
                    <button
                      className="admin-actions__reject"
                      onClick={() =>
                        handleCounselorAction(counselor.id, "reject")
                      }
                    >
                      Reject
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-section">
          <div className="admin-section__header">
            <div>
              <h3>Standard Counseling Pricing</h3>
              <p>Adjust global rates for 45/60/90 minute sessions</p>
            </div>
            <button
              onClick={savePricing}
              disabled={savingPricing}
              className="admin-panel__refresh"
            >
              {savingPricing ? "Saving..." : "Save"}
            </button>
          </div>
          {pricingDraft.map((item) => (
            <div key={item.id} className="admin-pricing__row">
              <div>
                <p className="admin-pricing__duration">{item.duration}</p>
                <p className="admin-pricing__meta">
                  Updated {new Date(item.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div className="admin-pricing__input">
                <span>KES</span>
                <input
                  type="number"
                  value={item.amount_cents}
                  onChange={(e) =>
                    updatePricingDraft(item.id, e.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h3>Mentorship Pricing by Counselor</h3>
            <p>Monitor program fees and durations</p>
          </div>
        </div>
        {mentorshipPricing.length === 0 ? (
          <p className="admin-empty">No mentorship programs found.</p>
        ) : (
          <div className="admin-table">
            <div className="admin-table__header">
              <span>Program</span>
              <span>Counselor</span>
              <span>Mode</span>
              <span>Price (KES)</span>
            </div>
            {mentorshipPricing.map((program) => (
              <div key={program.id} className="admin-table__row">
                <span>{program.title}</span>
                <span>{program.counselor_name || "Unknown"}</span>
                <span>{program.mode || "N/A"}</span>
                <span>{program.price_cents}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminPanel;


