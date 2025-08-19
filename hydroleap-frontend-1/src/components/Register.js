import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Header from "./Header";
import { sendOtp, requestSignup } from "../api";

const ACCENT = "#21c6bc";

const Register = () => {
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "",
    phone: "",
    gender: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
    companyName: "",
  });

  const [errors, setErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [role, setRole] = useState("user");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const otpRef = useRef(null);
  const navigate = useNavigate();

  // Unified field handler
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const isValidDOB = (dobStr) => {
    const dob = new Date(dobStr);
    const today = new Date();
    today.setFullYear(today.getFullYear() - 18);
    return dob <= today;
  };

  const validate = (requireOtp = false) => {
    const nameRegex = /^[A-Za-z]{1,50}$/;
    const phoneRegex = /^\+65\s?[689]\d{7}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    const genderOptions = ["Male", "Female"];
    const newErrors = {};

    if (!nameRegex.test(form.firstName)) newErrors.firstName = "First name must be 1–50 letters.";
    if (form.middleName && !nameRegex.test(form.middleName)) newErrors.middleName = "Middle name must be letters only.";
    if (!nameRegex.test(form.lastName)) newErrors.lastName = "Last name must be 1–50 letters.";
    if (!form.dob || !isValidDOB(form.dob)) newErrors.dob = "Must be at least 18 years old.";
    if (!phoneRegex.test(form.phone)) newErrors.phone = "Invalid SG phone. Format: +65 91234567";
    if (!genderOptions.includes(form.gender)) newErrors.gender = "Select a valid gender.";
    if (!emailRegex.test(form.email)) newErrors.email = "Invalid email format.";
    if (!passwordRegex.test(form.password)) newErrors.password = "Password must be 8+ chars with A-Z, a-z, 0-9, special char.";
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    if (!form.companyName.trim()) newErrors.companyName = "Company name is required.";
    if (requireOtp && !form.otp.trim()) newErrors.otp = "OTP is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Send OTP after validating fields
  const handleSendOtp = async () => {
    if (!validate(false)) return;
    setLoading(true);
    try {
      await sendOtp(form.email.trim().toLowerCase());
      setOtpSent(true);
      alert("OTP sent to your email!");
      setTimeout(() => otpRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    } catch (err) {
      alert("Failed to send OTP. Please try again.");
    }
    setLoading(false);
  };

  // Register user/admin after OTP and all validations
  const handleRegister = async () => {
    if (!validate(true)) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        email: form.email.trim().toLowerCase(),
        role,
      };
      await requestSignup(payload);
      alert(
        `Registration submitted! Please check your email. Await ${role === "admin" ? "super admin" : "admin"} approval.`
      );
      navigate("/login");
    } catch (err) {
      let errorText = "";
      try {
        const msg = await err.message;
        if (typeof msg === "string") errorText = msg;
      } catch (_) {}
      if (errorText.toLowerCase().includes("exists") || errorText.toLowerCase().includes("pending")) {
        setErrors((prev) => ({
          ...prev,
          email: "Email already exists or is pending.",
        }));
      } else if (errorText.toLowerCase().includes("otp")) {
        setErrors((prev) => ({
          ...prev,
          otp: "Invalid or expired OTP.",
        }));
      } else {
        alert(errorText || "Registration failed.");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "Arial", background: "#f0fefd", minHeight: "100vh", padding: "1rem" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Header />
        <div style={{ width: "100%", maxWidth: "480px", margin: "auto", paddingTop: "2rem" }}>
          <div style={{ background: "#fff", padding: "2rem", borderRadius: "18px", boxShadow: "0 8px 20px rgba(0,0,0,0.05)" }}>
            <button
              onClick={() => navigate("/choose")}
              style={{ background: "none", border: "none", color: ACCENT, fontWeight: "600" }}
            >
              ← Back
            </button>
            <h2 style={{ textAlign: "center", marginBottom: "1rem", color: ACCENT }}>
              Register as {role.charAt(0).toUpperCase() + role.slice(1)}
            </h2>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              {["user", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1,
                    padding: "0.6rem",
                    border: "1px solid #b7f4ee",
                    borderRadius: "10px",
                    background: role === r ? "#21c6bc22" : "#f3fffe",
                    color: role === r ? "#21c6bc" : "#187d69",
                    fontWeight: role === r ? "700" : "600",
                  }}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            {role === "admin" && (
              <div style={{color: "#185754", fontSize: "0.95rem", marginBottom: "1rem"}}>
                <b>Note:</b> Admin registrations will be reviewed and require approval by super admin.
              </div>
            )}

            <form style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              {[
                { name: "firstName", placeholder: "First Name" },
                { name: "middleName", placeholder: "Middle Name (Optional)" },
                { name: "lastName", placeholder: "Last Name" },
                { name: "companyName", placeholder: "Company Name" },
                { name: "dob", type: "date" },
                { name: "phone", placeholder: "Phone (e.g. +65 91234567)" },
                { name: "email", placeholder: "Email" },
              ].map((field) => (
                <div key={field.name}>
                  <input
                    name={field.name}
                    type={field.type || "text"}
                    placeholder={field.placeholder || ""}
                    value={form[field.name]}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                  {errors[field.name] && <span style={errorStyle}>{errors[field.name]}</span>}
                </div>
              ))}

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {["Male", "Female"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, gender: g });
                      setErrors((prev) => ({ ...prev, gender: "" }));
                    }}
                    style={{
                      flex: 1,
                      padding: "0.6rem",
                      borderRadius: "20px",
                      border: "1.5px solid #b9efed",
                      background: form.gender === g ? ACCENT : "#edfcfb",
                      color: form.gender === g ? "#fff" : ACCENT,
                      fontWeight: form.gender === g ? 700 : 600,
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {errors.gender && <span style={errorStyle}>{errors.gender}</span>}

              {["password", "confirmPassword"].map((field) => (
                <div key={field} style={{ position: "relative" }}>
                  <input
                    name={field}
                    type={field === "password" ? (showPassword ? "text" : "password") : showConfirmPassword ? "text" : "password"}
                    placeholder={field === "password" ? "Password" : "Confirm Password"}
                    value={form[field]}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                  <span
                    onClick={() => {
                      field === "password"
                        ? setShowPassword(!showPassword)
                        : setShowConfirmPassword(!showConfirmPassword);
                    }}
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: "12px",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      color: "#185754",
                    }}
                  >
                    {field === "password"
                      ? showPassword
                        ? <FiEyeOff size={18} />
                        : <FiEye size={18} />
                      : showConfirmPassword
                        ? <FiEyeOff size={18} />
                        : <FiEye size={18} />}
                  </span>
                  {errors[field] && <span style={errorStyle}>{errors[field]}</span>}
                </div>
              ))}

              {!otpSent ? (
                <button type="button" onClick={handleSendOtp} style={buttonStyle} disabled={loading}>Send OTP</button>
              ) : (
                <>
                  <input
                    ref={otpRef}
                    name="otp"
                    placeholder="Enter OTP"
                    value={form.otp}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                  {errors.otp && <span style={errorStyle}>{errors.otp}</span>}
                  <button type="button" onClick={handleRegister} style={buttonStyle} disabled={loading}>
                    Register as {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const inputStyle = {
  padding: "0.75rem",
  fontSize: "1rem",
  borderRadius: "10px",
  border: "1.5px solid #b7f4ee",
  backgroundColor: "#f7fefe",
  color: "#185754",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

const errorStyle = {
  fontSize: "0.75rem",
  color: "#ff5c5c",
  marginTop: "-0.5rem",
  paddingLeft: "2px",
};

const buttonStyle = {
  padding: "0.75rem",
  background: ACCENT,
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "1rem",
  cursor: "pointer",
};

export default Register;
