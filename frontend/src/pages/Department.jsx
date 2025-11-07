import React from "react";

const Department = () => {
  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ 
          color: "var(--text-primary)", 
          marginBottom: "10px",
          fontSize: "28px",
          fontWeight: "600"
        }}>
          🏢 Department Information
        </h1>
        <p style={{ 
          color: "var(--text-secondary)", 
          fontSize: "16px",
          marginBottom: "20px"
        }}>
          View department details, staff information, and organizational structure.
        </p>
      </div>

      <div style={{
        backgroundColor: "var(--card-background)",
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        padding: "40px",
        textAlign: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>🏢</div>
        <h2 style={{ 
          color: "var(--text-primary)", 
          fontSize: "24px",
          fontWeight: "600",
          marginBottom: "12px"
        }}>
          Coming Soon
        </h2>
        <p style={{ 
          color: "var(--text-secondary)", 
          fontSize: "16px",
          marginBottom: "20px"
        }}>
          The department information system is currently under development.
        </p>
        <p style={{ 
          color: "var(--text-secondary)", 
          fontSize: "14px",
          margin: "0"
        }}>
          This feature will provide access to department details, staff directories, and organizational information.
        </p>
      </div>
    </div>
  );
};

export default Department;
