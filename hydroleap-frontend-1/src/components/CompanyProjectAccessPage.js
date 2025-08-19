import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

const CompanyProjectAccessPage = () => {
  const [mode, setMode] = useState("existing"); // "existing", "new", "remove"
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, ] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");

  // Fetch companies and projects on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/companies`),
      axios.get(`${API_BASE}/projects`)
    ]).then(([compRes, projRes]) => {
      setCompanies(compRes.data.companies || []);
      setProjects(projRes.data.projects || []);
      setLoading(false);
    });
  }, []);

  // Fetch all company assignments for Existing Assignment tab
  useEffect(() => {
    if (mode === "existing") {
      setLoading(true);
      axios
        .get(`${API_BASE}/company-accesses`)
        .then((res) => {
          setAllAssignments(res.data.company_accesses || []);
          setLoading(false);
        }).catch(() => {
          setAllAssignments([]);
          setLoading(false);
        });
    }
  }, [mode]);

  // Fetch assigned projects for the selected company (new/remove mode)
  useEffect(() => {
    if ((mode === "new" || mode === "remove") && selectedCompany) {
      setLoading(true);
      axios
        .get(`${API_BASE}/company-accesses?company=${encodeURIComponent(selectedCompany)}`)
        .then((res) => {
          setAssignedProjects(res.data.company_accesses.map(a => a.projectId));
          setLoading(false);
        });
    } else if (mode === "new" || mode === "remove") {
      setAssignedProjects([]);
    }
  }, [mode, selectedCompany]);

  // Filter companies (remove hydroleap, search support)
  const filteredCompanies = companies
    .filter(c => c.trim().toLowerCase() !== "hydroleap")
    .filter(c => c.toLowerCase().includes(companySearch.toLowerCase()));

  // For "New Assignment", show only UNASSIGNED projects
  const availableProjectsForNew = projects.filter(
    (p) =>
      !assignedProjects.includes(p.projectId) &&
      (
        p.projectId.toLowerCase().includes(projectSearch.toLowerCase()) ||
        (p.deviceId && p.deviceId.toLowerCase().includes(projectSearch.toLowerCase()))
      )
  );

  // For "Remove Assignment", show only ASSIGNED projects
  const projectsForRemove = projects.filter(
    (p) =>
      assignedProjects.includes(p.projectId) &&
      (
        p.projectId.toLowerCase().includes(projectSearch.toLowerCase()) ||
        (p.deviceId && p.deviceId.toLowerCase().includes(projectSearch.toLowerCase()))
      )
  );

  const [selectedForAssign, setSelectedForAssign] = useState([]);
  const [selectedForRemove, setSelectedForRemove] = useState([]);

  // Whenever company changes, clear project selections
  useEffect(() => {
    setSelectedForAssign([]);
    setSelectedForRemove([]);
  }, [selectedCompany, mode]);

  // For "Assign"
  const handleToggleAssign = (projectId) => {
    setSelectedForAssign((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  // For "Remove"
  const handleToggleRemove = (projectId) => {
    setSelectedForRemove((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSaveAssign = async () => {
    if (selectedForAssign.length === 0) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/company-accesses/assign`, {
        company: selectedCompany,
        projectIds: selectedForAssign,
      });
      alert("Project(s) assigned!");
      setSelectedForAssign([]);
      // Refresh assigned projects after assignment
      axios
        .get(`${API_BASE}/company-accesses?company=${encodeURIComponent(selectedCompany)}`)
        .then((res) => setAssignedProjects(res.data.company_accesses.map(a => a.projectId)));
      setLoading(false);
    } catch {
      alert("Failed to assign projects.");
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async () => {
    if (selectedForRemove.length === 0) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/company-accesses/remove`, {
        company: selectedCompany,
        projectIds: selectedForRemove,
      });
      alert("Project assignment(s) removed!");
      setSelectedForRemove([]);
      // Refresh assigned projects after removal
      axios
        .get(`${API_BASE}/company-accesses?company=${encodeURIComponent(selectedCompany)}`)
        .then((res) => setAssignedProjects(res.data.company_accesses.map(a => a.projectId)));
      setLoading(false);
    } catch {
      alert("Failed to remove assignments.");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <div
        style={{
          background: "#fff",
          boxShadow: "0 8px 36px #23c1b51a",
          borderRadius: 28,
          padding: "36px 30px 48px 30px",
          margin: "0 auto",
          marginTop: 28,
          textAlign: "center",
          minHeight: 450,
        }}
      >
        <h1 style={{
          fontSize: "2.5rem",
          color: "#21c6bc",
          fontWeight: 800,
          letterSpacing: 1,
          marginBottom: 18
        }}>
          Company Assignment Console
        </h1>

        <div style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 22,
          gap: 14
        }}>
          <button
            style={{
              padding: "9px 28px",
              borderRadius: 8,
              border: "none",
              fontWeight: 700,
              background: mode === "existing" ? "#21c6bc" : "#f4f8fa",
              color: mode === "existing" ? "#fff" : "#21c6bc",
              fontSize: 17,
              cursor: "pointer",
              transition: "background 0.16s"
            }}
            onClick={() => setMode("existing")}
          >
            Existing Assignment
          </button>
          <button
            style={{
              padding: "9px 28px",
              borderRadius: 8,
              border: "none",
              fontWeight: 700,
              background: mode === "new" ? "#21c6bc" : "#f4f8fa",
              color: mode === "new" ? "#fff" : "#21c6bc",
              fontSize: 17,
              cursor: "pointer",
              transition: "background 0.16s"
            }}
            onClick={() => setMode("new")}
          >
            New Assignment
          </button>
          <button
            style={{
              padding: "9px 28px",
              borderRadius: 8,
              border: "none",
              fontWeight: 700,
              background: mode === "remove" ? "#21c6bc" : "#f4f8fa",
              color: mode === "remove" ? "#fff" : "#21c6bc",
              fontSize: 17,
              cursor: "pointer",
              transition: "background 0.16s"
            }}
            onClick={() => setMode("remove")}
          >
            Remove Assignment
          </button>
        </div>

        {/* Existing Assignment Section */}
        {mode === "existing" && (
          <div>
            <h3 style={{
              marginBottom: 18,
              color: "#188a84",
              fontWeight: 800,
              fontSize: "1.35rem",
              textAlign: "center"
            }}>
              All Company-Project Assignments
            </h3>
            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              marginBottom: 16,
            }}>
              <input
                type="text"
                value={companySearch}
                placeholder="Search company…"
                onChange={e => setCompanySearch(e.target.value)}
                style={{
                  padding: "7px 15px",
                  borderRadius: 7,
                  border: "1.3px solid #21c6bc",
                  fontSize: 15,
                  minWidth: 220,
                  outline: "none"
                }}
              />
              <input
                type="text"
                value={projectSearch}
                placeholder="Search project…"
                onChange={e => setProjectSearch(e.target.value)}
                style={{
                  padding: "7px 15px",
                  borderRadius: 7,
                  border: "1.3px solid #21c6bc",
                  fontSize: 15,
                  minWidth: 220,
                  outline: "none"
                }}
              />
            </div>
            {loading ? (
              <div>Loading...</div>
            ) : error ? (
              <div style={{ color: "red" }}>{error}</div>
            ) : allAssignments.length === 0 ? (
              <div>No assignments found.</div>
            ) : (
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                margin: "0 auto"
              }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Company</th>
                    <th style={thStyle}>Project ID</th>
                    <th style={thStyle}>Granted At</th>
                  </tr>
                </thead>
                <tbody>
                  {allAssignments
                    .filter(a =>
                      a.company.toLowerCase().includes(companySearch.toLowerCase()) &&
                      (a.projectId.toLowerCase().includes(projectSearch.toLowerCase()))
                    )
                    .map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #e2e2e2" }}>
                        <td style={tdStyle}>{item.company}</td>
                        <td style={tdStyle}>{item.projectId}</td>
                        <td style={tdStyle}>{item.accessGrantedAt && new Date(item.accessGrantedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* New Assignment Section */}
        {mode === "new" && (
          <div>
            <div style={{ marginBottom: 18, textAlign: "center" }}>
              <label style={{ fontWeight: 700, fontSize: 18, marginRight: 6 }}>Select Company:</label>
              <select
                value={selectedCompany}
                onChange={e => setSelectedCompany(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 7,
                  border: "1.3px solid #21c6bc",
                  minWidth: 200,
                  fontSize: 16
                }}
              >
                <option value="">-- Select Company --</option>
                {filteredCompanies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {selectedCompany && (
              <>
                <div style={{ margin: "10px auto 20px auto", maxWidth: 260 }}>
                  <input
                    type="text"
                    value={projectSearch}
                    placeholder="Search project…"
                    onChange={e => setProjectSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "7px 15px",
                      borderRadius: 7,
                      border: "1.3px solid #21c6bc",
                      fontSize: 15,
                      outline: "none"
                    }}
                  />
                </div>
                <h3 style={{
                  color: "#188a84",
                  fontWeight: 800,
                  fontSize: "1.2rem",
                  marginBottom: 12
                }}>
                  Assign Projects to <span style={{ color: "#21c6bc" }}>{selectedCompany}</span>
                </h3>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "18px",
                  margin: "0 auto 28px auto",
                  maxWidth: 600
                }}>
                  {availableProjectsForNew.length === 0 && (
                    <span style={{ color: "#888", fontStyle: "italic" }}>
                      All projects are already assigned to this company.
                    </span>
                  )}
                  {availableProjectsForNew.map((proj) => (
                    <label
                      key={proj.projectId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: selectedForAssign.includes(proj.projectId) ? "#eafffa" : "#f5f5f7",
                        border: selectedForAssign.includes(proj.projectId) ? "1.7px solid #21c6bc" : "1.7px solid #eee",
                        color: "#188a84",
                        borderRadius: 13,
                        fontWeight: 600,
                        padding: "12px 16px",
                        cursor: "pointer",
                        fontSize: 17,
                        gap: 10,
                        transition: "all 0.18s"
                      }}>
                      <input
                        type="checkbox"
                        checked={selectedForAssign.includes(proj.projectId)}
                        onChange={() => handleToggleAssign(proj.projectId)}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: "#21c6bc",
                          marginRight: 9
                        }}
                      />
                      <span>
                        <span style={{ color: "#18b49c", fontWeight: 900 }}>{proj.projectId}</span>
                        {proj.deviceId && <span style={{ color: "#aaa", fontWeight: 400 }}> ({proj.deviceId})</span>}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleSaveAssign}
                  style={{
                    marginTop: 12,
                    padding: "13px 46px",
                    background: "#21c6bc",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 20,
                    letterSpacing: 1.2,
                    cursor: "pointer",
                    boxShadow: "0 3px 12px #23c1b525",
                  }}
                  disabled={loading || selectedForAssign.length === 0}
                >
                  Confirm Assignment
                </button>
              </>
            )}
          </div>
        )}

        {/* Remove Assignment Section */}
        {mode === "remove" && (
          <div>
            <div style={{ marginBottom: 18, textAlign: "center" }}>
              <label style={{ fontWeight: 700, fontSize: 18, marginRight: 6 }}>Select Company:</label>
              <select
                value={selectedCompany}
                onChange={e => setSelectedCompany(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 7,
                  border: "1.3px solid #21c6bc",
                  minWidth: 200,
                  fontSize: 16
                }}
              >
                <option value="">-- Select Company --</option>
                {filteredCompanies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {selectedCompany && (
              <>
                <div style={{ margin: "10px auto 20px auto", maxWidth: 260 }}>
                  <input
                    type="text"
                    value={projectSearch}
                    placeholder="Search project…"
                    onChange={e => setProjectSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "7px 15px",
                      borderRadius: 7,
                      border: "1.3px solid #21c6bc",
                      fontSize: 15,
                      outline: "none"
                    }}
                  />
                </div>
                <h3 style={{
                  color: "#b43d23",
                  fontWeight: 800,
                  fontSize: "1.2rem",
                  marginBottom: 12
                }}>
                  Remove Project Assignments from <span style={{ color: "#21c6bc" }}>{selectedCompany}</span>
                </h3>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "18px",
                  margin: "0 auto 28px auto",
                  maxWidth: 600
                }}>
                  {projectsForRemove.length === 0 && (
                    <span style={{ color: "#888", fontStyle: "italic" }}>
                      No projects assigned to this company.
                    </span>
                  )}
                  {projectsForRemove.map((proj) => (
                    <label
                      key={proj.projectId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: selectedForRemove.includes(proj.projectId) ? "#ffede4" : "#f5f5f7",
                        border: selectedForRemove.includes(proj.projectId) ? "1.7px solid #b43d23" : "1.7px solid #eee",
                        color: "#b43d23",
                        borderRadius: 13,
                        fontWeight: 600,
                        padding: "12px 16px",
                        cursor: "pointer",
                        fontSize: 17,
                        gap: 10,
                        transition: "all 0.18s"
                      }}>
                      <input
                        type="checkbox"
                        checked={selectedForRemove.includes(proj.projectId)}
                        onChange={() => handleToggleRemove(proj.projectId)}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: "#b43d23",
                          marginRight: 9
                        }}
                      />
                      <span>
                        <span style={{ color: "#b43d23", fontWeight: 900 }}>{proj.projectId}</span>
                        {proj.deviceId && <span style={{ color: "#aaa", fontWeight: 400 }}> ({proj.deviceId})</span>}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleRemoveAssignment}
                  style={{
                    marginTop: 12,
                    padding: "13px 46px",
                    background: "#b43d23",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 20,
                    letterSpacing: 1.2,
                    cursor: "pointer",
                    boxShadow: "0 3px 12px #b43d2325",
                  }}
                  disabled={loading || selectedForRemove.length === 0}
                >
                  Remove Assignment
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const thStyle = {
  background: "#dff6f6",
  color: "#23c1b5",
  padding: "10px",
  fontWeight: "700",
  borderBottom: "2px solid #23c1b5",
  textAlign: "left"
};

const tdStyle = {
  padding: "8px 10px",
  color: "#222",
};

export default CompanyProjectAccessPage;
