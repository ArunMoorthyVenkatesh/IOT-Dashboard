import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "./Header";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

const Admin = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState(null);
  const navigate = useNavigate();

  // Fetch pending users on mount
  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE}/admin/pending-users`);
        setPendingUsers(res.data);
      } catch (err) {
        setActionError("Failed to fetch pending users");
        console.error("Failed to fetch pending users", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPendingUsers();
  }, []);

  // Approve handler
  const handleApprove = async (email) => {
    setActionError(null);
    try {
      await axios.post(`${API_BASE}/admin/approve/${email}`);
      setPendingUsers((prev) => prev.filter((user) => user.email !== email));
      alert("User approved and notified via email.");
    } catch (err) {
      setActionError("Failed to approve user.");
      console.error(err);
    }
  };

  // Reject handler
  const handleReject = async (email) => {
    setActionError(null);
    try {
      await axios.post(`${API_BASE}/admin/reject/${email}`);
      setPendingUsers((prev) => prev.filter((user) => user.email !== email));
      alert("User rejected and notified via email.");
    } catch (err) {
      setActionError("Failed to reject user.");
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div style={styles.container}>
      <Header />
      <div style={styles.header}>
        <h2 style={styles.title}>Pending User Approvals</h2>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>

      {loading ? (
        <p style={{ color: "white" }}>Loading...</p>
      ) : actionError ? (
        <p style={{ color: "red" }}>{actionError}</p>
      ) : pendingUsers.length === 0 ? (
        <p style={{ color: "white" }}>No pending users.</p>
      ) : (
        <ul style={styles.list}>
          {pendingUsers.map((user) => (
            <li key={user._id} style={styles.userItem}>
              <span>{user.email}</span>
              <div>
                <button
                  onClick={() => handleApprove(user.email)}
                  style={{ ...styles.button, backgroundColor: "green" }}
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(user.email)}
                  style={{
                    ...styles.button,
                    backgroundColor: "red",
                    marginLeft: "1rem",
                  }}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#000",
    color: "#fff",
    minHeight: "100vh",
    fontFamily: "Times New Roman, Times New Roman, serif",
    padding: "2rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  title: {
    fontSize: "2rem",
  },
  logoutButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#444",
    border: "none",
    borderRadius: "5px",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  list: {
    listStyleType: "none",
    padding: 0,
  },
  userItem: {
    marginBottom: "1rem",
    padding: "1rem",
    border: "1px solid #ccc",
    borderRadius: "8px",
    backgroundColor: "#111",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "5px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Admin;
