import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiEye, FiEyeOff, FiMail, FiLock, FiDroplet,
  FiActivity, FiShield, FiBarChart2,
} from "react-icons/fi";
import FadeTransition from "./FadeTransition";
import { loginUser, sendResetOtp as apiSendResetOtp, resetPassword } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { pushSessionEntry } from "../utils/sessionHistory";
import logo from "../assets/hydroleap-logo.png";
import "./Login.css";

const LEFT_FEATURES = [
  { icon: <FiActivity  size={15} />, label: "Real-time IoT Monitoring", desc: "Live sensor data from all water systems"  },
  { icon: <FiDroplet   size={15} />, label: "Smart Water Management",   desc: "Flow, level, pressure & quality tracking" },
  { icon: <FiShield    size={15} />, label: "Secure Access Control",    desc: "Role-based permissions & approvals"       },
  { icon: <FiBarChart2 size={15} />, label: "Analytics & Reports",      desc: "Export professional PDF reports"          },
];


const Input = ({ icon, type, placeholder, value, onChange, name, autoComplete, extra }) => (
  <div className="login-input-wrap">
    <div className="login-input-icon">{icon}</div>
    <input
      className="login-input"
      name={name} type={type} placeholder={placeholder} value={value}
      onChange={onChange} autoComplete={autoComplete}
    />
    {extra}
  </div>
);

