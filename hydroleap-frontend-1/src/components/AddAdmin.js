import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "./Header";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

const AddAdmin = () => {
  const [pendingAdmins, setPendingAdmins] = useState([]);

  useEffect(() => {
    const fetchPendingAdmins = async () => {
      try {
        const res = await axios.get(`${API_BASE}/admin/pending-admins`);
        setPendingAdmins(res.data);
      } catch (err) {
        console.error(err);
        alert("❌ Failed to load pending admin requests.");
      }
    };

    fetchPendingAdmins();
  }, []);

  const handleAction = async (id, action) => {
    try {
      const res = await axios.post(`${API_BASE}/admin/${action}-admin/${id}`);
      alert(res.data.message || "✅ Action successful.");
      setPendingAdmins((prev) => prev.filter((admin) => admin._id !== id));
    } catch (err) {
      console.error("❌ Action failed:", err.response || err.message);
      alert(err.response?.data?.message || "❌ Action failed.");
    }
  };

  return (
    <div style={styles.page}>
      <Header />
      <h2 style={styles.title}>Pending Admin Approvals</h2>
      {pendingAdmins.length === 0 ? (
        <p style={styles.noRequests}>No pending admin requests.</p>
      ) : (
        pendingAdmins.map((admin) => (
          <div key={admin._id} style={styles.card}>
            <p><strong>Name:</strong> {admin.firstName} {admin.middleName} {admin.lastName}</p>
            <p><strong>Email:</strong> {admin.email}</p>
            <p><strong>Phone:</strong> {admin.phone}</p>
            <p><strong>DOB:</strong> {admin.dob}</p>
            <p><strong>Gender:</strong> {admin.gender}</p>
            <div style={styles.buttonRow}>
              <button onClick={() => handleAction(admin._id, "approve")} style={styles.accept}>Accept</button>
              <button onClick={() => handleAction(admin._id, "reject")} style={styles.reject}>Reject</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const styles = {
  page: {
    backgroundColor: "#000",
    color: "#fff",
    minHeight: "100vh",
    padding: "2rem",
    fontFamily: "Times New Roman, serif",
  },
  title: {
    textAlign: "center",
    marginBottom: "2rem",
  },
  card: {
    backgroundColor: "#111",
    padding: "1.5rem",
    margin: "1rem auto",
    borderRadius: "8px",
    width: "90%",
    maxWidth: "400px",
    border: "1px solid #444",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "1rem",
  },
  accept: {
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "5px",
    cursor: "pointer",
  },
  reject: {
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "5px",
    cursor: "pointer",
  },
  noRequests: {
    textAlign: "center",
    color: "#bbb",
  },
};

export default AddAdmin;
