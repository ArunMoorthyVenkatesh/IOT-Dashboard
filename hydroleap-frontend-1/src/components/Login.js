import React, { useState, useRef } from "react";
import axios from "axios";
import Header from "./Header";
import FadeTransition from "./FadeTransition";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

const Login = () => {
  const [mode, setMode] = useState("user"); // 'user' or 'admin'
  const navigate = useNavigate();
  const fadeRef = useRef(null);

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Input change handler
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    setErrorMsg("");
  };

  // Form validation
  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    if (!emailRegex.test(form.email.trim())) newErrors.email = "Invalid email format";
    if (!form.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Login logic for user/admin
  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: mode,
      };
      const res = await axios.post(`${API_BASE}/login`, payload);

      if (res.data?.profile) {
        localStorage.setItem("profile", JSON.stringify(res.data.profile));
        localStorage.setItem("role", mode);

        // Store token for admin
        if (mode === "admin") {
          if (res.data.token) {
            localStorage.setItem("adminToken", res.data.token);
          } else {
            // Use a dummy if token not present
            localStorage.setItem("adminToken", "dummy-admin-token");
          }
        }

        // Store regular token for user if needed
        if (mode === "user" && res.data.token) {
          localStorage.setItem("token", res.data.token);
        }

        // Success: redirect by role
        const dashboardPath = mode === "admin" ? "/admin-dashboard" : "/user-dashboard";
        if (fadeRef.current) {
          fadeRef.current(dashboardPath);
        } else {
          navigate(dashboardPath);
        }
      } else {
        setErrorMsg("Login failed. Please try again.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.detail ||
        err.response?.data?.msg ||
        err.message ||
        "Login failed. Please check your credentials."
      );
    }
    setLoading(false);
  };

  return (
    <FadeTransition targetPath="/" externalTriggerRef={fadeRef}>
      <div style={styles.wrapper}>
        <div style={styles.overlay}>
          <Header />
          <div style={styles.centerWrapper}>
            <div style={styles.container}>
              <div style={styles.titleGroup}>
                <div style={styles.title}>Hydroleap</div>
                <div style={{ ...styles.title, marginTop: "0.2rem" }}>
                  {mode === "user" ? "User Login" : "Admin Login"}
                </div>
              </div>
              {/* Mode Switch */}
              <div style={styles.toggleSwitch}>
                <button
                  onClick={() => { setMode("user"); setErrorMsg(""); }}
                  style={{
                    ...styles.toggleButton,
                    backgroundColor: mode === "user" ? "#21c6bc" : "#e0fcfa",
                    color: mode === "user" ? "#fff" : "#185754",
                  }}
                >
                  User
                </button>
                <button
                  onClick={() => { setMode("admin"); setErrorMsg(""); }}
                  style={{
                    ...styles.toggleButton,
                    backgroundColor: mode === "admin" ? "#21c6bc" : "#e0fcfa",
                    color: mode === "admin" ? "#fff" : "#185754",
                  }}
                >
                  Admin
                </button>
              </div>
              {/* Login Form */}
              <form onSubmit={handleLogin} style={styles.form}>
                <input
                  name="email"
                  type="email"
                  placeholder={mode === "admin" ? "Enter Admin Email" : "Enter User Email"}
                  value={form.email}
                  onChange={handleChange}
                  style={styles.input}
                  autoComplete="username"
                />
                {errors.email && <div style={styles.error}>{errors.email}</div>}

                <div style={styles.passwordWrapper}>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter Password"
                    value={form.password}
                    onChange={handleChange}
                    style={{ ...styles.input, paddingRight: "2.5rem" }}
                    autoComplete="current-password"
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </span>
                </div>
                {errors.password && <div style={styles.error}>{errors.password}</div>}
                {errorMsg && <div style={styles.error}>{errorMsg}</div>}

                <button
                  type="submit"
                  style={styles.button}
                  disabled={loading}
                >
                  {loading
                    ? `Logging in...`
                    : `Login as ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
                </button>
              </form>

              <button
                onClick={() => navigate("/choose")}
                style={{ ...styles.button, marginTop: "1rem" }}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </FadeTransition>
  );
};

const ACCENT = "#21c6bc";

const styles = {
  wrapper: {
    position: "relative",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "Times New Roman, serif",
    background: "linear-gradient(135deg, #e3fbfa 0%, #fafdff 100%)",
  },
  overlay: {
    position: "relative",
    zIndex: 1,
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    color: "#222",
  },
  centerWrapper: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backdropFilter: "blur(13px) saturate(170%)",
    WebkitBackdropFilter: "blur(13px) saturate(170%)",
    background: "rgba(255,255,255,0.91)",
    borderRadius: "15px",
    padding: "2rem",
    width: "350px",
    boxShadow: "0 8px 30px 0 #b0f2ee",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    border: "1.5px solid #e0fcfa",
  },
  titleGroup: {
    marginBottom: "1.2rem",
    textAlign: "center",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "bold",
    fontFamily: "Georgia, serif",
    color: ACCENT,
    letterSpacing: ".01em",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1.5px solid #b7f4ee",
    backgroundColor: "#f7fefe",
    color: "#185754",
    marginBottom: "1rem",
    outline: "none",
    boxSizing: "border-box",
  },
  passwordWrapper: {
    position: "relative",
    width: "100%",
    marginBottom: "1rem",
  },
  eyeIcon: {
    position: "absolute",
    top: "40%",
    right: "0.75rem",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#185754",
  },
  button: {
    padding: "0.75rem 1rem",
    background: "linear-gradient(90deg, #21c6bc, #8feee6)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer",
    width: "100%",
    transition: "all 0.3s",
    boxShadow: "0 2px 10px #b0ece8",
    letterSpacing: ".02em",
  },
  error: {
    fontSize: "0.85rem",
    color: "#ff6f7d",
    marginBottom: "0.5rem",
    fontWeight: "600",
  },
  toggleSwitch: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: "1rem",
    gap: "0.5rem",
  },
  toggleButton: {
    flex: 1,
    padding: "0.6rem",
    textAlign: "center",
    borderRadius: "8px",
    border: "1px solid #b7f4ee",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "1rem",
    transition: "all 0.3s ease",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  },
};

export default Login;
