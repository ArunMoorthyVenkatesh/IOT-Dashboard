// src/components/LoggedInInfo.js
import React, { useEffect, useState } from "react";
import axios from "axios";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

const LoggedInInfo = () => {
  const [info, setInfo] = useState(null);
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const endpoint = localStorage.getItem("adminToken")
          ? "${API_BASE}/admin/me"
          : "${API_BASE}/user/me";

        const res = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const role = localStorage.getItem("adminToken") ? "Admin" : "User";
        setInfo({ ...res.data, role });
      } catch (err) {
        console.error("Failed to fetch logged-in user info.");
      }
    };

    fetchInfo();
  }, [token]);

  if (!info) return null;

  return (
    <div style={styles.container}>
      <p style={styles.text}><strong>{info.role}</strong>: {info.name} ({info.email})</p>
    </div>
  );
};

const styles = {
  container: {
    position: "absolute",
    top: "15px",
    right: "20px",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: "0.7rem 1.2rem",
    borderRadius: "12px",
    zIndex: 999,
    fontFamily: "'Times New Roman', serif",
    color: "white",
    fontSize: "0.95rem",
  },
  text: {
    margin: 0,
  },
};

export default LoggedInInfo;
