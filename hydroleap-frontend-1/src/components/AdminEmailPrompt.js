import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

const AdminEmailPrompt = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSendOtp = async () => {
    try {
      await axios.post("${API_BASE}/admin-otp/send", { email });
      localStorage.setItem("adminEmail", email);
      navigate("/verify-admin-otp");
    } catch (err) {
      setError(err.response?.data?.message || "Not authorized as admin.");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Admin Email Verification</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter admin email"
        style={styles.input}
      />
      {error && <div style={styles.error}>{error}</div>}
      <button onClick={handleSendOtp} style={styles.button}>
        Send OTP
      </button>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#000",
    color: "#fff",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Times New Roman, serif",
  },
  title: { fontSize: "1.8rem", marginBottom: "1rem" },
  input: {
    padding: "0.75rem",
    fontSize: "1rem",
    marginBottom: "1rem",
    fontFamily: "Times New Roman, serif",
  },
  button: {
    padding: "0.75rem",
    fontWeight: "bold",
    backgroundColor: "#555",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
  error: { color: "red", marginTop: "0.5rem" },
};

export default AdminEmailPrompt;
