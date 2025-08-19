import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

export default function UserListSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    fetchCompanyAndUsers();
  }, []);

  const fetchCompanyAndUsers = async () => {
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

      const userRes = await axios.get(`${API_BASE}/users`);
      setUsers(userRes.data.users || []);
    } catch (err) {
      setUsers([]);
      setError("Failed to fetch user list.");
    }
    setLoading(false);
  };

  const filteredUsers = users.filter((u) => {
    const s = searchTerm.toLowerCase();
    const c = companySearch.toLowerCase();

    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(s)) ||
      (u.email && u.email.toLowerCase().includes(s));

    const matchesCompany =
      c === "" || (u.company_name && u.company_name.toLowerCase().includes(c));

    if (companyName.toLowerCase() === "hydroleap") {
      return matchesSearch && matchesCompany;
    } else {
      return (
        u.company_name === companyName &&
        matchesSearch &&
        matchesCompany
      );
    }
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
<h2 style={{ color: "#21c6bc", marginBottom: 20, textAlign: "center" }}>User List</h2>

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by name or email..."
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
        value={companySearch}
        onChange={(e) => setCompanySearch(e.target.value)}
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

      {loading && <p>Loading users...</p>}
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

      {!loading && !error && filteredUsers.length === 0 && (
        <p style={{ color: "#666", textAlign: "center" }}>No users found.</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.2rem",
        }}
      >
        {filteredUsers.map((u, idx) => (
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
            <h3 style={{ marginTop: 0, color: "#0d6e6a" }}>{u.name || "—"}</h3>
            <p style={{ margin: "4px 0" }}>
              <b>Email:</b> {u.email || "—"}
            </p>
            {u.phone && (
              <p style={{ margin: "4px 0" }}>
                <b>Phone:</b> {u.phone}
              </p>
            )}
            {u.dob && (
              <p style={{ margin: "4px 0" }}>
                <b>DOB:</b> {u.dob}
              </p>
            )}
            {u.gender && (
              <p style={{ margin: "4px 0" }}>
                <b>Gender:</b> {u.gender}
              </p>
            )}
            {u.company_name && (
              <p style={{ margin: "4px 0", color: "#157a75" }}>
                <b>Company:</b> {u.company_name}
              </p>
            )}
            {u.created_at && (
              <p style={{ marginTop: 8, fontSize: 13, color: "#166d6b" }}>
                <b>Joined:</b> {new Date(u.created_at).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
