import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

export default function AdminListSection() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(""); // name/email search
  const [companyFilter, setCompanyFilter] = useState(""); // company search
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    fetchCompanyAndAdmins();
  }, []);

  const fetchCompanyAndAdmins = async () => {
    setLoading(true);
    setError("");
    try {
      let profile = localStorage.getItem("profile");
      if (profile) {
        profile = JSON.parse(profile);
        setCompanyName(profile.company_name);
      } else {
        const res = await axios.get(`${API_BASE}/admin/profile`);
        setCompanyName(res.data.company_name);
        localStorage.setItem("profile", JSON.stringify(res.data));
      }

      const adminRes = await axios.get(`${API_BASE}/admins`);
      setAdmins(adminRes.data.admins || []);
    } catch (err) {
      setAdmins([]);
      setError("Failed to fetch admin list.");
    }
    setLoading(false);
  };

  const filteredAdmins = admins.filter((a) => {
    const s = search.toLowerCase();
    const c = companyFilter.toLowerCase();

    const matchesSearch =
      (a.name && a.name.toLowerCase().includes(s)) ||
      (a.email && a.email.toLowerCase().includes(s));

    const matchesCompany =
      c === "" || (a.company_name && a.company_name.toLowerCase().includes(c));

    if (companyName.toLowerCase() === "hydroleap") {
      return matchesSearch && matchesCompany;
    } else {
      return (
        a.company_name === companyName &&
        matchesSearch &&
        matchesCompany
      );
    }
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
<h2 style={{ color: "#21c6bc", marginBottom: 20, textAlign: "center" }}>Admin List</h2>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search admins by name or email..."
        style={{
          padding: "10px 14px",
          fontSize: 16,
          borderRadius: 8,
          border: "1.5px solid #21c6bc",
          marginBottom: 12,
          width: "100%",
          boxSizing: "border-box",
        }}
      />

      <input
        type="text"
        value={companyFilter}
        onChange={(e) => setCompanyFilter(e.target.value)}
        placeholder="Filter by company name..."
        style={{
          padding: "10px 14px",
          fontSize: 16,
          borderRadius: 8,
          border: "1.5px solid #21c6bc",
          marginBottom: 24,
          width: "100%",
          boxSizing: "border-box",
        }}
      />

      {loading && <p>Loading admins...</p>}
      {error && (
        <div
          style={{
            background: "#fff2f2",
            color: "#d32f2f",
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
            fontWeight: "600",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && filteredAdmins.length === 0 && (
        <p style={{ color: "#666", textAlign: "center" }}>No admins found.</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.2rem",
        }}
      >
        {filteredAdmins.map((a, idx) => (
          <div
            key={idx}
            style={{
              background: "#f0fdfa",
              border: "1.5px solid #21c6bc",
              borderRadius: 12,
              padding: "18px 20px",
              boxShadow: "0 2px 10px #21c6bc33",
              cursor: "default",
              fontFamily: "'Times New Roman', serif",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#0d6e6a" }}>
              {a.name || "—"}
            </h3>
            <p style={{ margin: "4px 0" }}>
              <b>Email:</b> {a.email || "—"}
            </p>
            {a.phone && (
              <p style={{ margin: "4px 0" }}>
                <b>Phone:</b> {a.phone}
              </p>
            )}
            {a.dob && (
              <p style={{ margin: "4px 0" }}>
                <b>DOB:</b> {a.dob}
              </p>
            )}
            {a.gender && (
              <p style={{ margin: "4px 0" }}>
                <b>Gender:</b> {a.gender}
              </p>
            )}
            {a.company_name && (
              <p style={{ margin: "4px 0", color: "#157a75" }}>
                <b>Company:</b> {a.company_name}
              </p>
            )}
            {a.created_at && (
              <p style={{ marginTop: 8, fontSize: 13, color: "#166d6b" }}>
                <b>Joined:</b> {new Date(a.created_at).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
