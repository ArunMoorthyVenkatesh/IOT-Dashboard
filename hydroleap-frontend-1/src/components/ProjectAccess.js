import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

const ProjectAccess = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success | error
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      alert("Please log in as admin to continue.");
      navigate("/admin-login");
      return;
    }
    fetchProjects(token);
  }, [navigate]);

  const fetchProjects = async (token) => {
    try {
      const res = await axios.get(`${API_BASE}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(res.data);
    } catch (err) {
      alert("Failed to fetch projects");
    }
  };

  const handleGrantAccess = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setMessage("Please enter a valid email.");
      setMessageType("error");
      return;
    }

    if (!selectedProject) {
      setMessage("Please select a project.");
      setMessageType("error");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/projects/grant-access`, {
        projectId: selectedProject.projectId,
        email: trimmedEmail,
      });

      setMessage(res.data.message);
      setMessageType("success");
      setEmail("");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Something went wrong while granting access.";
      setMessage(errorMsg);
      setMessageType("error");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <Header />
        <h2 style={styles.title}>Project Access</h2>

        <div style={styles.grid}>
          {projects.map((project) => (
            <div
              key={project._id}
              style={{
                ...styles.card,
                border:
                  selectedProject?._id === project._id
                    ? "2px solid #fff"
                    : "1px solid rgba(255, 255, 255, 0.3)",
                backgroundColor:
                  selectedProject?._id === project._id
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(255,255,255,0.1)",
              }}
              onClick={() => setSelectedProject(project)}
            >
              <h4>{project.name || project.projectId}</h4>
            </div>
          ))}
        </div>

        {selectedProject && (
          <div style={styles.accessPanel}>
            <h3>
              Grant Access to:{" "}
              {selectedProject.name || selectedProject.projectId}
            </h3>
            <input
              type="email"
              placeholder="Enter user email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
            <button onClick={handleGrantAccess} style={styles.button}>
              Grant Access
            </button>
            {message && (
              <p
                style={{
                  ...styles.message,
                  color: messageType === "success" ? "#0f0" : "#f55",
                }}
              >
                {message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
const styles = {
  container: {
    position: "relative",
    minHeight: "100vh",
    overflow: "auto",
    fontFamily: "'Bodoni 72 Oldstyle', serif",
  },
  videoBackground: {
    position: "fixed",
    width: "100vw",
    height: "100vh",
    objectFit: "cover",
    zIndex: -1,
    top: 0,
    left: 0,
  },
  content: {
    padding: "2rem",
    color: "#fff",
  },
  title: {
    textAlign: "center",
    fontSize: "2.5rem",
    marginBottom: "2rem",
  },
  grid: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: "10px",
    padding: "1rem",
    width: "200px",
    textAlign: "center",
    cursor: "pointer",
    transition: "transform 0.2s, background-color 0.2s",
  },
  accessPanel: {
    marginTop: "2rem",
    background: "rgba(0,0,0,0.4)",
    padding: "1.5rem",
    borderRadius: "10px",
    maxWidth: "500px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  input: {
    width: "80%",
    padding: "0.6rem",
    borderRadius: "5px",
    border: "none",
    marginBottom: "1rem",
  },
  button: {
    padding: "0.6rem 1.5rem",
    backgroundColor: "#fff",
    color: "#000",
    border: "none",
    borderRadius: "5px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  message: {
    marginTop: "1rem",
    fontStyle: "italic",
  },
};

export default ProjectAccess;
