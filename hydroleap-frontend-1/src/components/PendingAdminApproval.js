import React, { useEffect, useState } from "react";
import axios from "axios";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

const PendingAdminApprovalSection = () => {
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    fetchCompanyAndPendingAdmins();
  }, []);

  const fetchCompanyAndPendingAdmins = async () => {
    setError("");
    try {
      let profile = localStorage.getItem("profile");
      if (profile) {
        profile = JSON.parse(profile);
        setCompanyName(profile.company_name);
      } else {
        const res = await axios.get(`${API_BASE}/admin/profile`);
        setCompanyName(res.data.company_name);
        localStorage.setItem("profile", JSON.stringify(res.data));
      }
      const res = await axios.get(`${API_BASE}/admin/pending-admins`);
      setPendingAdmins(res.data || []);
    } catch (err) {
      setPendingAdmins([]);
      setError("Unable to fetch pending admins. Please try again later.");
    }
  };

  const filteredAdmins = pendingAdmins.filter((a) => {
    const s = search.toLowerCase();
    const c = companyFilter.toLowerCase();
    const fullName = [
      a.name, a.firstName, a.middleName, a.lastName
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesSearch =
      (fullName && fullName.includes(s)) ||
      (a.email && a.email.toLowerCase().includes(s));

    const matchesCompany =
      c === "" ||
      (a.company_name && a.company_name.toLowerCase().includes(c)) ||
      (a.companyName && a.companyName.toLowerCase().includes(c));

    if (companyName && companyName.toLowerCase() === "hydroleap") {
      return matchesSearch && matchesCompany;
    } else {
      const adminCompany =
        a.company_name || a.companyName || "";
      return (
        adminCompany === companyName &&
        matchesSearch &&
        matchesCompany
      );
    }
  });

  const handleDecision = async (adminId, decision) => {
    try {
      await axios.post(`${API_BASE}/admin/handle-admin-request`, {
        id: adminId,
        action: decision,
      });
      setPendingAdmins((prev) => prev.filter((a) => a.admin_id !== adminId && a._id !== adminId));
      alert(`Admin ${decision === "approve" ? "approved" : "rejected"} successfully.`);
    } catch (err) {
      alert("Action failed.");
    }
  };

  return (
    <div style={styles.overlay}>
      <h2 style={{ color: "#23c1b5", marginBottom: 16, textAlign: "center" }}>
      </h2>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
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
        onChange={e => setCompanyFilter(e.target.value)}
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
      ) : filteredAdmins.length === 0 ? (
        <p style={styles.info}>No pending admins.</p>
      ) : (
        filteredAdmins.map((admin) => (
          <div key={admin.admin_id || admin._id} style={styles.card}>
            <div style={styles.title}>
              {admin.name ||
                [admin.firstName, admin.middleName, admin.lastName]
                  .filter(Boolean)
                  .join(" ") || (
                    <span style={styles.faint}>No Name</span>
                  )}
            </div>
            <div style={styles.detail}>
              <b>Email:</b> {admin.email || <span style={styles.faint}>N/A</span>}
            </div>
            <div style={styles.detail}>
              <b>Phone:</b> {admin.phone || <span style={styles.faint}>N/A</span>}
            </div>
            <div style={styles.detail}>
              <b>DOB:</b> {admin.dob || <span style={styles.faint}>N/A</span>}
            </div>
            <div style={styles.detail}>
              <b>Gender:</b> {admin.gender || <span style={styles.faint}>N/A</span>}
            </div>
            <div style={styles.detail}>
              <b>Company:</b>{" "}
              {admin.company_name || admin.companyName || <span style={styles.faint}>N/A</span>}
            </div>
            {(admin.created_at || admin.createdAt) && (
              <div style={styles.meta}>
                <b>Requested:</b>{" "}
                {new Date(admin.created_at || admin.createdAt).toLocaleDateString()}
              </div>
            )}
            <div style={styles.buttonContainer}>
              <button
                onClick={() => handleDecision(admin.admin_id || admin._id, "approve")}
                style={styles.buttonGreen}
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision(admin.admin_id || admin._id, "reject")}
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

export default PendingAdminApprovalSection;
