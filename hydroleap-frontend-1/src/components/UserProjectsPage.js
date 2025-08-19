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

// Helper: always get a projectId (works for object or string)
const getProjectId = (a) => a?.projectId || a?.project_id || a?.id || a;

const UserProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserAndProjects();
    // eslint-disable-next-line
  }, []);

  const fetchUserAndProjects = async () => {
    setError("");
    setLoading(true);
    try {
      // 1. Get user profile (from localStorage)
      let profile = localStorage.getItem("profile");
      let email = "";
      let company = "";
      if (profile) {
        profile = JSON.parse(profile);
        email = profile.email || "";
        company = profile.company || profile.company_name || profile.companyName || "";
        setCompanyName(company);
      }

      if (!email) {
        setError("No user email found. Please log in again.");
        setLoading(false);
        return;
      }

      // 2. Get assigned project accesses for this user
      let accessRes = await axios.get(`${API_BASE}/user-accesses?email=${encodeURIComponent(email)}`);
      let accesses = accessRes.data;

      // Make sure accesses is always an array
      if (Array.isArray(accesses)) {
        // do nothing
      } else if (typeof accesses === "object" && accesses !== null) {
        accesses = accesses.user_accesses || accesses.projects || Object.values(accesses);
      } else {
        accesses = [];
      }

      const assignedProjectIds = accesses.map(getProjectId).filter(Boolean);

      if (assignedProjectIds.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      // 3. Fetch all projects and filter
      let projRes = await axios.get(`${API_BASE}/projects`);
      let allProjects = projRes.data.projects || projRes.data || [];
      if (!Array.isArray(allProjects)) allProjects = [];
      const userProjects = allProjects.filter((p) =>
        assignedProjectIds.includes(p.projectId || p.project_id || p.id)
      );
      setProjects(userProjects);
    } catch (err) {
      setError("Failed to load project list.");
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (projectId) => {
    navigate(`/iot/${projectId}`);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="all-projects-content">
      <button
        className="back-btn"
        onClick={handleBack}
        style={{
          margin: "10px 0 24px 0",
          background: "none",
          border: "none",
          color: "#217c7b",
          fontWeight: 600,
          fontSize: 16,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
        aria-label="Go back"
      >
        <span style={{ fontSize: 22, lineHeight: 1 }}>←</span>
        Back
      </button>
      <h2 className="dashboard-title">My Projects</h2>
      <p style={{ color: "#5c8581", marginBottom: "2rem", fontWeight: 500 }}>
        See your assigned project dashboards below.
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
          No projects assigned to your account.
        </p>
      ) : (
        <div className="project-grid">
          {projects.map((proj, idx) => (
            <div
              key={proj.projectId || proj.project_id || proj.id || idx}
              className={`project-card ${CARD_COLORS[idx % CARD_COLORS.length]}`}
              onClick={() => handleClick(proj.projectId || proj.project_id || proj.id)}
              tabIndex={0}
            >
              <h3 style={{ margin: 0 }}>{proj.projectName || proj.projectId || proj.project_id || proj.id}</h3>
              <p>
                <strong>Device:</strong> {proj.deviceId || proj.device_id || "N/A"}
              </p>
              <p>
                <span className={`status-badge ${proj.system_running ? "status-running" : "status-stopped"}`}>
                  {proj.system_running ? "Running" : "Stopped"}
                </span>
              </p>
              <p style={{color:"#217c7b", fontSize: 14, margin: 0}}>
                {proj.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserProjectsPage;
