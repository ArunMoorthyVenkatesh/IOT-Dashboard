import { useEffect, useState } from "react";
import { getPendingProfileUpdates, handleProfileUpdateRequest } from "../services/api";
import { FiUser, FiSearch, FiCheck, FiX, FiShield, FiClock, FiArrowRight, FiInbox } from "react-icons/fi";
import "./PendingProfileApproval.css";


const FIELD_LABELS = {
  name:   "Full Name",
  phone:  "Phone",
  dob:    "Date of Birth",
  gender: "Gender",
};

export default function PendingProfileApproval() {
  const [requests,     setRequests]     = useState([]);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("");
  const [selected,     setSelected]     = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast,        setToast]        = useState(null);
  const [loading,      setLoading]      = useState(true);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPendingProfileUpdates();
      setRequests(data || []);
    } catch {
      setError("Unable to fetch pending profile updates.");
    } finally {
      setLoading(false);
    }
  };

  const handle = async (requestId, action) => {
    setActionLoading(true);
    try {
      await handleProfileUpdateRequest({ id: requestId, action });
      setRequests(prev => prev.filter(r => r.request_id !== requestId));
      setSelected(null);
      showToast(action === "approve" ? "Profile update approved and applied." : "Profile update rejected.");
    } catch {
      showToast("Action failed. Please try again.", "err");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = requests.filter(r => {
    const s = search.toLowerCase();
    const matchesSearch =
      (r.display_name || "").toLowerCase().includes(s) ||
      (r.email        || "").toLowerCase().includes(s);
    const matchesType = typeFilter === "" || r.account_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const changedFields = selected ? Object.keys(selected.requested_fields || {}) : [];

  return (
    <div className="ppa-root">

      {/* Toast */}
      {toast && (
        <div className={`ppa-toast ppa-toast--${toast.type}`}>
          {toast.type === "ok" ? <FiCheck size={14} /> : <FiX size={14} />}
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="ppa-loading">
          <div className="db-spinner" />
          <span>Loading…</span>
        </div>
      ) : error ? (
        <div className="ppa-loading"><span className="ppa-error">{error}</span></div>
      ) : (
        <div className="ppa-layout">

          {/* ── Left: Request List ── */}
          <div className="ppa-sidebar">
            <div className="ppa-sidebar-hd">
              <FiUser size={14} />
              <span>Profile Requests</span>
              <span className="ppa-sidebar-count">{filtered.length}</span>
            </div>

            {/* Search */}
            <div className="ppa-sidebar-search">
              <FiSearch size={13} className="ppa-search-icon" />
              <input
                className="ppa-search-input"
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Type filter */}
            <div className="ppa-type-filter">
              {["", "user", "admin"].map(t => (
                <button
                  key={t}
                  className={`ppa-type-btn${typeFilter === t ? " active" : ""}`}
                  onClick={() => setTypeFilter(t)}
                >
                  {t === "" ? "All" : t === "user" ? "Users" : "Admins"}
                </button>
              ))}
            </div>

            <div className="ppa-request-list">
              {filtered.length === 0 ? (
                <div className="ppa-empty-list">No pending requests.</div>
              ) : filtered.map(req => {
                const isSelected = selected?.request_id === req.request_id;
                const fieldCount = Object.keys(req.requested_fields || {}).length;
                return (
                  <button
                    key={req.request_id}
                    className={`ppa-req-row ${isSelected ? "active" : ""}`}
                    onClick={() => setSelected(isSelected ? null : req)}
                  >
                    <div className="ppa-req-avatar">
                      {(req.display_name || req.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="ppa-req-info">
                      <div className="ppa-req-name">{req.display_name || req.email}</div>
                      <div className="ppa-req-meta">
                        <span className={`ppa-badge ppa-badge--${req.account_type === "admin" ? "admin" : "user"}`}>
                          {req.account_type === "admin" ? "Admin" : "User"}
                        </span>
                        <span className="ppa-req-fields">{fieldCount} field{fieldCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    {req.requested_at && (
                      <div className="ppa-req-time">
                        <FiClock size={10} />
                        {new Date(req.requested_at).toLocaleDateString()}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: Detail Panel ── */}
          <div className="ppa-main">
            {!selected ? (
              <div className="ppa-empty-main">
                <div className="ppa-empty-main-icon"><FiInbox size={32} /></div>
                <div className="ppa-empty-main-title">Select a request</div>
                <div className="ppa-empty-main-sub">Choose a pending profile update from the left to review the changes.</div>
              </div>
            ) : (
              <>
                {/* Detail header */}
                <div className="ppa-detail-hd">
                  <div className="ppa-detail-avatar">
                    {(selected.display_name || selected.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="ppa-detail-identity">
                    <div className="ppa-detail-name">{selected.display_name || selected.email}</div>
                    <div className="ppa-detail-sub">
                      <span>{selected.email}</span>
                      {selected.company_name && <span>· {selected.company_name}</span>}
                      <span className={`ppa-badge ppa-badge--${selected.account_type === "admin" ? "admin" : "user"}`}>
                        {selected.account_type === "admin"
                          ? <><FiShield size={10} /> Admin</>
                          : <><FiUser size={10} /> User</>}
                      </span>
                    </div>
                  </div>
                  {selected.requested_at && (
                    <div className="ppa-detail-time">
                      <FiClock size={12} />
                      {new Date(selected.requested_at).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Diff table */}
                <div className="ppa-diff-section">
                  <div className="ppa-diff-label-row">
                    <span className="ppa-diff-col-hd">Field</span>
                    <span className="ppa-diff-col-hd">Current Value</span>
                    <span className="ppa-diff-col-hd ppa-diff-col-hd--arrow"></span>
                    <span className="ppa-diff-col-hd">Requested Value</span>
                  </div>
                  {changedFields.length === 0 ? (
                    <div className="ppa-diff-empty">No field changes recorded.</div>
                  ) : changedFields.map(k => (
                    <div key={k} className="ppa-diff-row">
                      <span className="ppa-diff-field">{FIELD_LABELS[k] || k}</span>
                      <span className="ppa-diff-old">
                        {selected.current_fields?.[k] || <span className="ppa-faint">—</span>}
                      </span>
                      <FiArrowRight size={14} className="ppa-diff-arrow" />
                      <span className="ppa-diff-new">
                        {selected.requested_fields[k] || <span className="ppa-faint">—</span>}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action bar */}
                <div className="ppa-action-bar">
                  <button
                    className="ppa-btn-approve"
                    onClick={() => handle(selected.request_id, "approve")}
                    disabled={actionLoading}
                  >
                    <FiCheck size={14} />
                    {actionLoading ? "Applying…" : "Approve Changes"}
                  </button>
                  <button
                    className="ppa-btn-reject"
                    onClick={() => handle(selected.request_id, "reject")}
                    disabled={actionLoading}
                  >
                    <FiX size={14} />
                    {actionLoading ? "Rejecting…" : "Reject"}
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
