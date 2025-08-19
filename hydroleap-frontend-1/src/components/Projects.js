import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AvailableProjects.css";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const navigate = useNavigate();

  // Fetch all available projects once (optional)
  useEffect(() => {
    axios
      .get("${API_BASE}/iot/projects")
      .then((res) => setProjects(res.data))
      .catch((err) => console.error("Failed to fetch projects", err));
  }, []);

  // Auto-refresh assigned projects every second
  useEffect(() => {
    const fetchAssignedProjects = () => {
      const userEmail = localStorage.getItem("userEmail");
      if (userEmail) {
        axios
          .get(`${API_BASE}/projects/user/${userEmail}`)
          .then((res) => {
            if (Array.isArray(res.data.projects)) {
              setAssignedProjects(res.data.projects);
            } else {
              setAssignedProjects([]);
            }
          })
          .catch(() => setAssignedProjects([]));
      } else {
        setAssignedProjects([]);
      }
    };

    fetchAssignedProjects(); // Initial fetch

    const intervalId = setInterval(fetchAssignedProjects, 1000); // Every second

    return () => clearInterval(intervalId); // Cleanup
  }, []);

  return (
    <div className="project-wrapper">


      <div className="project-overlay">
        <div className="project-container">
          <h1 className="project-title">Available Projects</h1>

          {assignedProjects.length === 0 ? (
            <p className="no-projects">You don’t have access to any projects yet.</p>
          ) : (
            <div className="project-grid">
              {assignedProjects.map((projectId, index) => (
                <button
                  key={index}
                  className="project-button"
                  onClick={() => navigate(`/project/${projectId}`)}
                >
                  {projectId}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Projects;
