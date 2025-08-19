import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/hydroleap-logo.png";

const Header = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.header}>
      <div style={styles.circle} onClick={() => navigate("/")}>
        <img src={logo} alt="Logo" style={styles.logo} />
      </div>
      <span style={styles.brand} onClick={() => navigate("/")}>
      </span>
    </div>
  );
};

const styles = {
  header: {
    position: "absolute",
    top: "20px",
    left: "20px",
    display: "flex",
    alignItems: "center",
    zIndex: 2,
    cursor: "pointer",
  },
  circle: {
    height: "120px",
    width: "120px",
    borderRadius: "50%",  
    background: "rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.15)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    height: "90px",  
    width: "auto",
    objectFit: "contain",
    filter: "drop-shadow(0 0 5px rgba(255,255,255,0.6))",
    pointerEvents: "none",
  },
  
  brand: {
    fontFamily: "Zapfino, cursive",
    fontSize: "1.6rem",
    marginLeft: "12px",
    color: "#fff",
    textShadow: "0 1px 6px rgba(0, 0, 0, 0.5)",
  },
};

export default Header;