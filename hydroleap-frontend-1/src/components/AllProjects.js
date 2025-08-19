import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AllProjects.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";
const CARD_COLORS = [
  "card-green",
  "card-blue",
  "card-orange",
  "card-red",
  "card-purple"
];

const AllProjects = () => {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanyAndProjects();
    // eslint-disable-next-line
  }, []);

  const fetchCompanyAndProjects = async () => {
    setError("");
    setLoading(true);
    try {
      // 1. Get admin profile (from localStorage cache or backend)
      let profile = localStorage.getItem("profile");
      let company = "";
      if (profile) {
        profile = JSON.parse(profile);
        company = profile.company || profile.company_name || profile.companyName || "";
        setCompanyName(company);
      } else {
        const token = localStorage.getItem("adminToken");
        if (!token) {
          setError("Access denied. Please login as admin.");
          setLoading(false);
          navigate("/admin-login");
          return;
        }
        const res = await axios.get(`${API_BASE}/admin/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        company = res.data.company || res.data.company_name || res.data.companyName || "";
        setCompanyName(company);
        localStorage.setItem("profile", JSON.stringify(res.data));
      }

      const token = localStorage.getItem("adminToken");

      if (company && company.trim().toLowerCase() === "hydroleap") {
        // Hydroleap: fetch all projects
        const projRes = await axios.get(`${API_BASE}/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProjects(projRes.data.projects || []);
      } else if (company) {
        // Other companies: fetch company-accesses and then fetch only assigned projects
        const accessRes = await axios.get(`${API_BASE}/company-accesses`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const companyAccesses = accessRes.data.company_accesses || [];
        // Filter to projects where company matches (case-insensitive)
        const allowed = companyAccesses.filter(
          (a) =>
            (a.company || a.companyName || a.company_name || "").trim().toLowerCase() === company.trim().toLowerCase()
        );
        const allowedProjectIds = allowed.map((a) => a.projectId);

        if (allowedProjectIds.length === 0) {
          setProjects([]);
        } else {
          // Option 1: If you have many projects and can fetch all and filter locally:
          const projRes = await axios.get(`${API_BASE}/projects`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const allProjects = projRes.data.projects || [];
          const companyProjects = allProjects.filter((p) =>
            allowedProjectIds.includes(p.projectId)
          );
          setProjects(companyProjects);

          // Option 2: If you have a backend endpoint to fetch projects by ID array, call it here for efficiency!
        }
      } else {
        setProjects([]);
      }
    } catch (err) {
      setError("Failed to load profile or project list.");
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (projectId) => {
    navigate(`/iot/${projectId}`);
  };

  return (
    <div className="all-projects-content">
      <h2 className="dashboard-title">Projects</h2>
      <p style={{ color: "#5c8581", marginBottom: "2rem", fontWeight: 500 }}>
        View and manage all project dashboards.
      </p>
      <div style={{ marginBottom: 14, color: "#555", fontSize: 15 }}>
        <b>Your Company:</b>{" "}
        <span style={{ color: "#16a59e" }}>{companyName || "…"}</span>
      </div>
      {loading ? (
        <p style={{ color: "#888", marginTop: "2rem" }}>Loading...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : projects.length === 0 ? (
        <p className="no-projects">
          {companyName && companyName.trim().toLowerCase() !== "hydroleap"
            ? "No projects found. You do not have access or no projects are assigned."
            : "No projects found."}
        </p>
      ) : (
        <div className="project-grid">
          {projects.map((proj, idx) => (
            <div
              key={proj.projectId}
              className={`project-card ${CARD_COLORS[idx % CARD_COLORS.length]}`}
              onClick={() => handleClick(proj.projectId)}
              tabIndex={0}
            >
              <h3 style={{ margin: 0 }}>{proj.projectId}</h3>
              <p><strong>Device:</strong> {proj.deviceId || "N/A"}</p>
              <p>
                <span className={`status-badge ${proj.system_running ? "status-running" : "status-stopped"}`}>
                  {proj.system_running ? "Running" : "Stopped"}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllProjects;
