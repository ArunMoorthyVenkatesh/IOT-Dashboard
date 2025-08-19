import React, { useEffect, useState } from "react";
import Header from "./Header";
import { useNavigate } from "react-router-dom";

const ACCENT = "#21c6bc";

const UserProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let user = localStorage.getItem("profile");
    if (user) {
      try {
        user = JSON.parse(user);
      } catch {
        user = null;
      }
    }
    setProfile(user);
  }, []);

  const handleBack = () => navigate("/user-dashboard");

  if (!profile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Times New Roman, serif",
        }}
      >
        <h2 style={{ color: ACCENT }}>No user information found.</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e6fcfa 0%, #fafdff 100%)",
        fontFamily: "Times New Roman, serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Header />
      <div style={{ width: "100%", maxWidth: 470, margin: "3.5rem auto 0 auto" }}>
        <button
          style={{
            background: "none",
            border: "none",
            color: ACCENT,
            fontWeight: 700,
            fontSize: "1.1rem",
            marginBottom: "1.2rem",
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
            outline: "none",
          }}
          onClick={handleBack}
        >
          ← Back to Dashboard
        </button>
        <div
          style={{
            background: "#fff",
            padding: "2.2rem 2.4rem",
            borderRadius: "18px",
            boxShadow: "0 8px 30px #b0f2ee",
            minWidth: "300px",
          }}
        >
          <h2 style={{ color: ACCENT, marginBottom: "1.3rem", fontWeight: 700 }}>
            My Information
          </h2>
          <div style={{ fontSize: "1.13rem", color: "#185754", lineHeight: 1.8 }}>
            <div>
              <b>Name:</b> {profile.name || "-"}
            </div>
            <div>
              <b>Date of Birth:</b> {profile.dob || "-"}
            </div>
            <div>
              <b>Phone:</b> {profile.phone || "-"}
            </div>
            <div>
              <b>Gender:</b> {profile.gender || "-"}
            </div>
            <div>
              <b>Email:</b> {profile.email || "-"}
            </div>
            <div>
              <b>Role:</b> {profile.role || "-"}
            </div>
            <div>
              <b>Company Name:</b> {profile.company_name || profile.companyName || "-"}
            </div>
            <div>
              <b>Created At:</b> {profile.created_at || "-"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
