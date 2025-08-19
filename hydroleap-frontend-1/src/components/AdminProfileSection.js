import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";
const ACCENT = "#21c6bc";

export default function AdminProfileSection() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Fetch admin profile on mount
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setMsg("");
      try {
        let profile = localStorage.getItem("profile");
        if (profile) {
          profile = JSON.parse(profile);
          setAdmin(profile);
        } else {
          const res = await axios.get(`${API_BASE}/admin/profile`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
            }
          });
          setAdmin(res.data);
        }
      } catch (err) {
        setMsg("Failed to load admin profile.");
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  if (loading && !admin) return <div style={{ padding: 28 }}>Loading...</div>;
  if (!admin) return <div style={{ padding: 28 }}>No admin profile found.</div>;

  return (
    <div style={{
      maxWidth: 480,
      margin: "0 auto",
      background: "rgba(255,255,255,0.96)",
      borderRadius: 14,
      boxShadow: "0 2px 18px #bef3f1",
      padding: "2.4rem 2.1rem 2.2rem",
      fontFamily: "'Times New Roman', serif"
    }}>
      <h3 style={{ color: ACCENT, fontWeight: 700, fontSize: 26, marginBottom: 16, textAlign: "center" }}>
        Admin Profile
      </h3>
      <div style={{ marginBottom: 18 }}>
        <ProfileRow label="Name" value={admin.name} />
        <ProfileRow label="Email" value={admin.email} />
        <ProfileRow label="Phone" value={admin.phone} />
        <ProfileRow label="Date of Birth" value={admin.dob} />
        <ProfileRow label="Gender" value={admin.gender} />
        <ProfileRow label="Role" value={admin.role} />
        <ProfileRow label="Company" value={admin.company_name} />
        <ProfileRow label="Created At" value={admin.created_at && new Date(admin.created_at).toLocaleString()} />
      </div>
      {msg && (
        <div style={{
          color: "#e66471",
          fontWeight: 600,
          marginBottom: 12,
          textAlign: "center"
        }}>{msg}</div>
      )}
    </div>
  );
}

// Helper: renders label/value (no input)
function ProfileRow({ label, value }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", marginBottom: 13
    }}>
      <div style={{
        minWidth: 120, color: "#189b77", fontWeight: 600, fontSize: 17
      }}>{label}</div>
      <div style={{ flex: 1 }}>
        <span style={{
          color: "#174e46",
          fontWeight: 600,
          fontSize: 16,
          marginLeft: 6
        }}>
          {value || "—"}
        </span>
      </div>
    </div>
  );
}
