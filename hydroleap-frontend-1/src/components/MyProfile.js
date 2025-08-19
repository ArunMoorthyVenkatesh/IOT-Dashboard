import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";

const MyProfile = () => {
  const [adminEmail, setAdminEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const email = localStorage.getItem("adminEmail");
    if (email) {
      setAdminEmail(email);
    } else {
      navigate("/admin-login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("adminEmail");
    navigate("/");
  };

  return (
    <div style={styles.page}>
      <Header />
      <div style={styles.container}>

        {/* Back Button */}
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          ← Back
        </button>

        <h2 style={styles.title}>Admin Profile</h2>
        <p style={styles.label}>Logged in as:</p>
        <p style={styles.email}>{adminEmail}</p>
        <button onClick={handleLogout} style={styles.button}>Logout</button>
      </div>
    </div>
  );
};

const styles = {
  page: {
    backgroundColor: "#000",
    color: "#fff",
    height: "100vh",
    fontFamily: "Times New Roman, serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "5rem",
  },
  container: {
    width: "400px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: "1rem",
    marginLeft: "-5rem",
    background: "none",
    border: "none",
    color: "#21c6bc",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  title: {
    fontSize: "1.8rem",
    marginBottom: "1rem",
  },
  label: {
    fontSize: "1rem",
    marginBottom: "0.25rem",
  },
  email: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    marginBottom: "1.5rem",
  },
  button: {
    padding: "0.75rem",
    backgroundColor: "#888",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default MyProfile;