const Login = () => {
  const [mode, setMode] = useState("user");
  const navigate = useNavigate();
  const { login } = useAuth();
  const fadeRef = useRef(null);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpStage, setFpStage] = useState(1);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMsg, setFpMsg] = useState("");
  const [fp, setFp] = useState({ email: "", otp: "", newPassword: "", confirmPassword: "" });
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmNewPwd, setShowConfirmNewPwd] = useState(false);


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors(prev => ({ ...prev, [e.target.name]: "" }));
    setErrorMsg("");
  };

  const validate = () => {
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(form.email.trim())) errs.email = "Invalid email format";
    if (!form.password) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setLoading(true); setErrorMsg("");
    try {
      const res = await loginUser({
        email: form.email.trim().toLowerCase(), password: form.password, role: mode,
      });
      if (res?.profile) {
        login({
          profile:    res.profile,
          token:      mode === "user"  ? res.token : undefined,
          adminToken: mode === "admin" ? (res.token || "dummy-admin-token") : undefined,
          role:       mode,
          sessionId:  res.session_id,
        });
        pushSessionEntry(form.email.trim().toLowerCase(), "login");
        const dashboardPath = "/dashboard";
        if (fadeRef.current) fadeRef.current(dashboardPath);
        else navigate(dashboardPath);
      } else {
        setErrorMsg("Login failed. Please try again.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Login failed.");
    }
    setLoading(false);
  };

  const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(e);
  const passwordOk = (p) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(p);

  const openForgot = () => {
    setForgotOpen(true); setFpStage(1); setFpMsg("");
    setFp(prev => ({ ...prev, email: form.email.trim().toLowerCase(), otp: "", newPassword: "", confirmPassword: "" }));
  };

  const cancelForgot = () => {
    setForgotOpen(false); setFpStage(1); setFpMsg("");
    setFp({ email: "", otp: "", newPassword: "", confirmPassword: "" });
    setShowNewPwd(false); setShowConfirmNewPwd(false);
  };

  const sendResetOtp = async () => {
    const email = fp.email?.trim().toLowerCase();
    if (!emailValid(email)) return setFpMsg("Enter a valid email.");
    setFpLoading(true); setFpMsg("");
    try {
      await apiSendResetOtp({ email, role: mode });
      setFpStage(2); setFpMsg("Reset code sent to your email.");
    } catch (err) {
      setFpMsg(err.message || "Could not send reset code.");
    }
    setFpLoading(false);
  };

  const doResetPassword = async () => {
    const email = fp.email?.trim().toLowerCase();
    if (!fp.otp?.trim()) return setFpMsg("Enter the OTP.");
    if (!passwordOk(fp.newPassword)) return setFpMsg("8+ chars with A-Z, a-z, 0-9, special char.");
    if (fp.newPassword !== fp.confirmPassword) return setFpMsg("Passwords do not match.");
    setFpLoading(true); setFpMsg("");
    try {
      await resetPassword({
        email, role: mode, otp: fp.otp.trim(),
        new_password: fp.newPassword, confirm_password: fp.confirmPassword,
      });
      setFpMsg("Password updated. You can now sign in.");
      setForm({ email, password: fp.newPassword });
      setForgotOpen(false);
    } catch (err) {
      setFpMsg(err.message || "Could not reset password.");
    }
    setFpLoading(false);
  };

  const eyeBtn = (show, toggle) => (
    <button type="button" onClick={toggle} className="login-eye-btn"
      aria-label={show ? "Hide password" : "Show password"}>
      {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
    </button>
  );

  const fpMsgClass = fpMsg.toLowerCase().includes("sent") || fpMsg.toLowerCase().includes("updated")
    ? "login-fp-msg success"
    : "login-fp-msg error";

  return (
    <FadeTransition targetPath="/" externalTriggerRef={fadeRef}>
      <div className="login-root">

        {/* ── LEFT PANEL ── */}
        <div className="login-left">
          <div className="login-blob login-blob-1" />
          <div className="login-blob login-blob-2" />
          <div className="login-divider" />

          <div className="login-logo-ring">
            <img src={logo} alt="Hydroleap" />
          </div>

          <div className="login-brand-name">Hydroleap</div>
          <div className="login-brand-sub">Smart Water Management</div>

          <div className="login-features">
            {LEFT_FEATURES.map(f => (
              <div key={f.label} className="login-feature">
                <div className="login-feature-icon">{f.icon}</div>
                <div className="login-feature-text">
                  <div className="login-feature-label">{f.label}</div>
                  <div className="login-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="login-left-footer">
            <FiDroplet size={11} /> Hydroleap © 2025
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="login-right">
          <div className="login-form-wrap">

            <button className="login-back-btn" onClick={() => navigate("/")}>← Back to home</button>

            <div className="login-heading">Welcome back</div>
            <p className="login-subheading">
              Sign in to your {mode === "admin" ? "admin" : "user"} account
            </p>

            {/* Role toggle */}
            <div className="login-role-toggle">
              {["user", "admin"].map(r => (
                <button key={r} type="button"
                  className={`login-role-btn${mode === r ? " active" : ""}`}
                  onClick={() => { if (!forgotOpen) { setMode(r); setErrorMsg(""); } }}
                  disabled={forgotOpen}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            {!forgotOpen ? (
              <form onSubmit={handleLogin}>
                <label className="login-label">Email address</label>
                <Input icon={<FiMail size={15} />} type="email" name="email"
                  placeholder="you@example.com" value={form.email}
                  onChange={handleChange} autoComplete="username" />
                {errors.email && <div className="login-field-error" role="alert">{errors.email}</div>}

                <label className="login-label">Password</label>
                <Input icon={<FiLock size={15} />}
                  type={showPassword ? "text" : "password"} name="password"
                  placeholder="••••••••" value={form.password}
                  onChange={handleChange} autoComplete="current-password"
                  extra={eyeBtn(showPassword, () => setShowPassword(v => !v))} />
                {errors.password && <div className="login-field-error" role="alert">{errors.password}</div>}
                {errorMsg && <div className="login-field-error" role="alert" style={{ marginBottom: 12 }}>{errorMsg}</div>}

                <div className="login-forgot">
                  <button type="button" onClick={openForgot} className="login-forgot-btn">
                    Forgot password?
                  </button>
                </div>

                <button type="submit" disabled={loading} className="login-submit">
                  {loading ? "Signing in…" : `Sign in as ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
                </button>
              </form>
            ) : (
              /* ── Forgot Password ── */
              <div style={{ animation: "fadeInUp 0.3s ease-out" }}>
                <div className="login-fp-heading">Reset Password</div>
                <div className="login-fp-sub">
                  {fpStage === 1 ? "Enter your email to receive a reset code." : "Enter the OTP and your new password."}
                </div>
                <form onSubmit={e => { e.preventDefault(); fpStage === 1 ? sendResetOtp() : doResetPassword(); }}>
                  {fpStage === 1 && (
                    <>
                      <label className="login-label">Email address</label>
                      <Input icon={<FiMail size={15} />} type="email" placeholder="you@example.com"
                        value={fp.email} onChange={e => setFp({ ...fp, email: e.target.value })} autoComplete="email" />
                    </>
                  )}
                  {fpStage === 2 && (
                    <>
                      <label className="login-label">OTP Code</label>
                      <Input icon={<FiLock size={15} />} type="text" placeholder="Enter OTP"
                        value={fp.otp} onChange={e => setFp({ ...fp, otp: e.target.value })} />
                      <label className="login-label">New Password</label>
                      <Input icon={<FiLock size={15} />} type={showNewPwd ? "text" : "password"}
                        placeholder="New password" value={fp.newPassword}
                        onChange={e => setFp({ ...fp, newPassword: e.target.value })}
                        extra={eyeBtn(showNewPwd, () => setShowNewPwd(v => !v))} />
                      <label className="login-label">Confirm Password</label>
                      <Input icon={<FiLock size={15} />} type={showConfirmNewPwd ? "text" : "password"}
                        placeholder="Confirm password" value={fp.confirmPassword}
                        onChange={e => setFp({ ...fp, confirmPassword: e.target.value })}
                        extra={eyeBtn(showConfirmNewPwd, () => setShowConfirmNewPwd(v => !v))} />
                    </>
                  )}
                  {fpMsg && <div className={fpMsgClass} role="alert" aria-live="polite">{fpMsg}</div>}
                  <div className="login-fp-btns">
                    <button type="button" onClick={cancelForgot} className="login-cancel-btn">Cancel</button>
                    <button type="submit" disabled={fpLoading} className="login-submit" style={{ flex: 1 }}>
                      {fpLoading ? "Please wait…" : fpStage === 1 ? "Send Reset Code" : "Reset Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="login-register-row">
              Don't have an account?{" "}
              <button onClick={() => navigate("/register")} className="login-register-link">Register</button>
            </div>
          </div>
        </div>
      </div>
    </FadeTransition>
  );
};

export default Login;
