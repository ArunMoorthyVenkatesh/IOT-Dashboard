import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiActivity, FiDroplet, FiShield, FiBarChart2 } from "react-icons/fi";
import { requestSignup } from "../services/api";
import logo from "../assets/hydroleap-logo.png";
import "./Register.css";

const LEFT_FEATURES = [
  { icon: <FiActivity  size={15} />, label: "Real-time IoT Monitoring", desc: "Live sensor data from all water systems"  },
  { icon: <FiDroplet   size={15} />, label: "Smart Water Management",   desc: "Flow, level, pressure & quality tracking" },
  { icon: <FiShield    size={15} />, label: "Secure Access Control",    desc: "Role-based permissions & approvals"       },
  { icon: <FiBarChart2 size={15} />, label: "Analytics & Reports",      desc: "Export professional PDF reports"          },
];

const Register = () => {
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "",
    dob: "", phone: "", gender: "",
    email: "", password: "", confirmPassword: "",
    companyName: "",
  });
  const [errors,              setErrors]              = useState({});
  const [role,                setRole]                = useState("user");
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading,             setLoading]             = useState(false);
  const [infoMsg,             setInfoMsg]             = useState("");
  const [infoType,            setInfoType]            = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const isValidDOB = (dobStr) => {
    const dob   = new Date(dobStr);
    const today = new Date();
    today.setFullYear(today.getFullYear() - 18);
    return dob <= today;
  };

  const validate = () => {
    const nameRegex     = /^[A-Za-z]{1,50}$/;
    const phoneRegex    = /^\+65\s?[689]\d{7}$/;
    const emailRegex    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    const newErrors     = {};

    if (!nameRegex.test(form.firstName))                     newErrors.firstName       = "1–50 letters only.";
    if (form.middleName && !nameRegex.test(form.middleName)) newErrors.middleName      = "Letters only.";
    if (!nameRegex.test(form.lastName))                      newErrors.lastName        = "1–50 letters only.";
    if (!form.dob || !isValidDOB(form.dob))                  newErrors.dob             = "Must be 18+.";
    if (!phoneRegex.test(form.phone))                        newErrors.phone           = "Format: +65 91234567";
    if (!["Male", "Female"].includes(form.gender))           newErrors.gender          = "Select a gender.";
    if (!emailRegex.test(form.email))                        newErrors.email           = "Invalid email.";
    if (!passwordRegex.test(form.password))                  newErrors.password        = "8+ chars: A-Z, a-z, 0-9, special.";
    if (form.password !== form.confirmPassword)              newErrors.confirmPassword = "Passwords don't match.";
    if (!form.companyName.trim())                            newErrors.companyName     = "Required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true); setInfoMsg("");
    try {
      await requestSignup({ ...form, email: form.email.trim().toLowerCase(), role });
      setInfoMsg(`Registration submitted! Awaiting ${role === "admin" ? "super admin" : "admin"} approval.`);
      setInfoType("success");
      setTimeout(() => navigate("/login"), 2200);
    } catch (err) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("exists") || msg.toLowerCase().includes("pending")) {
        setErrors((prev) => ({ ...prev, email: "Email already exists or is pending." }));
      } else {
        setInfoMsg(msg || "Registration failed.");
        setInfoType("error");
      }
    }
    setLoading(false);
  };

  return (
    <div className="reg-root">

      {/* ── Left brand panel ── */}
      <div className="reg-left">
        <div className="reg-blob reg-blob-1" />
        <div className="reg-blob reg-blob-2" />
        <div className="reg-divider" />

        <div className="reg-logo-ring">
          <img src={logo} alt="Hydroleap" />
        </div>
        <div className="reg-brand-name">Hydroleap</div>
        <div className="reg-brand-sub">Smart Water Management</div>

        <div className="reg-features">
          {LEFT_FEATURES.map(f => (
            <div key={f.label} className="reg-feature">
              <div className="reg-feature-icon">{f.icon}</div>
              <div className="reg-feature-text">
                <div className="reg-feature-label">{f.label}</div>
                <div className="reg-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="reg-left-footer">
          <span>© {new Date().getFullYear()} Hydroleap</span>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="reg-right">
        <div className="reg-form-wrap">

          <button className="reg-back-btn" onClick={() => navigate("/")}>
            ← Back to home
          </button>

          <h1 className="reg-heading">Create account</h1>
          <p className="reg-subheading">Fill in your details to request access.</p>

          {/* Role toggle */}
          <div className="reg-role-toggle">
            {["user", "admin"].map(r => (
              <button key={r}
                className={`reg-role-btn${role === r ? " active" : ""}`}
                onClick={() => setRole(r)}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          {role === "admin" && (
            <div className="reg-admin-note">
              Admin registrations require super admin approval before access is granted.
            </div>
          )}

          {/* ── Form ── */}
          <form className="reg-form" onSubmit={e => e.preventDefault()}>

            {/* Name row */}
            <div className="reg-row">
              <div className="reg-field">
                <input className={`reg-input${errors.firstName ? " reg-input--err" : ""}`}
                  name="firstName" placeholder="First name" value={form.firstName} onChange={handleChange} />
                {errors.firstName && <span className="reg-err">{errors.firstName}</span>}
              </div>
              <div className="reg-field">
                <input className={`reg-input${errors.lastName ? " reg-input--err" : ""}`}
                  name="lastName" placeholder="Last name" value={form.lastName} onChange={handleChange} />
                {errors.lastName && <span className="reg-err">{errors.lastName}</span>}
              </div>
            </div>

            {/* Middle + Company row */}
            <div className="reg-row">
              <div className="reg-field">
                <input className={`reg-input${errors.middleName ? " reg-input--err" : ""}`}
                  name="middleName" placeholder="Middle name (optional)" value={form.middleName} onChange={handleChange} />
                {errors.middleName && <span className="reg-err">{errors.middleName}</span>}
              </div>
              <div className="reg-field">
                <input className={`reg-input${errors.companyName ? " reg-input--err" : ""}`}
                  name="companyName" placeholder="Company name" value={form.companyName} onChange={handleChange} />
                {errors.companyName && <span className="reg-err">{errors.companyName}</span>}
              </div>
            </div>

            {/* DOB + Phone row */}
            <div className="reg-row">
              <div className="reg-field">
                <input className={`reg-input reg-input--date${errors.dob ? " reg-input--err" : ""}`}
                  name="dob" type="date" value={form.dob} onChange={handleChange} />
                {errors.dob ? <span className="reg-err">{errors.dob}</span> : <span className="reg-hint">Date of birth</span>}
              </div>
              <div className="reg-field">
                <input className={`reg-input${errors.phone ? " reg-input--err" : ""}`}
                  name="phone" placeholder="Phone (+65 91234567)" value={form.phone} onChange={handleChange} />
                {errors.phone && <span className="reg-err">{errors.phone}</span>}
              </div>
            </div>

            {/* Gender */}
            <div className="reg-field">
              <div className="reg-gender-row">
                {["Male", "Female"].map(g => (
                  <button key={g} type="button"
                    className={`reg-gender-btn${form.gender === g ? " active" : ""}`}
                    onClick={() => { setForm(f => ({ ...f, gender: g })); setErrors(e => ({ ...e, gender: "" })); }}>
                    {g}
                  </button>
                ))}
              </div>
              {errors.gender && <span className="reg-err">{errors.gender}</span>}
            </div>

            {/* Email */}
            <div className="reg-field">
              <input className={`reg-input${errors.email ? " reg-input--err" : ""}`}
                name="email" type="email" placeholder="Email address" value={form.email} onChange={handleChange} />
              {errors.email && <span className="reg-err">{errors.email}</span>}
            </div>

            {/* Password row */}
            <div className="reg-row">
              <div className="reg-field">
                <div className="reg-pw-wrap">
                  <input className={`reg-input${errors.password ? " reg-input--err" : ""}`}
                    name="password" type={showPassword ? "text" : "password"}
                    placeholder="Password" value={form.password} onChange={handleChange} />
                  <button type="button" className="reg-eye-btn" onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
                {errors.password && <span className="reg-err">{errors.password}</span>}
              </div>
              <div className="reg-field">
                <div className="reg-pw-wrap">
                  <input className={`reg-input${errors.confirmPassword ? " reg-input--err" : ""}`}
                    name="confirmPassword" type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password" value={form.confirmPassword} onChange={handleChange} />
                  <button type="button" className="reg-eye-btn" onClick={() => setShowConfirmPassword(v => !v)}>
                    {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && <span className="reg-err">{errors.confirmPassword}</span>}
              </div>
            </div>

            {/* Info message */}
            {infoMsg && (
              <div className={`reg-info-msg reg-info-msg--${infoType}`}>{infoMsg}</div>
            )}

            {/* Submit */}
            <button type="button" className="reg-submit-btn" onClick={handleRegister} disabled={loading}>
              {loading ? "Submitting…" : `Register as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
            </button>

          </form>

          <div className="reg-signin-row">
            Already have an account?{" "}
            <button className="reg-signin-link" onClick={() => navigate("/login")}>Sign in</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
