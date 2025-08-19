import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

const AdminOtpVerify = () => {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();

  const handleVerifyOtp = async () => {
    const email = localStorage.getItem("adminEmail");
    try {
      await axios.post("${API_BASE}/admin-otp/verify", { email, otp });
      navigate("/admin");
    } catch (err) {
      alert("Invalid OTP or verification failed.");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Verify Admin OTP</h2>
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
        style={styles.input}
      />
      <button onClick={handleVerifyOtp} style={styles.button}>
        Verify OTP
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
};

export default AdminOtpVerify;
