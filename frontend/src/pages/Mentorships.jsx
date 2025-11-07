import React, { useEffect, useState } from "react";
import NavBar from "../components/NavBar.jsx";
import { fetchWithAuth } from "../utils/api.js";

const currency = (cents) => {
  const amount = (Number(cents || 0) / 100).toFixed(2);
  return `KSh ${amount}`;
};

const Mentorships = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    price_cents: "",
    duration_weeks: "",
    mode: "in-person",
    frequency: "weekly",
    start_date: "",
    counselor_ids: []
  });
  const [counselorRoles, setCounselorRoles] = useState({});
  const [allCounselors, setAllCounselors] = useState([]);
  const [numCounselors, setNumCounselors] = useState(0);

  const loadMyPrograms = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth("/api/mentorships/my-programs");
      setPrograms(Array.isArray(data) ? data : []);
    } catch (e) {
      setError("Failed to load mentorship programs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyPrograms();
    // Load all counselors for multi-assign
    (async () => {
      try {
        const res = await fetchWithAuth("/api/counselors");
        setAllCounselors(Array.isArray(res) ? res : []);
      } catch (_) {}
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const body = {
        ...form,
        price_cents: Number(form.price_cents) || 0,
        duration_weeks: form.duration_weeks ? Number(form.duration_weeks) : null,
        counselor_roles: counselorRoles
      };
      const res = await fetchWithAuth("/api/mentorships", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setForm({ title: "", description: "", price_cents: "", duration_weeks: "", mode: "in-person", frequency: "weekly", start_date: "", counselor_ids: [] });
      setCounselorRoles({});
      setNumCounselors(0);
      await loadMyPrograms();
    } catch (err) {
      setError("Failed to create mentorship program");
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetchWithAuth(`/api/mentorships/${id}`, { method: "DELETE" });
      await loadMyPrograms();
    } catch (err) {
      setError("Failed to delete program");
    }
  };

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 1200, margin: "24px auto", padding: "0 24px" }}>
        <h2 style={{ color: "var(--text-primary)", marginBottom: 16 }}>Mentorship Programs</h2>

        {error && (
          <div style={{ marginBottom: 16, color: "#b00020" }}>{error}</div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          alignItems: "start"
        }}>
          {/* Create form */}
          <form onSubmit={handleSubmit} style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: 12,
            padding: 20,
            boxShadow: "var(--shadow)",
            minHeight: 520
          }}>
            <h3 style={{ marginTop: 0, color: "var(--text-primary)" }}>Add Program</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>Title</label>
                <input name="title" value={form.title} onChange={handleChange} required style={{ width: "100%", height: 40, fontSize: 14 }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={6} style={{ width: "100%", fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>Price (KSh cents)</label>
                <input name="price_cents" type="number" value={form.price_cents} onChange={handleChange} min="0" required style={{ width: "100%", height: 40, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>Duration (weeks)</label>
                <input name="duration_weeks" type="number" value={form.duration_weeks} onChange={handleChange} min="1" style={{ width: "100%", height: 40, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>Mode</label>
                <select name="mode" value={form.mode} onChange={handleChange} style={{ width: "100%", height: 40, fontSize: 14, padding: "8px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--card-background)", color: "var(--text-primary)", outline: "none" }}>
                  <option value="in-person">In-person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>Frequency</label>
                <select name="frequency" value={form.frequency} onChange={handleChange} style={{ width: "100%", height: 40, fontSize: 14, padding: "8px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--card-background)", color: "var(--text-primary)", outline: "none" }}>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>Start Date</label>
                <input name="start_date" type="date" value={form.start_date} onChange={handleChange} style={{ width: "100%", height: 40, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>Number of Counselors</label>
                <input type="number" min="0" value={numCounselors} onChange={(e) => setNumCounselors(parseInt(e.target.value || '0', 10))} style={{ width: "100%", height: 40, fontSize: 14 }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>Assign Counselors</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, padding: 8, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                  {[...Array(Math.max(numCounselors, 0)).keys()].map((i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                      <select
                        value={form.counselor_ids[i] || ''}
                        onChange={(e) => {
                          const ids = [...form.counselor_ids];
                          ids[i] = e.target.value;
                          setForm(prev => ({ ...prev, counselor_ids: ids }));
                        }}
                        style={{ height: 40, fontSize: 14 }}
                      >
                        <option value="">Select counselor…</option>
                        {allCounselors.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <input 
                        placeholder="Role / What they will do" 
                        value={counselorRoles[form.counselor_ids[i]] || ''}
                        onChange={(e) => {
                          const counselorId = form.counselor_ids[i];
                          if (counselorId) {
                            setCounselorRoles(prev => ({
                              ...prev,
                              [counselorId]: e.target.value
                            }));
                          }
                        }}
                        style={{ height: 40, fontSize: 14 }} 
                      />
                    </div>
                  ))}
                  {allCounselors.length === 0 && (
                    <span style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>No counselors found</span>
                  )}
                </div>
              </div>
            </div>
            <button type="submit" style={{ marginTop: 12, background: "var(--accent-color)", color: "white", border: 0, padding: "10px 14px", borderRadius: 8, cursor: "pointer" }}>
              Create Program
            </button>
          </form>

          {/* List */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h3 style={{ margin: 0, color: "var(--text-primary)" }}>My Programs</h3>
              {loading && <span style={{ color: "var(--text-secondary)" }}>Loading...</span>}
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {programs.map((p) => (
                <div key={p.id} style={{ padding: 16, border: "1px solid var(--border-color)", borderRadius: 12, background: "var(--card-bg)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{p.title}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{p.description || "No description"}</div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>
                        <span style={{ marginRight: 12 }}>{currency(p.price_cents)}</span>
                        {p.duration_weeks ? <span style={{ marginRight: 12 }}>{p.duration_weeks} weeks</span> : null}
                        {p.mode ? <span style={{ marginRight: 12 }}>{p.mode}</span> : null}
                        {p.frequency ? <span style={{ marginRight: 12 }}>{p.frequency}</span> : null}
                        {p.start_date ? <span>Starts {new Date(p.start_date).toLocaleDateString()}</span> : null}
                      </div>
                    </div>
                    <div>
                      <button onClick={() => handleDelete(p.id)} style={{ background: "var(--btn-danger)", color: "#fff", border: 0, padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}>Delete</button>
                    </div>
                  </div>
                  {Array.isArray(p.counselors) && p.counselors.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Counselors:</div>
                      {p.counselors.map((c, idx) => (
                        <div key={idx} style={{ marginLeft: 8, marginBottom: 2 }}>
                          • {c.name}{c.role ? ` - ${c.role}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {programs.length === 0 && !loading && (
                <div style={{ color: "var(--text-secondary)" }}>No programs yet. Create one on the left.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mentorships;


