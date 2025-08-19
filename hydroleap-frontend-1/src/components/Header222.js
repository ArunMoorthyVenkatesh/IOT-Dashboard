// src/components/Header222.js
import React, { useEffect, useState } from "react";
import axios from "axios";

const Header = () => {
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const fetchAdminDetails = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        if (!token) return;

const res = await axios.get(`${process.env.REACT_APP_API_BASE}/admin/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setAdmin(res.data);
      } catch (err) {
        console.error("Failed to fetch admin details:", err.message);
      }
    };

    fetchAdminDetails();
  }, []);

  return (
    <div style={styles.container}>
      {admin && (
        <div style={styles.text}>
          <p><strong>Name:</strong> {admin.firstName} {admin.lastName} (Admin)</p>
          <p><strong>Email:</strong> {admin.email}</p>
        </div>
      )}
    </div>
  );
  
  
};

const styles = {
  container: {
    position: "absolute",
    top: "1rem",
    right: "2rem",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "white",
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    fontFamily: "Times New Roman, serif",
    zIndex: 10,
  },
  text: {
    fontSize: "1rem",
  },
};

export default Header;
