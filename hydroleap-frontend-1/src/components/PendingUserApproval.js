import React, { useEffect, useState } from "react";
import axios from "axios";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

const PendingUserApprovalSection = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    fetchCompanyAndPendingUsers();
  }, []);

  const fetchCompanyAndPendingUsers = async () => {
    setError("");
    try {
      // Fetch current admin's company from localStorage if available, else backend
      let profile = localStorage.getItem("profile");
      if (profile) {
        profile = JSON.parse(profile);
        setCompanyName(profile.company_name);
      } else {
        const res = await axios.get(`${API_BASE}/admin/profile`);
        setCompanyName(res.data.company_name);
        localStorage.setItem("profile", JSON.stringify(res.data));
      }
      // Fetch all pending users
      const res = await axios.get(`${API_BASE}/admin/pending-users`);
      setPendingUsers(res.data || []);
    } catch (err) {
      setPendingUsers([]);
      setError("Unable to fetch pending users. Please try again later.");
    }
  };

  // Filtering logic
  const filteredUsers = pendingUsers.filter((u) => {
    const s = search.toLowerCase();
    const c = companyFilter.toLowerCase();

    // For name/email search: fullName (first/middle/last) or email
    const fullName = [
      u.name, u.firstName, u.middleName, u.lastName
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesSearch =
      (fullName && fullName.includes(s)) ||
      (u.email && u.email.toLowerCase().includes(s));

    const matchesCompany =
      c === "" ||
      (u.company_name && u.company_name.toLowerCase().includes(c)) ||
      (u.companyName && u.companyName.toLowerCase().includes(c));

    // Hydroleap sees all pending users, others only their company
    if (companyName && companyName.toLowerCase() === "hydroleap") {
      return matchesSearch && matchesCompany;
    } else {
      // Pending user may have companyName or company_name
      const userCompany =
        u.company_name || u.companyName || "";
      return (
        userCompany === companyName &&
        matchesSearch &&
        matchesCompany
      );
    }
  });

  const handleApprove = async (userId) => {
    try {
      await axios.post(`${API_BASE}/admin/handle-user-request`, {
        id: userId,
        action: "approve",
      });
      setPendingUsers((prev) => prev.filter((u) => u.user_id !== userId && u._id !== userId));
      alert("✅ User approved and added to active users.");
    } catch (err) {
      alert("Failed to approve user");
    }
  };

  const handleReject = async (userId) => {
    try {
      await axios.post(`${API_BASE}/admin/handle-user-request`, {
        id: userId,
        action: "reject",
      });
      setPendingUsers((prev) => prev.filter((u) => u.user_id !== userId && u._id !== userId));
      alert("❌ User rejected and removed from pending list.");
    } catch (err) {
      alert("Failed to reject user");
    }
  };

  return (
    <div style={styles.overlay}>
      <h2 style={{ color: "#23c1b5", marginBottom: 16, textAlign: "center" }}>
      </h2>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        style={{
          padding: "10px 14px",
          fontSize: 16,
          borderRadius: 8,
          border: "1.5px solid #21c6bc",
          marginBottom: 12,
          width: "100%",
          boxSizing: "border-box",
        }}
      />

      <input
        type="text"
        value={companyFilter}
        onChange={(e) => setCompanyFilter(e.target.value)}
        placeholder="Filter by company name…"
        style={{
          padding: "10px 14px",
          fontSize: 16,
          borderRadius: 8,
          border: "1.5px solid #21c6bc",
          marginBottom: 24,
          width: "100%",
          boxSizing: "border-box",
        }}
      />

      <div style={{ marginBottom: 14, color: "#555", fontSize: 15 }}>
        <b>Your Company:</b>{" "}
        <span style={{ color: "#16a59e" }}>
          {companyName || "…"}
        </span>
      </div>

      {error ? (
        <p style={styles.error}>{error}</p>
      ) : filteredUsers.length === 0 ? (
        <p style={styles.info}>No pending users.</p>
      ) : (
        filteredUsers.map((user) => (
          <div key={user.user_id || user._id} style={styles.card}>
            <div style={styles.title}>
              {user.name ||
                [user.firstName, user.middleName, user.lastName]
                  .filter(Boolean)
                  .join(" ") || (
                    <span style={styles.faint}>No Name</span>
                  )}
            </div>
            <div style={styles.detail}>
              <b>Email:</b> {user.email || <span style={styles.faint}>N/A</span>}
            </div>
            <div style={styles.detail}>
              <b>Phone:</b> {user.phone || <span style={styles.faint}>N/A</span>}
            </div>
            <div style={styles.detail}>
              <b>DOB:</b> {user.dob || <span style={styles.faint}>N/A</span>}
            </div>
            <div style={styles.detail}>
              <b>Gender:</b> {user.gender || <span style={styles.faint}>N/A</span>}
            </div>
            <div style={styles.detail}>
              <b>Company:</b>{" "}
              {user.company_name || user.companyName || <span style={styles.faint}>N/A</span>}
            </div>
            {(user.created_at || user.createdAt) && (
              <div style={styles.meta}>
                <b>Requested:</b>{" "}
                {new Date(user.created_at || user.createdAt).toLocaleDateString()}
              </div>
            )}
            <div style={styles.buttonContainer}>
              <button
                onClick={() => handleApprove(user.user_id || user._id)}
                style={styles.buttonGreen}
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(user.user_id || user._id)}
                style={styles.buttonRed}
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const styles = {
  overlay: {
    padding: "2rem",
    color: "#222",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: "18px",
    boxShadow: "0 2px 18px rgba(30, 200, 180, 0.06)",
    maxWidth: "580px",
    margin: "0 auto"
  },
  title: {
    fontWeight: 700,
    fontSize: 21,
    color: "#23c1b5",
    marginBottom: 3,
  },
  detail: {
    color: "#376872",
    fontSize: 15,
    marginBottom: 2,
  },
  meta: {
    color: "#6d8996",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 6,
  },
  faint: {
    color: "#aaa",
    fontWeight: 400,
    fontStyle: "italic",
  },
  card: {
    backgroundColor: "#f8ffff",
    padding: "1.5rem",
    borderRadius: "10px",
    marginBottom: "1.5rem",
    boxShadow: "0 0 10px rgba(30,200,180,0.06)",
  },
  error: {
    color: "red",
    textAlign: "center",
  },
  info: {
    textAlign: "center",
    color: "#555"
  },
  buttonContainer: {
    marginTop: "1rem",
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
  },
  buttonGreen: {
    backgroundColor: "#23c1b5",
    color: "white",
    padding: "0.5rem 1.5rem",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: 600,
  },
  buttonRed: {
    backgroundColor: "salmon",
    color: "white",
    padding: "0.5rem 1.5rem",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: 600,
  },
};

export default PendingUserApprovalSection;
