import { useEffect, useState } from "react";
import { getPendingUsers, handleUserRequest } from "../services/api";
import {
  FiUserPlus, FiSearch, FiCheck, FiX, FiClock,
  FiMail, FiPhone, FiCalendar, FiUsers, FiInbox, FiBriefcase,
} from "react-icons/fi";
import "./PendingApproval.css";

const PendingUserApprovalSection = () => {
  const [pendingUsers,  setPendingUsers]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [search,        setSearch]        = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [companyName,   setCompanyName]   = useState("");
  const [selected,      setSelected]      = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast,         setToast]         = useState(null);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("profile") || "{}");
      setCompanyName(p.company_name || "");
    } catch {}
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getPendingUsers();
      setPendingUsers(res || []);
    } catch {
      setError("Unable to fetch pending users.");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = pendingUsers.filter(u => {
    const s = search.toLowerCase();
    const c = companyFilter.toLowerCase();
    const fullName = [u.name, u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = fullName.includes(s) || (u.email || "").toLowerCase().includes(s);
    const matchesCompany = c === "" ||
      (u.company_name || "").toLowerCase().includes(c) ||
      (u.companyName  || "").toLowerCase().includes(c);
    if (companyName && companyName.toLowerCase() === "hydroleap") return matchesSearch && matchesCompany;
    const userCompany = u.company_name || u.companyName || "";
    return userCompany === companyName && matchesSearch && matchesCompany;
  });

  const handleAction = async (userId, action) => {
    setActionLoading(true);
    try {
      await handleUserRequest({ id: userId, action });
      setPendingUsers(prev => prev.filter(u => u.user_id !== userId && u._id !== userId));
      setSelected(null);
      showToast(action === "approve" ? "User approved successfully." : "User rejected.");
    } catch {
      showToast("Action failed. Please try again.", "err");
    } finally {
      setActionLoading(false);
    }
  };

  const getName = u =>
    u.name || [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ") || u.email || "Unknown";

  return (
    <div className="pa-root">
      {toast && (
        <div className={`pa-toast pa-toast--${toast.type}`}>
          {toast.type === "ok" ? <FiCheck size={14} /> : <FiX size={14} />}
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="pa-loading"><div className="db-spinner" /><span>Loading…</span></div>
      ) : error ? (
        <div className="pa-loading"><span className="pa-error">{error}</span></div>
      ) : (
        <div className="pa-layout">

          {/* ── Left: User List ── */}
          <div className="pa-sidebar">
            <div className="pa-sidebar-hd">
              <FiUserPlus size={14} />
              <span>Pending Users</span>
              <span className="pa-sidebar-count">{filteredUsers.length}</span>
            </div>

            <div className="pa-sidebar-search">
              <FiSearch size={13} className="pa-search-icon" />
              <input
                className="pa-search-input"
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="pa-sidebar-search pa-sidebar-search--company">
              <FiBriefcase size={13} className="pa-search-icon" />
              <input
                className="pa-search-input"
                type="text"
                placeholder="Filter by company…"
                value={companyFilter}
                onChange={e => setCompanyFilter(e.target.value)}
              />
            </div>

            <div className="pa-list">
              {filteredUsers.length === 0 ? (
                <div className="pa-empty-list">No pending users.</div>
              ) : filteredUsers.map(u => {
                const id = u.user_id || u._id;
                const isSelected = selected?.user_id === id || selected?._id === id;
                const name = getName(u);
                const company = u.company_name || u.companyName || "";
                return (
                  <button
                    key={id}
                    className={`pa-row ${isSelected ? "active" : ""}`}
                    onClick={() => setSelected(isSelected ? null : u)}
                  >
                    <div className="pa-avatar">{name.charAt(0).toUpperCase()}</div>
                    <div className="pa-row-info">
                      <div className="pa-row-name">{name}</div>
                      <div className="pa-row-meta">
                        {u.email && <span className="pa-row-email">{u.email}</span>}
                        {company && <span className="pa-row-company">{company}</span>}
                      </div>
                    </div>
                    {(u.created_at || u.createdAt) && (
                      <div className="pa-row-time">
                        <FiClock size={10} />
                        {new Date(u.created_at || u.createdAt).toLocaleDateString()}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: Detail Panel ── */}
          <div className="pa-main">
            {!selected ? (
              <div className="pa-empty-main">
                <div className="pa-empty-main-icon"><FiInbox size={32} /></div>
                <div className="pa-empty-main-title">Select a user</div>
                <div className="pa-empty-main-sub">Choose a pending registration to review their details and approve or reject.</div>
              </div>
            ) : (
              <>
                <div className="pa-detail-hd">
                  <div className="pa-detail-avatar">{getName(selected).charAt(0).toUpperCase()}</div>
                  <div className="pa-detail-identity">
                    <div className="pa-detail-name">{getName(selected)}</div>
                    <div className="pa-detail-sub">
                      {selected.email && <span>{selected.email}</span>}
                      {(selected.company_name || selected.companyName) && (
                        <span>· {selected.company_name || selected.companyName}</span>
                      )}
                    </div>
                  </div>
                  {(selected.created_at || selected.createdAt) && (
                    <div className="pa-detail-time">
                      <FiClock size={12} />
                      {new Date(selected.created_at || selected.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="pa-detail-body">
                  <div className="pa-info-grid">
                    {[
                      { icon: <FiMail size={14} />,     label: "Email",   value: selected.email },
                      { icon: <FiPhone size={14} />,    label: "Phone",   value: selected.phone },
                      { icon: <FiCalendar size={14} />, label: "DOB",     value: selected.dob },
                      { icon: <FiUsers size={14} />,    label: "Gender",  value: selected.gender },
                      { icon: <FiBriefcase size={14} />,label: "Company", value: selected.company_name || selected.companyName },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="pa-info-row">
                        <div className="pa-info-label">{icon}{label}</div>
                        <div className="pa-info-value">{value || <span className="pa-faint">N/A</span>}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pa-action-bar">
                  <button
                    className="pa-btn-approve"
                    onClick={() => handleAction(selected.user_id || selected._id, "approve")}
                    disabled={actionLoading}
                  >
                    <FiCheck size={14} />
                    {actionLoading ? "Processing…" : "Approve"}
                  </button>
                  <button
                    className="pa-btn-reject"
                    onClick={() => handleAction(selected.user_id || selected._id, "reject")}
                    disabled={actionLoading}
                  >
                    <FiX size={14} />
                    {actionLoading ? "Processing…" : "Reject"}
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default PendingUserApprovalSection;
