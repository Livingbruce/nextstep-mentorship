import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../utils/AuthContext";
import { getApiBaseUrl } from "../utils/apiConfig.js";

const API_BASE_URL = getApiBaseUrl();

const initialContactState = {
  name: "",
  type: "General",
  phone: "",
  email: "",
  location: "",
  website: "",
  description: "",
  is_primary: false,
  is_urgent: false,
  display_order: ""
};

const getTypeColor = (type) => {
  switch (type) {
    case "Emergency":
      return "#dc2626";
    case "Student Services":
      return "#2563eb";
    case "Administrative":
      return "#7c3aed";
    case "Support":
      return "#0ea5e9";
    default:
      return "#059669";
  }
};

const Contacts = () => {
  const { handleAuthError } = useContext(AuthContext);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newContact, setNewContact] = useState(initialContactState);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Missing authentication token");
        }

        const response = await fetch(`${API_BASE_URL}/api/dashboard/contacts`, {
          credentials: 'include', // Required for CORS with credentials
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          handleAuthError();
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch contacts");
        }

        const data = await response.json();
        setContacts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load contacts:", err);
        setError("Unable to load contact information. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [handleAuthError]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewContact((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setNewContact((prev) => ({
      ...prev,
      [name]: checked
    }));
  };

  const resetForm = () => {
    setNewContact(initialContactState);
    setShowForm(false);
    setSaving(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) {
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Missing authentication token");
      }

      const payload = {
        name: newContact.name.trim(),
        type: newContact.type,
        phone: newContact.phone.trim(),
        email: newContact.email ? newContact.email.trim() : null,
        location: newContact.location ? newContact.location.trim() : null,
        website: newContact.website ? newContact.website.trim() : null,
        description: newContact.description ? newContact.description.trim() : null,
        is_primary: newContact.is_primary,
        is_urgent: newContact.is_urgent,
        display_order:
          newContact.display_order !== "" && !Number.isNaN(Number(newContact.display_order))
            ? Number(newContact.display_order)
            : contacts.length
      };

      const response = await fetch(`${API_BASE_URL}/api/dashboard/contacts`, {
        method: "POST",
        credentials: 'include', // Required for CORS with credentials
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to create contact");
      }

      const createdContact = await response.json();
      setContacts((prev) => [...prev, createdContact]);
      resetForm();
    } catch (err) {
      console.error("Failed to save contact:", err);
      setError("Unable to save contact. Please try again later.");
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this contact?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Missing authentication token");
      }

      const response = await fetch(`${API_BASE_URL}/api/dashboard/contacts/${id}`, {
        method: "DELETE",
        credentials: 'include', // Required for CORS with credentials
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to delete contact");
      }

      setContacts((prev) => prev.filter((contact) => contact.id !== id));
    } catch (err) {
      console.error("Failed to delete contact:", err);
      setError("Unable to delete contact. Please try again later.");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1
          style={{
            color: "var(--text-primary)",
            marginBottom: "10px",
            fontSize: "28px",
            fontWeight: "600"
          }}
        >
          📞 Contact Management
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "16px",
            marginBottom: "20px"
          }}
        >
          Manage the official contact directory used across NextStep Mentorship services.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}
      >
        <h2
          style={{
            color: "var(--text-primary)",
            fontSize: "20px",
            fontWeight: "600",
            margin: "0"
          }}
        >
          Contact Directory ({contacts.length})
        </h2>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          style={{
            padding: "10px 20px",
            backgroundColor: "var(--btn-primary)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "var(--btn-primary-hover)";
            e.target.style.transform = "translateY(-1px)";
            e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "var(--btn-primary)";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
          disabled={loading}
        >
          {showForm ? "Cancel" : "+ Add Contact"}
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #fecaca"
          }}
        >
          {error}
        </div>
      )}

      {showForm && (
        <div
          style={{
            backgroundColor: "var(--card-background)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        >
          <h3
            style={{
              color: "var(--text-primary)",
              marginBottom: "20px",
              fontSize: "18px",
              fontWeight: "600"
            }}
          >
            Add New Contact
          </h3>

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "20px",
                marginBottom: "20px"
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                    fontWeight: "500",
                    fontSize: "14px"
                  }}
                >
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={newContact.name}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    backgroundColor: "var(--input-background)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                    fontWeight: "500",
                    fontSize: "14px"
                  }}
                >
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={newContact.phone}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    backgroundColor: "var(--input-background)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                    fontWeight: "500",
                    fontSize: "14px"
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={newContact.email}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    backgroundColor: "var(--input-background)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                    fontWeight: "500",
                    fontSize: "14px"
                  }}
                >
                  Type
                </label>
                <select
                  name="type"
                  value={newContact.type}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    backgroundColor: "var(--input-background)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
                >
                  <option value="General">General</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Student Services">Student Services</option>
                  <option value="Administrative">Administrative</option>
                  <option value="Support">Support</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                    fontWeight: "500",
                    fontSize: "14px"
                  }}
                >
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={newContact.location}
                  onChange={handleInputChange}
                  placeholder="e.g. Main Campus, Administration Building"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    backgroundColor: "var(--input-background)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                    fontWeight: "500",
                    fontSize: "14px"
                  }}
                >
                  Website / Link
                </label>
                <input
                  type="text"
                  name="website"
                  value={newContact.website}
                  onChange={handleInputChange}
                  placeholder="https://"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    backgroundColor: "var(--input-background)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                    fontWeight: "500",
                    fontSize: "14px"
                  }}
                >
                  Display Order
                </label>
                <input
                  type="number"
                  name="display_order"
                  value={newContact.display_order}
                  onChange={handleInputChange}
                  placeholder="Optional"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    backgroundColor: "var(--input-background)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "20px",
                alignItems: "center",
                marginBottom: "20px"
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  name="is_primary"
                  checked={newContact.is_primary}
                  onChange={handleCheckboxChange}
                />
                <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                  Mark as primary contact
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  name="is_urgent"
                  checked={newContact.is_urgent}
                  onChange={handleCheckboxChange}
                />
                <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                  Flag as urgent line
                </span>
              </label>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                  fontWeight: "500",
                  fontSize: "14px"
                }}
              >
                Description / Notes
              </label>
              <textarea
                name="description"
                value={newContact.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Office hours, social handles, or additional instructions"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  backgroundColor: "var(--input-background)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "12px 24px",
                  backgroundColor: saving ? "#9ca3af" : "var(--btn-primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.target.style.backgroundColor = "var(--btn-primary-hover)";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = saving ? "#9ca3af" : "var(--btn-primary)";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                {saving ? "Saving..." : "Add Contact"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "var(--btn-secondary)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "var(--btn-secondary-hover)";
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "var(--btn-secondary)";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--text-secondary)"
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
          <p style={{ fontSize: "16px", margin: "0" }}>Loading contact information...</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: "16px" }}>
            {contacts.map((contact) => (
              <div
                key={contact.id}
                style={{
                  backgroundColor: "var(--card-background)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12px"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3
                        style={{
                          color: "var(--text-primary)",
                          fontSize: "18px",
                          fontWeight: "600",
                          margin: "0"
                        }}
                      >
                        {contact.name}
                      </h3>
                      {contact.is_primary && (
                        <span
                          style={{
                            backgroundColor: "#2563eb",
                            color: "white",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: "600"
                          }}
                        >
                          Primary
                        </span>
                      )}
                      {contact.is_urgent && (
                        <span
                          style={{
                            backgroundColor: "#dc2626",
                            color: "white",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: "600"
                          }}
                        >
                          Urgent
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        marginTop: "8px",
                        padding: "4px 8px",
                        backgroundColor: getTypeColor(contact.type),
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500"
                      }}
                    >
                      {contact.type || "General"}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "#fee2e2",
                      color: "#dc2626",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = "#fecaca")}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = "#fee2e2")}
                  >
                    Delete
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                    marginBottom: "12px"
                  }}
                >
                  <div>
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    >
                      📞 Phone:
                    </span>
                    <span
                      style={{
                        color: "var(--text-primary)",
                        fontSize: "14px",
                        marginLeft: "8px"
                      }}
                    >
                      {contact.phone || "Not provided"}
                    </span>
                  </div>
                  {contact.email && (
                    <div>
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "14px",
                          fontWeight: "500"
                        }}
                      >
                        📧 Email:
                      </span>
                      <span
                        style={{
                          color: "var(--text-primary)",
                          fontSize: "14px",
                          marginLeft: "8px"
                        }}
                      >
                        {contact.email}
                      </span>
                    </div>
                  )}
                  {contact.location && (
                    <div>
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "14px",
                          fontWeight: "500"
                        }}
                      >
                        🏢 Location:
                      </span>
                      <span
                        style={{
                          color: "var(--text-primary)",
                          fontSize: "14px",
                          marginLeft: "8px"
                        }}
                      >
                        {contact.location}
                      </span>
                    </div>
                  )}
                  {contact.website && (
                    <div>
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "14px",
                          fontWeight: "500"
                        }}
                      >
                        🌐 Website:
                      </span>
                      <a
                        href={contact.website}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "var(--primary-color)",
                          fontSize: "14px",
                          marginLeft: "8px",
                          textDecoration: "underline"
                        }}
                      >
                        {contact.website}
                      </a>
                    </div>
                  )}
                </div>

                {contact.description && (
                  <div>
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    >
                      📝 Notes:
                    </span>
                    <p
                      style={{
                        color: "var(--text-primary)",
                        fontSize: "14px",
                        margin: "4px 0 0 0",
                        lineHeight: "1.4"
                      }}
                    >
                      {contact.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {contacts.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "var(--text-secondary)"
              }}
            >
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>📞</div>
              <h3
                style={{
                  fontSize: "20px",
                  marginBottom: "8px",
                  color: "var(--text-primary)"
                }}
              >
                Contact information coming soon
              </h3>
              <p style={{ fontSize: "16px", margin: "0" }}>
                Add your first contact to make it visible across the platform.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Contacts;
