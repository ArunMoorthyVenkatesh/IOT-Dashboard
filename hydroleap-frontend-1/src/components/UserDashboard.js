// src/components/UserDashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";

const ACCENT = "#21c6bc";

const UserDashboard = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  const navigate = useNavigate();

  // Fetch user info from localStorage.profile
  const fetchUserInfo = () => {
    let profile = localStorage.getItem("profile");
    let name = "";
    let email = "";
    if (profile) {
      try {
        profile = JSON.parse(profile);
        name = profile.name ||
          `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
        email = profile.email || "";
      } catch {
        name = "";
        email = "";
      }
    }
    setUserInfo({ name, email });
  };

  useEffect(() => {
    // Welcome splash for 1.5s
    const t = setTimeout(() => setShowWelcome(false), 1500);

    fetchUserInfo();

    // Optionally update if user info changes in other tabs
    const onStorage = () => fetchUserInfo();
    window.addEventListener("storage", onStorage);

    return () => {
      clearTimeout(t);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("profile");
    localStorage.removeItem("role");
    navigate("/login");
  };

  if (showWelcome) {
    return (
      <div style={styles.container}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h2
            style={{
              color: ACCENT,
              fontSize: "2.7rem",
              fontWeight: 700,
              textShadow: "0 2px 18px #c5f5f1, 0 2px 5px rgba(40,180,170,0.18)",
            }}
          >
            Hi, welcome to user dashboard.
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.userInfoBox}>
        <div style={styles.nameBox}>
          <span style={styles.name}>{userInfo.name || "User"}</span>
        </div>
        <div style={styles.emailBox}>
          <span style={styles.email}>{userInfo.email || ""}</span>
        </div>
      </div>

      <div style={styles.content}>
        <Header />
        <h2 style={styles.title}>User Dashboard</h2>
        <div style={styles.grid}>
          <div
            style={styles.card}
            onClick={() => navigate("/profile")}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <h3 style={styles.cardTitle}>My Information</h3>
            <p style={styles.cardText}>View and manage your user profile</p>
          </div>
          <div
            style={styles.card}
            onClick={() => navigate("/user/projects")}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <h3 style={styles.cardTitle}>My Projects</h3>
            <p style={styles.cardText}>See your assigned or created projects</p>
          </div>
        </div>
        <div style={styles.logoutWrapper}>
          <button
            onClick={handleLogout}
            style={styles.logoutButton}
            onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.93)")}
            onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: "relative",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #e6fcfa 0%, #fafdff 100%)",
    fontFamily: "'Times New Roman', serif",
  },
  userInfoBox: {
    position: "absolute",
    top: "1.1rem",
    right: "2.1rem",
    zIndex: 1000,
    textAlign: "right",
    background: "rgba(255,255,255,0.92)",
    borderRadius: "13px",
    padding: "0.7rem 1.5rem 0.7rem 2.5rem",
    boxShadow: "0 4px 16px #c6f6f8",
    minWidth: 170,
    minHeight: 56,
  },
  nameBox: {
    fontSize: "1.16rem",
    fontWeight: 700,
    color: "#185754",
    marginBottom: "-2px",
    letterSpacing: "0.01em",
  },
  name: {
    fontWeight: 800,
    fontSize: "1.19rem",
    color: "#21c6bc",
    fontFamily: "Georgia, serif",
    textShadow: "0 1px 7px #baf6f3",
  },
  emailBox: {
    fontSize: "0.99rem",
    fontWeight: 600,
    color: "#21c6bc",
    fontFamily: "Georgia, serif",
    letterSpacing: "0.03em",
    marginTop: "1.5px",
  },
  email: {
    color: "#11786e",
    fontWeight: 600,
    fontSize: "0.96rem",
    fontFamily: "Times New Roman, serif",
  },
  content: {
    position: "relative",
    padding: "3rem 2rem",
    color: "#11544c",
    textAlign: "center",
    zIndex: 1,
  },
  title: {
    fontSize: "2.7rem",
    marginBottom: "2.2rem",
    fontWeight: "700",
    color: ACCENT,
    letterSpacing: ".01em",
    textShadow: "0 2px 18px #c5f5f1, 0 2px 5px rgba(40,180,170,0.18)",
  },
  grid: {
    display: "flex",
    justifyContent: "center",
    gap: "2rem",
    flexWrap: "wrap",
    marginBottom: "1rem",
  },
  card: {
    background: "rgba(255, 255, 255, 0.94)",
    border: `1.5px solid ${ACCENT}33`,
    borderRadius: "18px",
    padding: "2rem 1.3rem",
    width: "260px",
    cursor: "pointer",
    backdropFilter: "blur(9px) saturate(180%)",
    color: "#11786e",
    boxShadow: "0 4px 30px #bbf2eb",
    transition: "transform 0.3s, box-shadow 0.3s, background 0.3s, filter 0.2s",
    fontWeight: "600",
    fontSize: "1.08rem",
    marginBottom: "1.2rem",
  },
  cardTitle: {
    margin: 0,
    marginBottom: ".6rem",
    fontSize: "1.22rem",
    color: ACCENT,
    fontWeight: "700",
    letterSpacing: ".01em",
  },
  cardText: {
    margin: 0,
    color: "#177e78",
    fontWeight: "500",
    fontSize: "1rem",
  },
  logoutWrapper: {
    marginTop: "2.5rem",
    display: "flex",
    justifyContent: "center",
  },
  logoutButton: {
    padding: "0.8rem 2.2rem",
    background: `linear-gradient(90deg, ${ACCENT} 0%, #79ece4 100%)`,
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    fontWeight: "700",
    fontSize: "1rem",
    cursor: "pointer",
    boxShadow: "0 2px 16px #b5edea",
    transition: "all 0.26s",
    letterSpacing: ".01em",
    outline: "none",
  },
};

export default UserDashboard;
