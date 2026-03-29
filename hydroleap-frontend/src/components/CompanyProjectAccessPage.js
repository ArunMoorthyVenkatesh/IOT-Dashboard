import { useEffect, useState } from "react";
import { FiGrid, FiSearch, FiCheck, FiX, FiPlus, FiMinus, FiBriefcase, FiChevronRight } from "react-icons/fi";
import { getCompanies, getAllProjects, getCompanyAccesses, assignCompanyProjects, removeCompanyProject } from "../services/api";
import "./CompanyProjectAccessPage.css";

const CompanyProjectAccessPage = () => {
  const [companies,         setCompanies]         = useState([]);
  const [projects,          setProjects]          = useState([]);
  const [selectedCompany,   setSelectedCompany]   = useState("");
  const [assignedProjects,  setAssignedProjects]  = useState([]);
  const [allAssignments,    setAllAssignments]    = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [actionLoading,     setActionLoading]     = useState(false);
  const [companySearch,     setCompanySearch]     = useState("");
  const [projectSearch,     setProjectSearch]     = useState("");
  const [selectedForAssign, setSelectedForAssign] = useState([]);
  const [selectedForRemove, setSelectedForRemove] = useState([]);
  const [toast,             setToast]             = useState(null);
  const [tab,               setTab]               = useState("assign"); // "assign" | "remove"

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getCompanies(), getAllProjects(), getCompanyAccesses()])
      .then(([compRes, projRes, accessRes]) => {
        setCompanies((compRes.companies || []).filter(c => c.trim().toLowerCase() !== "hydroleap"));
        setProjects(projRes.projects || []);
        setAllAssignments(accessRes.company_accesses || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      setAssignedProjects(
        allAssignments
          .filter(a => (a.company || "").toLowerCase() === selectedCompany.toLowerCase())
          .map(a => a.projectId)
      );
    } else {
      setAssignedProjects([]);
    }
    setSelectedForAssign([]);
    setSelectedForRemove([]);
  }, [selectedCompany, allAssignments]);

  const refreshAccesses = async () => {
    const res = await getCompanyAccesses();
    setAllAssignments(res.company_accesses || []);
  };

  const filteredCompanies = companies.filter(c =>
    c.toLowerCase().includes(companySearch.toLowerCase())
  );

  const unassignedProjects = projects.filter(p =>
    !assignedProjects.includes(p.projectId) &&
    p.projectId.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const assignedProjectObjs = projects.filter(p =>
    assignedProjects.includes(p.projectId) &&
    p.projectId.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selectedForAssign.length) return;
    setActionLoading(true);
    try {
      await assignCompanyProjects({ company: selectedCompany, projectIds: selectedForAssign });
      await refreshAccesses();
      setSelectedForAssign([]);
      showToast(`${selectedForAssign.length} project(s) assigned to ${selectedCompany}.`);
    } catch { showToast("Failed to assign projects.", "err"); }
    setActionLoading(false);
  };

  const handleRemove = async () => {
    if (!selectedForRemove.length) return;
    setActionLoading(true);
    try {
      await removeCompanyProject({ company: selectedCompany, projectIds: selectedForRemove });
      await refreshAccesses();
      setSelectedForRemove([]);
      showToast(`${selectedForRemove.length} project(s) removed from ${selectedCompany}.`);
    } catch { showToast("Failed to remove projects.", "err"); }
    setActionLoading(false);
  };

  const toggleAssign = (pid) =>
    setSelectedForAssign(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);

  const toggleRemove = (pid) =>
    setSelectedForRemove(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);

  // Stats for selected company
  const selectedAssignments = allAssignments.filter(
    a => (a.company || "").toLowerCase() === selectedCompany.toLowerCase()
  );

  return (
    <div className="cpap-root">

      {/* Toast */}
      {toast && (
        <div className={`cpap-toast cpap-toast--${toast.type}`}>
          {toast.type === "ok" ? <FiCheck size={14} /> : <FiX size={14} />}
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="cpap-loading">
          <div className="db-spinner" />
          <span>Loading…</span>
        </div>
      ) : (
        <div className="cpap-layout">

          {/* ── Left: Company List ── */}
          <div className="cpap-sidebar">
            <div className="cpap-sidebar-hd">
              <FiBriefcase size={14} />
              <span>Companies</span>
              <span className="cpap-sidebar-count">{filteredCompanies.length}</span>
            </div>
            <div className="cpap-sidebar-search">
              <FiSearch size={13} className="cpap-search-icon" />
              <input
                className="cpap-search-input"
                type="text"
                placeholder="Search companies…"
                value={companySearch}
                onChange={e => setCompanySearch(e.target.value)}
              />
            </div>
            <div className="cpap-company-list">
              {filteredCompanies.length === 0 ? (
                <div className="cpap-empty-state">No companies found</div>
              ) : filteredCompanies.map(c => {
                const count = allAssignments.filter(a => (a.company || "").toLowerCase() === c.toLowerCase()).length;
                const isSelected = selectedCompany === c;
                return (
                  <button
                    key={c}
                    className={`cpap-company-row ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedCompany(isSelected ? "" : c)}
                  >
                    <div className="cpap-company-icon">
                      {c.charAt(0).toUpperCase()}
                    </div>
                    <div className="cpap-company-info">
                      <div className="cpap-company-name">{c}</div>
                      <div className="cpap-company-meta">{count} project{count !== 1 ? "s" : ""} assigned</div>
                    </div>
                    <FiChevronRight size={14} className="cpap-company-arrow" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: Project Management ── */}
          <div className="cpap-main">
            {!selectedCompany ? (
              <div className="cpap-empty-main">
                <div className="cpap-empty-main-icon"><FiBriefcase size={32} /></div>
                <div className="cpap-empty-main-title">Select a company</div>
                <div className="cpap-empty-main-sub">Choose a company from the left to manage its project access.</div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="cpap-main-hd">
                  <div>
                    <div className="cpap-main-title">{selectedCompany}</div>
                    <div className="cpap-main-sub">
                      {assignedProjects.length} project{assignedProjects.length !== 1 ? "s" : ""} currently assigned
                    </div>
                  </div>
                  <div className="cpap-main-tabs">
                    <button
                      className={`cpap-main-tab ${tab === "assign" ? "active" : ""}`}
                      onClick={() => { setTab("assign"); setSelectedForAssign([]); }}
                    >
                      <FiPlus size={13} /> Assign
                    </button>
                    <button
                      className={`cpap-main-tab cpap-main-tab--danger ${tab === "remove" ? "active" : ""}`}
                      onClick={() => { setTab("remove"); setSelectedForRemove([]); }}
                    >
                      <FiMinus size={13} /> Remove
                    </button>
                  </div>
                </div>

                {/* Currently assigned strip */}
                {assignedProjects.length > 0 && (
                  <div className="cpap-assigned-strip">
                    <span className="cpap-assigned-strip-lbl">Assigned:</span>
                    {assignedProjects.map(pid => (
                      <span key={pid} className="cpap-assigned-chip">
                        <FiGrid size={10} /> {pid}
                      </span>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className="cpap-proj-search">
                  <FiSearch size={13} className="cpap-search-icon" />
                  <input
                    className="cpap-search-input"
                    type="text"
                    placeholder={tab === "assign" ? "Search unassigned projects…" : "Search assigned projects…"}
                    value={projectSearch}
                    onChange={e => setProjectSearch(e.target.value)}
                  />
                </div>

                {/* Assign tab */}
                {tab === "assign" && (
                  <>
                    <div className="cpap-proj-grid">
                      {unassignedProjects.length === 0 ? (
                        <div className="cpap-empty-state cpap-empty-state--full">
                          All available projects are already assigned to {selectedCompany}.
                        </div>
                      ) : unassignedProjects.map(proj => {
                        const checked = selectedForAssign.includes(proj.projectId);
                        return (
                          <label
                            key={proj.projectId}
                            className={`cpap-proj-card ${checked ? "cpap-proj-card--selected" : ""}`}
                          >
                            <input type="checkbox" checked={checked} onChange={() => toggleAssign(proj.projectId)} />
                            <div className="cpap-proj-icon"><FiGrid size={15} /></div>
                            <div className="cpap-proj-info">
                              <div className="cpap-proj-name">{proj.projectId}</div>
                              {proj.deviceId && <div className="cpap-proj-device">{proj.deviceId}</div>}
                            </div>
                            {checked && <FiCheck size={14} className="cpap-proj-check" />}
                          </label>
                        );
                      })}
                    </div>
                    {selectedForAssign.length > 0 && (
                      <div className="cpap-action-bar">
                        <span className="cpap-action-count">{selectedForAssign.length} selected</span>
                        <button className="cpap-btn-primary" onClick={handleAssign} disabled={actionLoading}>
                          <FiCheck size={14} /> {actionLoading ? "Assigning…" : "Confirm Assignment"}
                        </button>
                        <button className="cpap-btn-ghost" onClick={() => setSelectedForAssign([])}>
                          <FiX size={14} /> Clear
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Remove tab */}
                {tab === "remove" && (
                  <>
                    <div className="cpap-proj-grid">
                      {assignedProjectObjs.length === 0 ? (
                        <div className="cpap-empty-state cpap-empty-state--full">
                          No projects assigned to {selectedCompany} yet.
                        </div>
                      ) : assignedProjectObjs.map(proj => {
                        const checked = selectedForRemove.includes(proj.projectId);
                        return (
                          <label
                            key={proj.projectId}
                            className={`cpap-proj-card cpap-proj-card--removable ${checked ? "cpap-proj-card--remove-selected" : ""}`}
                          >
                            <input type="checkbox" checked={checked} onChange={() => toggleRemove(proj.projectId)} />
                            <div className="cpap-proj-icon cpap-proj-icon--danger"><FiGrid size={15} /></div>
                            <div className="cpap-proj-info">
                              <div className="cpap-proj-name">{proj.projectId}</div>
                              {proj.deviceId && <div className="cpap-proj-device">{proj.deviceId}</div>}
                            </div>
                            {checked && <FiX size={14} className="cpap-proj-check cpap-proj-check--danger" />}
                          </label>
                        );
                      })}
                    </div>
                    {selectedForRemove.length > 0 && (
                      <div className="cpap-action-bar">
                        <span className="cpap-action-count">{selectedForRemove.length} selected</span>
                        <button className="cpap-btn-danger" onClick={handleRemove} disabled={actionLoading}>
                          <FiMinus size={14} /> {actionLoading ? "Removing…" : "Remove Access"}
                        </button>
                        <button className="cpap-btn-ghost" onClick={() => setSelectedForRemove([])}>
                          <FiX size={14} /> Clear
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default CompanyProjectAccessPage;
