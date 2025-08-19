import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiUser, FiMail, FiCheck, FiX, FiSearch, FiPlus } from "react-icons/fi";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";
const accent = "#16c3b0";

const UserProjectAccessPage = () => {
  const [companyName, setCompanyName] = useState("");
  const [adminLoading, setAdminLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [selectedToAssign, setSelectedToAssign] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [searchProject, setSearchProject] = useState("");
  const [message, setMessage] = useState("");

  // 1. Fetch admin company from localStorage or backend
  useEffect(() => {
    async function fetchCompanyFromProfile() {
      try {
        let profile = localStorage.getItem("profile");
        let company = "";
        if (profile) {
          profile = JSON.parse(profile);
          company = profile.company || profile.company_name || profile.companyName || "";
        } else {
          const token = localStorage.getItem("adminToken");
          if (!token) return;
          const res = await axios.get(`${API_BASE}/admin/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          company = res.data.company || res.data.company_name || res.data.companyName || "";
          localStorage.setItem("profile", JSON.stringify(res.data));
        }
        setCompanyName(company.trim());
      } catch (e) {
        setCompanyName("");
      } finally {
        setAdminLoading(false);
      }
    }
    fetchCompanyFromProfile();
  }, []);

  // 2. Fetch users, projects, company accesses
  useEffect(() => {
    if (adminLoading) return;
    setLoading(true);

    Promise.all([
      axios.get(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }}),
      axios.get(`${API_BASE}/projects`, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }}),
      axios.get(`${API_BASE}/company-accesses`, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }}),
    ]).then(([userRes, projRes, companyAccessRes]) => {
      let usersRaw = userRes.data.users || [];
      let projectsRaw = projRes.data.projects || [];
      let companyAccessList = companyAccessRes.data.company_accesses || [];
      let filterCompany = companyName && companyName.toLowerCase() !== "hydroleap";

      if (filterCompany) {
        usersRaw = usersRaw.filter(
          (u) =>
            (u.company_name || "").trim().toLowerCase() === companyName.trim().toLowerCase()
        );
        const accessibleProjectIds = companyAccessList
          .filter(ca => (ca.company || "").trim().toLowerCase() === companyName.trim().toLowerCase())
          .map(ca => ca.projectId);
        projectsRaw = projectsRaw.filter(p => accessibleProjectIds.includes(p.projectId));
      }

      setUsers(usersRaw.map((u) => u.email).filter(Boolean));
      setProjects(projectsRaw);
      setLoading(false);
    }).catch(() => {
      setUsers([]);
      setProjects([]);
      setLoading(false);
    });
  }, [adminLoading, companyName]);

  // 3. Fetch user assignments when email changes
  useEffect(() => {
    if (!selectedEmail) {
      setAssignedProjects([]);
      setSelectedToAssign([]);
      return;
    }
    setLoading(true);
    axios
      .get(
        `${API_BASE}/user-accesses?email=${encodeURIComponent(selectedEmail)}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        }
      )
      .then((res) => {
        const assigned = (res.data.user_accesses || []).map((a) => a.projectId);
        setAssignedProjects(assigned);
        setSelectedToAssign([]);
        setLoading(false);
      })
      .catch(() => {
        setAssignedProjects([]);
        setLoading(false);
      });
  }, [selectedEmail]);

  const handleAssign = async () => {
    if (!selectedEmail || selectedToAssign.length === 0) return;
    setAssigning(true);
    setMessage("");
    try {
      await axios.post(
        `${API_BASE}/user-accesses/assign`,
        {
          email: selectedEmail,
          projectIds: [...assignedProjects, ...selectedToAssign],
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      );
      setMessage(`✅ Projects assigned to ${selectedEmail}`);
      setSelectedToAssign([]);
      const res = await axios.get(
        `${API_BASE}/user-accesses?email=${encodeURIComponent(selectedEmail)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      );
      setAssignedProjects((res.data.user_accesses || []).map((a) => a.projectId));
    } catch {
      setMessage("❌ Failed to assign projects.");
    }
    setAssigning(false);
  };

  const handleRemove = async (pid) => {
    if (!selectedEmail) return;
    if (!window.confirm(`Remove ${selectedEmail}'s access to ${pid}?`)) return;
    setRemoving(true);
    setMessage("");
    try {
      await axios.post(
        `${API_BASE}/user-accesses/remove`,
        { email: selectedEmail, projectId: pid },
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      );
      setMessage(`Removed access to ${pid}`);
      setAssignedProjects((prev) => prev.filter((p) => p !== pid));
    } catch {
      setMessage("❌ Failed to remove access.");
    }
    setRemoving(false);
  };

  // Filtered users and projects for search
  const filteredUsers = users.filter((e) =>
    e.toLowerCase().includes(searchUser.toLowerCase())
  );
  const filteredProjects = projects.filter((p) =>
    (p.projectId || "").toLowerCase().includes(searchProject.toLowerCase())
  );
  const assignableProjects = filteredProjects.filter(
    (p) => !assignedProjects.includes(p.projectId)
  );

  return (
    <div style={ui.root}>
      <div style={ui.panel}>
        <h2 style={ui.heading}>User Project Access Console</h2>
        <div style={ui.flexRow}>
          {/* User List */}
          <div style={ui.sidebar}>
            <div style={ui.sectionTitle}><FiUser style={{ marginRight: 6 }} />Users</div>
            <div style={ui.searchWrap}>
              <FiSearch style={ui.searchIcon} />
              <input
                style={ui.search}
                type="text"
                placeholder="Search users…"
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
              />
            </div>
            <div style={{ margin: "14px 0" }}>
              <select
                style={ui.dropdown}
                value={selectedEmail}
                onChange={e => setSelectedEmail(e.target.value)}
              >
                <option value="">-- Select User Email --</option>
                {filteredUsers.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: 28, textAlign: "center", color: "#bbb", fontSize: 14 }}>
              <FiMail style={{ fontSize: 18, marginBottom: -2 }} /> {companyName}
            </div>
          </div>

          {/* Assignment Panel */}
          <div style={ui.content}>
            {!selectedEmail ? (
              <div style={ui.infoBox}>
                <FiMail style={{ fontSize: 26, color: accent, marginBottom: 5 }} />
                <span>Select a user to view/manage project access.</span>
              </div>
            ) : (
              <div style={{ width: "100%" }}>
                <div style={ui.sectionTitle}><FiCheck style={{ marginRight: 6 }} />Current Assignments</div>
                {loading ? (
                  <div style={ui.infoBox}>Loading…</div>
                ) : assignedProjects.length === 0 ? (
                  <div style={ui.infoBox}>No projects assigned.</div>
                ) : (
                  <ul style={ui.list}>
                    {assignedProjects.map((pid) => (
                      <li key={pid} style={ui.listItem}>
                        <span style={ui.projectId}>{pid}</span>
                        <button
                          style={ui.removeBtn}
                          onClick={() => handleRemove(pid)}
                          disabled={removing}
                          title="Remove assignment"
                        >
                          <FiX />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <hr style={ui.divider} />
                <div style={ui.sectionTitle}><FiPlus style={{ marginRight: 6 }} />Assign New Projects</div>
                <div style={ui.searchWrap}>
                  <FiSearch style={ui.searchIcon} />
                  <input
                    style={ui.search}
                    type="text"
                    placeholder="Search projects…"
                    value={searchProject}
                    onChange={e => setSearchProject(e.target.value)}
                  />
                </div>
                <div style={ui.assignList}>
                  {assignableProjects.length === 0 ? (
                    <div style={ui.infoBox}>No more projects to assign.</div>
                  ) : (
                    assignableProjects.map((p) => (
                      <label key={p.projectId} style={ui.projectLabel}>
                        <input
                          type="checkbox"
                          checked={selectedToAssign.includes(p.projectId)}
                          onChange={() =>
                            setSelectedToAssign((prev) =>
                              prev.includes(p.projectId)
                                ? prev.filter((id) => id !== p.projectId)
                                : [...prev, p.projectId]
                            )
                          }
                          disabled={assigning}
                        />{" "}
                        <b>{p.projectId}</b>
                        {p.deviceId && <span style={ui.deviceId}>({p.deviceId})</span>}
                      </label>
                    ))
                  )}
                </div>
                <button
                  style={ui.confirmBtn}
                  onClick={handleAssign}
                  disabled={assigning || selectedToAssign.length === 0}
                >
                  {assigning ? "Assigning…" : <><FiCheck style={{ marginRight: 7 }} />Confirm Assignment</>}
                </button>
                {message && <div style={ui.message}>{message}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ui = {
  root: {
    width: "100%",
    background: "transparent",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: 0,
    minHeight: "1px",
  },
  panel: {
    width: "100%",
    maxWidth: 1050,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 22,
    boxShadow: "0 8px 44px #1deed218",
    padding: "38px 30px 38px 34px",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "2.2rem",
  },
  heading: {
    color: accent,
    textAlign: "left",
    fontWeight: 900,
    fontSize: "2.35rem",
    marginBottom: 16,
    letterSpacing: "0.5px",
    fontFamily: "Segoe UI, Arial, sans-serif",
    paddingLeft: 4,
  },
  flexRow: {
    display: "flex",
    gap: "2.4rem",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    width: "100%",
  },
  sidebar: {
    minWidth: 280,
    maxWidth: 320,
    width: "27vw",
    background: "#f6fefd",
    borderRadius: 16,
    boxShadow: "0 4px 18px #16c3b016",
    padding: "2.1rem 1.3rem 1.4rem 1.3rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    position: "sticky",
    top: 30,
    zIndex: 2,
  },
  content: {
    minWidth: 400,
    maxWidth: 570,
    width: "43vw",
    background: "#fafdff",
    borderRadius: 18,
    boxShadow: "0 6px 24px #1deed219",
    padding: "2.2rem 2.5rem 1.8rem 2.2rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    position: "relative",
  },
  sectionTitle: {
    fontWeight: 800,
    color: accent,
    fontSize: "1.15rem",
    marginBottom: 12,
    letterSpacing: "0.1px",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center"
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    background: "#f4fafa",
    borderRadius: 7,
    border: "1.5px solid #daf4f2",
    marginBottom: 13,
    marginTop: 0,
    padding: "3px 10px",
  },
  searchIcon: {
    color: "#b9b9b9",
    fontSize: 18,
    marginRight: 4,
  },
  search: {
    flex: 1,
    background: "transparent",
    border: "none",
    fontSize: "1.03rem",
    outline: "none",
    padding: "7px 3px",
    color: "#188a84",
    fontWeight: 600,
  },
  dropdown: {
    width: "100%",
    padding: "0.98rem",
    borderRadius: 8,
    border: "2px solid #e0f7f7",
    background: "#fcfefd",
    color: "#159c92",
    fontWeight: 700,
    fontSize: "1.07rem",
    outline: "none",
    textAlign: "center",
    fontFamily: "inherit",
    marginTop: 3,
  },
  infoBox: {
    background: "#f5fbfb",
    color: "#84a2a8",
    border: "1.5px dashed #b0e4e0",
    borderRadius: 12,
    fontWeight: 700,
    padding: "28px 12px 26px 12px",
    margin: "20px 0",
    textAlign: "center",
    fontSize: "1.08rem",
    minHeight: 68,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 14px 0",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    background: "#f0fcf7",
    borderRadius: 8,
    padding: "10px 15px",
    marginBottom: 9,
    boxShadow: "0 1px 10px #09b1c012",
    fontWeight: 700,
    fontSize: "1.11rem",
    color: "#179a8a",
    justifyContent: "space-between",
  },
  projectId: {
    fontWeight: 900,
    color: accent,
    fontSize: "1.1rem",
    letterSpacing: "0.12px",
  },
  removeBtn: {
    background: "#fb5b5b",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "7px 13px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: "1.07rem",
    marginLeft: 18,
    transition: "background 0.14s",
    boxShadow: "0 1px 6px #fb5b5b18",
    outline: "none",
    display: "flex",
    alignItems: "center"
  },
  divider: {
    border: 0,
    borderBottom: "2px solid #e6f3fc",
    margin: "1.5rem 0 1.3rem 0",
  },
  assignList: {
    background: "#f4fbfa",
    borderRadius: 8,
    padding: "1.3rem 1rem 1.1rem 1rem",
    marginBottom: 18,
    minHeight: 70,
    boxShadow: "0 1px 8px #0ab1c00e",
    maxHeight: 178,
    overflowY: "auto",
  },
  projectLabel: {
    display: "block",
    margin: "8px 0",
    cursor: "pointer",
    fontSize: "1.09rem",
    fontWeight: 600,
    color: "#1d8189",
    borderRadius: 6,
    padding: "2px 6px",
    transition: "background 0.13s",
    lineHeight: 1.7,
  },
  deviceId: {
    color: "#b6c9cf",
    marginLeft: 5,
    fontSize: 13,
    fontWeight: 500,
  },
  confirmBtn: {
    marginTop: 8,
    padding: "0.92rem 2.5rem",
    background: accent,
    color: "#fff",
    border: "none",
    borderRadius: 9,
    fontWeight: 900,
    fontSize: "1.18rem",
    cursor: "pointer",
    boxShadow: "0 2px 8px #0ab1c01b",
    transition: "background 0.15s, box-shadow 0.15s",
    alignSelf: "flex-end",
    display: "flex",
    alignItems: "center"
  },
  message: {
    color: accent,
    fontWeight: 800,
    fontSize: "1.11rem",
    padding: "7px 0",
    minHeight: 28,
    marginTop: 8,
    marginBottom: 0,
    textAlign: "center",
  },
};

export default UserProjectAccessPage;
