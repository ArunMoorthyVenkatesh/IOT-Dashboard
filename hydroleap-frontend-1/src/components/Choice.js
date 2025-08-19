import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogIn, FiUserPlus } from "react-icons/fi";
import Header from "./Header";

const THEME_ACCENT_DARK = "#187d69";

const Choice = () => {
  const navigate = useNavigate();
  const [fade, setFade] = useState(false);

  const handleNavigation = (path) => {
    setFade(true);
    setTimeout(() => navigate(path), 400);
  };

  return (
    <div
      style={{
        ...styles.container,
        opacity: fade ? 0 : 1,
        transition: "opacity 0.5s cubic-bezier(.87,-0.09,.29,1.12)",
        background: "linear-gradient(135deg, #f4f8fa 0%, #f9fcff 100%)",
      }}
    >
      <div style={styles.animatedBlob} />
      <div style={styles.overlay}>
        <Header />
        <div style={styles.centerBox}>
          <div style={styles.glassBox}>
            <h2 style={styles.title}>Welcome to the <span style={{ color: THEME_ACCENT_DARK }}>Dashboard</span></h2>
            <button
              onClick={() => handleNavigation("/login")}
              style={styles.button}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <FiLogIn style={{ marginRight: 8, fontSize: "1.2em" }} />
              Login
            </button>
            <button
              onClick={() => handleNavigation("/register")}
              style={{ ...styles.button, marginTop: "0.7rem" }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <FiUserPlus style={{ marginRight: 8, fontSize: "1.2em" }} />
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: "relative",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    fontFamily: "Times New Roman, serif",
  },
  animatedBlob: {
    position: "absolute",
    top: "10vh",
    left: "50vw",
    width: 420,
    height: 330,
    background: "radial-gradient(circle at 30% 30%, #23c1b5bb 60%, #187d6955 100%)",
    filter: "blur(66px)",
    borderRadius: "54% 46% 51% 49% / 58% 41% 59% 42%",
    opacity: 0.23,
    animation: "blobMove 9s ease-in-out infinite alternate",
    zIndex: 1,
    pointerEvents: "none",
  },
  overlay: {
    position: "relative",
    zIndex: 2,
    height: "100vh",
    width: "100vw",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  centerBox: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100vw",
  },
  glassBox: {
    background: "rgba(255,255,255,0.38)",
    border: "1.5px solid rgba(35,193,181,0.17)",
    boxShadow: "0 12px 40px 0 #23c1b51a, 0 2px 40px 0 #187d691a",
    borderRadius: "30px",
    padding: "2.8rem 2.3rem",
    minWidth: 340,
    width: 370,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backdropFilter: "blur(13px)",
    WebkitBackdropFilter: "blur(13px)",
  },
  title: {
    color: THEME_ACCENT_DARK,
    fontWeight: 900,
    fontSize: "2.15rem",
    letterSpacing: "0.03em",
    marginBottom: "0.5rem",
    textShadow: "0 2px 20px #23c1b529",
    fontFamily: "'Segoe UI', 'Inter', Arial, sans-serif",
    textAlign: "center",
  },
  subtitle: {
    color: "#349c94",
    fontWeight: 500,
    fontSize: "1.06rem",
    marginBottom: "1.4rem",
    letterSpacing: "0.02em",
    fontFamily: "inherit",
    opacity: 0.83,
    textAlign: "center",
  },
  button: {
    padding: "0.8rem 0",
    width: 210,
    fontSize: "1.11rem",
    borderRadius: "11px",
    border: "none",
    fontWeight: 700,
    background: `linear-gradient(101deg, #23c1b5d9 0%, #8ce6d6cc 100%)`,
    color: "#fff",
    boxShadow: "0 2px 14px #23c1b530",
    cursor: "pointer",
    outline: "none",
    transition: "all 0.15s cubic-bezier(.87,-0.09,.29,1.12)",
    letterSpacing: "0.02em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

// CSS keyframes for blob animation (inject to global stylesheet or via styled-components)
const style = document.createElement("style");
style.innerHTML = `
@keyframes blobMove {
  0%   { transform: scale(1) translate(-30px, -8px); }
  55%  { transform: scale(1.05) translate(40px, 15px) rotate(6deg);}
  100% { transform: scale(1) translate(0px, 0px);}
}
`;
document.head.appendChild(style);

export default Choice;
