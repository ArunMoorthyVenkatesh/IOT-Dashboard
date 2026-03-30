import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiDroplet, FiArrowRight, FiActivity, FiWifi, FiZap, FiThermometer, FiBarChart2 } from "react-icons/fi";
import { getAllProjects, getCompanyAccesses } from "../services/api";
import "./AllProjects.css";

const CARD_COLORS = ["card-green", "card-blue", "card-orange", "card-red", "card-purple"];

const CARD_ICONS = [
  <FiActivity size={18} />,
  <FiWifi     size={18} />,
  <FiZap      size={18} />,
  <FiThermometer size={18} />,
  <FiBarChart2 size={18} />,
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
      let company = "";
      const stored = localStorage.getItem("profile");
      if (stored) {
        const profile = JSON.parse(stored);
        company = profile.company || profile.company_name || profile.companyName || "";
        setCompanyName(company);
      } else {
        setError("Access denied. Please login as admin.");
        setLoading(false);
        navigate("/login");
        return;
      }

      if (company.trim().toLowerCase() === "hydroleap") {
        const projRes = await getAllProjects();
        setProjects(projRes.projects || []);
      } else if (company) {
        const accessRes = await getCompanyAccesses();
        const companyAccesses = accessRes.company_accesses || [];
        const allowed = companyAccesses.filter(
          (a) =>
            (a.company || a.companyName || a.company_name || "").trim().toLowerCase() ===
            company.trim().toLowerCase()
        );
        const allowedAssetIds = allowed.map((a) => a.asset_id);
        if (allowedAssetIds.length === 0) {
          setProjects([]);
        } else {
          const projRes = await getAllProjects();
          const allProjects = projRes.projects || [];
          setProjects(allProjects.filter((p) => allowedAssetIds.includes(p.asset_id)));
        }
      } else {
        setProjects([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load project list.");
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (assetId) => {
    navigate(`/iot/${assetId}`);
  };

  // Parse sensor data from JSON string
  const getSensorData = (proj) => {
    try {
      return typeof proj.data === "string" ? JSON.parse(proj.data) : (proj.data || {});
    } catch { return {}; }
  };

  return (
    <div className="all-projects-content">
      {/* Page header */}
      <div className="projects-page-header">
        <div className="projects-page-header-top">
          <div>
            <h2 className="dashboard-title">Projects</h2>
            <p className="dashboard-subtitle">View and monitor all assigned project dashboards.</p>
          </div>
          {companyName && (
            <div className="projects-company-badge">
              <span className="projects-company-badge-dot" />
              {companyName}
            </div>
          )}
        </div>
      </div>

      {/* States */}
      {loading ? (
        <div className="projects-loading" role="status" aria-label="Loading projects">
          <div className="projects-loading-spinner" aria-hidden="true" />
          Loading projects…
        </div>
      ) : error ? (
        <p className="error-message" role="alert">{error}</p>
      ) : projects.length === 0 ? (
        <div className="no-projects">
          <div className="no-projects-icon"><FiDroplet /></div>
          <div className="no-projects-title">No projects found</div>
          <div className="no-projects-desc">
            {companyName && companyName.trim().toLowerCase() !== "hydroleap"
              ? "You don't have access to any projects yet. Contact your administrator."
              : "No projects have been created yet."}
          </div>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((proj, idx) => {
            const colorClass = CARD_COLORS[idx % CARD_COLORS.length];
            const icon = CARD_ICONS[idx % CARD_ICONS.length];
            const sensor = getSensorData(proj);
            const isRunning = sensor.Rectifier_1_ON || sensor.Rectifier_2_ON || sensor.Pump_speed > 0;
            return (
              <div
                key={proj.asset_id}
                className={`project-card ${colorClass}`}
                onClick={() => handleClick(proj.asset_id)}
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleClick(proj.asset_id)}
              >
                <div className="project-card-bar" />
                <div className="project-card-inner">
                  <div className="project-card-icon">{icon}</div>
                  <div className="project-card-name">{proj.asset_id}</div>
                  <div className="project-card-device">
                    <strong>Client:</strong> {proj.client_id || "N/A"}
                  </div>
                  <div className="project-card-footer">
                    <span className={`status-badge ${isRunning ? "status-running" : "status-stopped"}`}>
                      {isRunning ? "Running" : "Stopped"}
                    </span>
                    <span className="project-card-open">
                      Open <FiArrowRight size={11} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AllProjects;
