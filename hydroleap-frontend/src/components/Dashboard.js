/**
 * Dashboard — Unified post-login shell for both users and admins.
 *
 * After login, all roles land here. The sidebar nav and main content
 * area adapt based on the authenticated role ("user" | "admin").
 *
 * User sections:   Dashboard (overview), Projects (→ IoT inline), Profile
 * Admin sections:  Profile, Approvals, Projects, Project Access,
 *                  People, Company Access (Hydroleap only)
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMenu, FiUser, FiCheckCircle, FiGrid,
  FiLink, FiUsers, FiGlobe, FiLogOut, FiChevronRight,
  FiActivity, FiWifi, FiZap, FiThermometer, FiBarChart2,
  FiArrowLeft, FiEdit2, FiCheck, FiX, FiHome, FiStar, FiSun, FiMoon, FiFileText,
  FiClock, FiInfo, FiMail, FiHelpCircle, FiMapPin, FiExternalLink,
  FiBookOpen, FiMessageSquare, FiCrosshair, FiRefreshCw,
  FiBell, FiUserPlus, FiShield, FiAlertCircle, FiTrendingUp,
  FiSearch, FiPlus,
} from "react-icons/fi";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  getUserAccesses, getAllProjects, getCloudWatchLogs,
  getStarredProjects, toggleStarredProject, requestProfileUpdate,
  getPendingUsers, getPendingAdmins, getPendingProfileUpdates,
  getAllUsers, getAllAdmins,
  getAdminProfile, getCompanyAccesses, assignUserProjects, removeUserProject,
  requestAdminProfileUpdate, getUserNotifications, markUserNotificationsRead,
  changePassword, changeAdminPassword, getActiveSessions, revokeOtherSessions, logoutSession, updateSessionDevice,
} from "../services/api";
import PendingUserApproval from "./PendingUserApproval";
import PendingAdminApproval from "./PendingAdminApproval";
import PendingProfileApproval from "./PendingProfileApproval";
import AllProjects from "./AllProjects";
import CompanyProjectAccessPage from "./CompanyProjectAccessPage";
import UserListSection from "./UserListSection";
import AdminListSection from "./AdminListSection";
import IoTDashboard from "./IoTDashboard";
import ReportBuilderSection from "./ReportBuilderSection";
import { pushSessionEntry, readSessionHistory } from "../utils/sessionHistory";
import hydroleapLogo from "../assets/hydroleap-logo.png";
import "./AdminDashboard.css";
import "./Dashboard.css";
import "./ProjectAccessPage.css";
import "./AdminProfileSection.css";


// ── Project card colours / icons ───────────────────────────────────────────────

const CARD_COLORS = ["card-green", "card-blue", "card-orange", "card-red", "card-purple"];
const CARD_ICONS  = [
  <FiActivity size={20} />,
  <FiWifi     size={20} />,
  <FiZap      size={20} />,
  <FiThermometer size={20} />,
  <FiBarChart2 size={20} />,
];

const getProjectId = (p) => p?.asset_id || p;

// ── Activity tracking (sessionStorage) ────────────────────────────────────────

const ACTIVITY_KEY = "hl_recent_activity";

function pushActivity(entry) {
  try {
    const prev = JSON.parse(sessionStorage.getItem(ACTIVITY_KEY) || "[]");
    sessionStorage.setItem(ACTIVITY_KEY, JSON.stringify([{ ...entry, ts: Date.now() }, ...prev].slice(0, 20)));
  } catch {}
}

function readActivity() {
  try { return JSON.parse(sessionStorage.getItem(ACTIVITY_KEY) || "[]"); } catch { return []; }
}

function fmtRelTime(ts) {
  const d = new Date(ts);
  const t = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return `Today, ${t}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${t}`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + `, ${t}`;
}

// ── Overview project icon colour sets ─────────────────────────────────────────

const PROJ_ICON_SETS = [
  { iconBg: "rgba(15,110,86,0.11)",  iconColor: "#0F6E56" },
  { iconBg: "rgba(24,95,165,0.11)",  iconColor: "#185FA5" },
  { iconBg: "rgba(133,79,11,0.11)",  iconColor: "#854F0B" },
  { iconBg: "rgba(163,45,45,0.11)",  iconColor: "#A32D2D" },
  { iconBg: "rgba(90,45,163,0.11)",  iconColor: "#5A2DA3" },
];

// ── User: Overview / Dashboard Section ────────────────────────────────────────

const UserOverviewSection = ({ onSelectProject, onNavigateToProjects, starred = [], onViewReport, notifications = [], onDismissNotifs }) => {
  const [projects,    setProjects]    = useState([]);
  const [projLoading, setProjLoading] = useState(true);
  const [recentPids,  setRecentPids]  = useState([]);

  const profile = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("profile") || "{}"); } catch { return {}; }
  }, []);

  const displayName = profile.name ||
    [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ") ||
    profile.email?.split("@")[0] || "there";

  useEffect(() => {
    const load = async () => {
      try {
        const email = profile.email || "";
        if (!email) return;
        const accessRes = await getUserAccesses(email);
        let accesses = Array.isArray(accessRes)
          ? accessRes
          : accessRes?.user_accesses || accessRes?.projects || Object.values(accessRes || {});
        const ids = accesses.map(getProjectId).filter(Boolean);
        if (!ids.length) return;
        const projRes = await getAllProjects();
        const all     = Array.isArray(projRes) ? projRes : projRes.projects || [];
        setProjects(all.filter(pr => ids.includes(getProjectId(pr))));
      } catch {}
      finally { setProjLoading(false); }
    };
    load();

    // Derive recently viewed project IDs from session activity
    const activity = readActivity();
    const seen = []; const seenSet = new Set();
    for (const entry of activity) {
      if (entry.verb === "Viewed" && entry.subject) {
        const pid = entry.subject.split(" ")[0];
        if (pid && !seenSet.has(pid)) { seen.push(pid); seenSet.add(pid); }
        if (seen.length >= 3) break;
      }
    }
    setRecentPids(seen);
  }, [profile.email]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const starredProjects = projects.filter(p => starred.includes(getProjectId(p)));
  const recentProjects  = recentPids.map(pid => projects.find(p => getProjectId(p) === pid)).filter(Boolean);
  const reportHistory   = (() => {
    try {
      const key = `hl_report_history_${profile.email || "unknown"}`;
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch { return []; }
  })();
  const lastLogin = (() => {
    const history = readSessionHistory(profile.email);
    // Find the second login entry (first is current session)
    const logins = history.filter(e => e.type === "login");
    const entry  = logins.length > 1 ? logins[1] : logins[0];
    return entry ? fmtRelTime(entry.ts) : "First session";
  })();

  if (projLoading) return (
    <div className="db-loading" role="status">
      <div className="db-spinner" />
      <span>Loading dashboard…</span>
    </div>
  );

  return (
    <div className="ov-root">

      {/* ── Welcome ── */}
      <div className="ov-welcome">
        <div className="ov-welcome-greeting">Welcome back, {displayName}</div>
        <div className="ov-welcome-date">{today}</div>
      </div>

      {/* ── Stats ── */}
      <div className="ov-stats-grid">
        <div className="ov-stat-card">
          <div className="ov-stat-lbl">Active Projects</div>
          <div className="ov-stat-val">{projects.length}</div>
          <div className="ov-stat-sub ov-green">{projects.length > 0 ? "All assigned" : "None yet"}</div>
        </div>
        <div className="ov-stat-card">
          <div className="ov-stat-lbl">Total Devices</div>
          <div className="ov-stat-val">{projects.length}</div>
          <div className="ov-stat-sub ov-muted">{projects.length === 1 ? "IoT device" : "IoT devices"} online</div>
        </div>
        <div className="ov-stat-card">
          <div className="ov-stat-lbl">Last Login</div>
          <div className="ov-stat-val" style={{ fontSize: "1rem", paddingTop: 4 }}>{lastLogin}</div>
        </div>
      </div>

      {/* ── Notifications ── */}
      {notifications.length > 0 && (
        <>
          <div className="ov-section-label">Notifications</div>
          <div className="ov-notif-card">
            <div className="ov-notif-list">
              {notifications.map(n => (
                <div key={n.notification_id} className="ov-notif-row">
                  <div className="ov-notif-icon"><FiCheckCircle size={14} /></div>
                  <div className="ov-notif-body">
                    <div className="ov-notif-msg">{n.message}</div>
                    {n.created_at && (
                      <div className="ov-notif-time">
                        {fmtRelTime(new Date(n.created_at).getTime())}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="ov-notif-dismiss" onClick={onDismissNotifs}>
              Mark all as read
            </button>
          </div>
        </>
      )}

      {/* ── Recently viewed ── */}
      {recentProjects.length > 0 && (
        <>
          <div className="ov-section-label">Recently Viewed</div>
          <div className="ov-recent-grid">
            {recentProjects.map((proj, i) => {
              const pid       = getProjectId(proj);
              const colors    = PROJ_ICON_SETS[i % PROJ_ICON_SETS.length];
              const isStarred = starred.includes(pid);
              return (
                <button key={pid} className="ov-recent-card" onClick={() => onSelectProject(pid)}>
                  <div className="ov-recent-icon" style={{ background: colors.iconBg }}>
                    <svg viewBox="0 0 16 16" fill="none" stroke={colors.iconColor} strokeWidth="1.5" aria-hidden="true">
                      <path d="M2 10 Q4 6 8 8 Q12 10 14 6"/>
                    </svg>
                  </div>
                  <div className="ov-recent-name">{pid}</div>
                  <div className="ov-recent-meta">
                    {isStarred && <FiStar size={11} className="ov-recent-star" />}
                    <span>View live data →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Starred projects ── */}

      {/* ── Latest report ── */}
      <div className="ov-section-label">Latest Report</div>
      {reportHistory.length === 0 ? (
        <div className="ov-card">
          <div className="ov-empty-row">No reports generated yet — head to Reports to get started.</div>
        </div>
      ) : (() => {
        const r = reportHistory[0];
        return (
          <div className="ov-report-card" onClick={() => onViewReport?.(r)} style={{ cursor: "pointer" }}>
            <div className="ov-report-card-top">
              <div className="ov-report-icon">
                <FiFileText size={14} style={{ color: "#6366f1" }} />
              </div>
              <div className="ov-report-main">
                <div className="ov-report-project">{r.project}</div>
                <div className="ov-report-time">{fmtRelTime(r.ts)}</div>
              </div>
              {r.dataTypes?.length > 0 && (
                <div className="ov-report-tags">
                  {r.dataTypes.map(dt => (
                    <span key={dt} className="ov-report-tag">{dt.charAt(0).toUpperCase() + dt.slice(1)}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="ov-report-meta">
              {r.dateFrom && r.dateTo && (
                <div className="ov-report-meta-row">
                  <span className="ov-report-meta-lbl">Date Range</span>
                  <span className="ov-report-meta-val">{r.dateFrom} → {r.dateTo}</span>
                </div>
              )}
              <div className="ov-report-meta-row">
                <span className="ov-report-meta-lbl">Fields ({r.fields.length})</span>
                <span className="ov-report-meta-val ov-report-fields">
                  {r.fields.map(f => <span key={f} className="ov-report-field-chip">{f}</span>)}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

// ── User: Projects Section ─────────────────────────────────────────────────────

const UserProjectsSection = ({ onSelectProject, starred = [], onToggleStar }) => {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const fetchProjects = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      const p     = JSON.parse(localStorage.getItem("profile") || "{}");
      const email = p.email || "";
      if (!email) {
        setError("No user email found. Please log in again.");
        setLoading(false);
        return;
      }
      const accessRes = await getUserAccesses(email);
      let accesses = Array.isArray(accessRes)
        ? accessRes
        : accessRes?.user_accesses || accessRes?.projects || Object.values(accessRes || {});
      const ids = accesses.map(getProjectId).filter(Boolean);
      if (!ids.length) { setProjects([]); setLoading(false); return; }

      const projRes   = await getAllProjects();
      const allProjects = Array.isArray(projRes) ? projRes : projRes.projects || [];
      setProjects(allProjects.filter(p => ids.includes(getProjectId(p))));
    } catch (err) {
      setError(err.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 30000);
    return () => clearInterval(interval);
  }, [fetchProjects]);

  if (loading) return (
    <div className="db-loading" role="status" aria-label="Loading projects…">
      <div className="db-spinner" />
      <span>Loading projects…</span>
    </div>
  );

  if (error) return (
    <div className="db-error-msg" role="alert">{error}</div>
  );

  if (!projects.length) return (
    <div className="db-empty">
      <FiGrid size={32} style={{ color: "var(--text-4)", marginBottom: 10 }} />
      <p>No projects assigned yet.</p>
      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-4)" }}>
        Contact your admin to get access to projects.
      </p>
    </div>
  );

  return (
    <div className="db-projects-grid">
      {projects.map((project, i) => {
        const pid      = getProjectId(project);
        const colorKey = CARD_COLORS[i % CARD_COLORS.length];
        const icon     = CARD_ICONS[i % CARD_ICONS.length];
        return (
          <div key={pid} className={`db-project-card ${colorKey}`}>
            <button
              className="db-project-star"
              onClick={() => onToggleStar(pid)}
              disabled={!starred.includes(pid) && starred.length >= 3}
              title={starred.includes(pid) ? "Unstar" : starred.length >= 3 ? "Max 3 starred projects" : "Star project"}
            >
              <FiStar size={13} className={starred.includes(pid) ? "starred" : ""} />
            </button>
            <button
              className="db-project-card-inner"
              onClick={() => onSelectProject(pid)}
              aria-label={`Open project ${pid}`}
            >
              <div className="db-project-card-icon">{icon}</div>
              <div className="db-project-card-id">{pid}</div>
              <div className="db-project-card-status">
                <span className="db-live-dot" />
                LIVE
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ── User: Profile Section ──────────────────────────────────────────────────────

const UserProfileSection = () => {
  const [profile,   setProfile]   = useState(null);
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState({});
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving,    setSaving]    = useState(false);

  const [pwOpen,    setPwOpen]    = useState(false);
  const [pwDraft,   setPwDraft]   = useState({ current: "", next: "", confirm: "" });
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwSaved,   setPwSaved]   = useState(false);
  const [pwError,   setPwError]   = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("profile");
      if (stored) setProfile(JSON.parse(stored));
    } catch {}
  }, []);

  const startEdit = () => {
    setDraft({
      name:   profile?.name || [profile?.firstName, profile?.middleName, profile?.lastName].filter(Boolean).join(" "),
      phone:  profile?.phone  || "",
      dob:    profile?.dob    || "",
      gender: profile?.gender || "",
    });
    setEditing(true);
    setSaved(false);
    setSaveError("");
  };

  const cancelEdit = () => { setEditing(false); setDraft({}); setSaveError(""); };

  const savePassword = async () => {
    setPwError(""); setPwSaved(false);
    if (!pwDraft.current) { setPwError("Enter your current password."); return; }
    if (pwDraft.next !== pwDraft.confirm) { setPwError("New passwords do not match."); return; }
    if (pwDraft.next.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    setPwSaving(true);
    try {
      await changePassword({ current_password: pwDraft.current, new_password: pwDraft.next, confirm_password: pwDraft.confirm });
      setPwSaved(true);
      setPwDraft({ current: "", next: "", confirm: "" });
      setPwOpen(false);
      setTimeout(() => setPwSaved(false), 5000);
    } catch (err) {
      setPwError(err.message || "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  };

  const saveEdit = async () => {
    setSaving(true); setSaveError("");
    try {
      const payload = { name: draft.name, phone: draft.phone, dob: draft.dob, gender: draft.gender };
      Object.keys(payload).forEach(k => { if (!payload[k]) delete payload[k]; });
      await requestProfileUpdate(payload);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    } catch (err) {
      setSaveError(err.message || "Failed to submit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return (
    <div className="db-loading" role="status">
      <div className="db-spinner" />
      <span>Loading profile…</span>
    </div>
  );

  const displayName = profile.name ||
    [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ") ||
    "—";
  const initials = displayName !== "—"
    ? displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";
  const isVerified = profile.email_verified || profile.emailVerified;
  const company    = profile.company || profile.company_name;

  return (
    <div className="up-wrap">

      {/* ── Hero ── */}
      <div className="up-hero">
        <div className="up-hero-bg" />
        <div className="up-hero-body">
          <div className="up-avatar">{initials}</div>
          <div className="up-hero-text">
            <div className="up-hero-name">{displayName}</div>
            <div className="up-hero-email">
              {profile.email || "—"}
              {isVerified && (
                <span className="up-verified"><FiCheckCircle size={11} /> Verified</span>
              )}
            </div>
            {company && <span className="up-company-chip">{company}</span>}
          </div>
        </div>
      </div>

      {saved && (
        <div className="up-banner up-banner--ok" role="status">
          <FiCheck size={13} /> Update submitted — pending admin approval.
        </div>
      )}
      {saveError && <div className="up-banner up-banner--err" role="alert">{saveError}</div>}

      {/* ── Personal Information ── */}
      <div className="up-card">
        <div className="up-card-hd">
          <FiUser size={14} />
          <span>Personal Information</span>
          {!editing && (
            <button className="up-card-action" onClick={startEdit}>
              <FiEdit2 size={12} /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="up-form">
            <div className="up-form-grid">
              <UpField label="Full Name"     value={draft.name}   onChange={v => setDraft(d => ({ ...d, name: v }))} />
              <UpField label="Phone"         value={draft.phone}  onChange={v => setDraft(d => ({ ...d, phone: v }))} />
              <UpField label="Date of Birth" value={draft.dob}    type="date" onChange={v => setDraft(d => ({ ...d, dob: v }))} />
              <div className="up-form-field">
                <label className="up-form-label">Gender</label>
                <select className="up-form-input" value={draft.gender}
                  onChange={e => setDraft(d => ({ ...d, gender: e.target.value }))}>
                  <option value="">Select</option>
                  {["Male", "Female", "Non-binary", "Prefer not to say"].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="up-form-actions">
              <button className="up-btn-primary" onClick={saveEdit} disabled={saving}>
                <FiCheck size={13} /> {saving ? "Saving…" : "Save Changes"}
              </button>
              <button className="up-btn-ghost" onClick={cancelEdit}>
                <FiX size={13} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="up-info-grid">
            <UpInfoItem label="Full Name"     value={displayName} />
            <UpInfoItem label="Phone"         value={profile.phone} />
            <UpInfoItem label="Date of Birth" value={profile.dob} />
            <UpInfoItem label="Gender"        value={profile.gender} />
          </div>
        )}
      </div>

      {/* ── Account ── */}
      {!editing && (
        <div className="up-card">
          <div className="up-card-hd">
            <FiShield size={14} />
            <span>Account</span>
          </div>
          <div className="up-info-grid">
            <UpInfoItem label="Email"   value={profile.email} />
            <UpInfoItem label="Company" value={company} />
            <div className="up-info-item">
              <span className="up-info-label">Email Status</span>
              <span className={`up-status ${isVerified ? "up-status--green" : "up-status--amber"}`}>
                {isVerified ? <><FiCheckCircle size={10} /> Verified</> : "Not verified"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Security ── */}
      <div className="up-card">
        <div className="up-card-hd">
          <FiShield size={14} />
          <span>Security</span>
          <button
            className="up-card-action"
            onClick={() => { setPwOpen(o => !o); setPwError(""); setPwDraft({ current: "", next: "", confirm: "" }); }}
          >
            {pwOpen ? "Cancel" : "Change Password"}
          </button>
        </div>

        {pwSaved && (
          <div className="up-banner up-banner--ok" role="status">
            <FiCheck size={13} /> Password updated successfully.
          </div>
        )}

        {pwOpen ? (
          <div className="up-form">
            {pwError && <div className="up-banner up-banner--err" role="alert">{pwError}</div>}
            <div className="up-form-grid up-form-grid--single">
              <UpField label="Current Password"     value={pwDraft.current} type="password" onChange={v => setPwDraft(d => ({ ...d, current: v }))} />
              <UpField label="New Password"         value={pwDraft.next}    type="password" onChange={v => setPwDraft(d => ({ ...d, next: v }))} />
              <UpField label="Confirm New Password" value={pwDraft.confirm} type="password" onChange={v => setPwDraft(d => ({ ...d, confirm: v }))} />
            </div>
            <div className="up-form-actions">
              <button className="up-btn-primary" onClick={savePassword} disabled={pwSaving}>
                <FiCheck size={13} /> {pwSaving ? "Updating…" : "Update Password"}
              </button>
            </div>
          </div>
        ) : (
          <p className="up-card-hint">Use a strong, unique password to keep your account secure.</p>
        )}
      </div>

    </div>
  );
};

const UpField = ({ label, value, onChange, type = "text" }) => (
  <div className="up-form-field">
    <label className="up-form-label">{label}</label>
    <input className="up-form-input" type={type} value={value || ""}
      onChange={e => onChange(e.target.value)} />
  </div>
);

const UpInfoItem = ({ label, value }) => (
  <div className="up-info-item">
    <span className="up-info-label">{label}</span>
    <span className="up-info-value">{value || "—"}</span>
  </div>
);

// ── Static info sections ───────────────────────────────────────────────────────

const ReportHistorySection = ({ onViewReport }) => {
  const reportHistory = (() => {
    try {
      const email = JSON.parse(localStorage.getItem("profile") || "{}").email || "unknown";
      return JSON.parse(localStorage.getItem(`hl_report_history_${email}`) || "[]");
    } catch { return []; }
  })();

  if (reportHistory.length === 0) return (
    <div className="db-empty" style={{ padding: "var(--space-8) 0" }}>
      <FiFileText size={28} style={{ opacity: 0.3 }} />
      <div style={{ marginTop: 8, color: "var(--text-4)", fontSize: "var(--text-sm)" }}>
        No reports generated yet — go to Reports to get started.
      </div>
    </div>
  );

  return (
    <div className="ov-report-list" style={{ marginTop: "var(--space-4)" }}>
      {reportHistory.map((r, i) => (
        <div key={i} className="ov-report-card" onClick={() => onViewReport?.(r)}
          style={{ cursor: "pointer" }}>
          <div className="ov-report-card-top">
            <div className="ov-report-icon">
              <FiFileText size={14} style={{ color: "#6366f1" }} />
            </div>
            <div className="ov-report-main">
              <div className="ov-report-project">{r.project}</div>
              <div className="ov-report-time">{fmtRelTime(r.ts)}</div>
            </div>
            {r.dataTypes?.length > 0 && (
              <div className="ov-report-tags">
                {r.dataTypes.map(dt => (
                  <span key={dt} className="ov-report-tag">{dt.charAt(0).toUpperCase() + dt.slice(1)}</span>
                ))}
              </div>
            )}
          </div>
          <div className="ov-report-meta">
            {r.dateFrom && r.dateTo && (
              <div className="ov-report-meta-row">
                <span className="ov-report-meta-lbl">Date Range</span>
                <span className="ov-report-meta-val">{r.dateFrom} → {r.dateTo}</span>
              </div>
            )}
            <div className="ov-report-meta-row">
              <span className="ov-report-meta-lbl">Fields ({r.fields.length})</span>
              <span className="ov-report-meta-val ov-report-fields">
                {r.fields.map(f => <span key={f} className="ov-report-field-chip">{f}</span>)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const LoginHistorySection = ({ email }) => {
  const entries = readSessionHistory(email);
  const [sessions,       setSessions]       = useState([]);
  const [revoking,       setRevoking]       = useState(false);
  const [revokeSuccess,  setRevokeSuccess]  = useState(false);

  useEffect(() => {
    getActiveSessions()
      .then(res => setSessions(res?.sessions || []))
      .catch(() => {});
  }, []);

  const handleRevokeOthers = async () => {
    setRevoking(true); setRevokeSuccess(false);
    try {
      await revokeOtherSessions();
      setRevokeSuccess(true);
      setSessions(prev => prev.filter(s => s.is_current));
      setTimeout(() => setRevokeSuccess(false), 4000);
    } catch {}
    finally { setRevoking(false); }
  };

  const parseMeta = (ua = "") => {
    const browser = ua.includes("Edg")     ? "Edge"
      : ua.includes("Chrome")  ? "Chrome"
      : ua.includes("Firefox") ? "Firefox"
      : ua.includes("Safari")  ? "Safari"
      : "Browser";
    const os = ua.includes("Windows") ? "Windows"
      : ua.includes("Mac")     ? "macOS"
      : ua.includes("Linux")   ? "Linux"
      : ua.includes("iPhone")  ? "iPhone"
      : ua.includes("Android") ? "Android"
      : "Unknown OS";
    return `${browser} on ${os}`;
  };

  const otherCount = sessions.filter(s => !s.is_current).length;

  return (
    <div className="db-info-section">

      {/* ── Active sessions summary ── */}
      <div className="db-sessions-summary">
        <div className="db-sessions-count">
          <FiShield size={16} className="db-sessions-count-icon" />
          <span>
            <strong>{sessions.length}</strong> active session{sessions.length !== 1 ? "s" : ""}
            {sessions.length > 0 && " across your devices"}
          </span>
        </div>
        {otherCount > 0 && (
          <button
            className="db-revoke-btn"
            onClick={handleRevokeOthers}
            disabled={revoking}
          >
            <FiLogOut size={13} />
            {revoking ? "Signing out…" : `Sign out ${otherCount} other session${otherCount !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {revokeSuccess && (
        <div className="db-saved-banner" role="status">
          <FiCheck size={14} /> All other sessions have been signed out.
        </div>
      )}

      {/* ── Active session list ── */}
      {sessions.length > 0 && (
        <div className="db-active-sessions-list">
          {sessions.map(s => (
            <div key={s.session_id} className={`db-active-session${s.is_current ? " db-active-session--current" : ""}`}>
              <div className="db-active-session-icon"><FiShield size={14} /></div>
              <div className="db-active-session-body">
                <div className="db-active-session-device">{parseMeta(s.device || "")}</div>
                <div className="db-active-session-time">
                  Signed in {s.created_at ? new Date(s.created_at).toLocaleString() : "—"}
                </div>
              </div>
              {s.is_current && <span className="db-active-session-badge">This device</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── Divider ── */}
      <div className="db-sessions-divider">
        <span>Session history on this account</span>
      </div>

      {/* ── Local history ── */}
      <p className="db-info-sub">
        Showing your last {entries.length} session event{entries.length !== 1 ? "s" : ""} on this account.
      </p>
      {entries.length === 0 ? (
        <p className="db-info-empty">No session history recorded yet.</p>
      ) : (
        <div className="db-login-history-list">
          {entries.map((e, i) => {
            const d    = new Date(e.ts);
            const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
            const isLogin  = e.type === "login";
            const isLatest = i === 0;
            const reasonLabel = e.reason === "inactivity" ? "Auto (inactivity)"
              : e.reason === "manual" ? "Manual"
              : null;
            return (
              <div key={i} className={`db-login-entry${isLogin ? " db-login-entry--login" : " db-login-entry--logout"}${isLatest ? " db-login-entry--current" : ""}`}>
                <div className={`db-login-entry-icon ${isLogin ? "icon-login" : "icon-logout"}`}>
                  {isLogin ? <FiLogOut size={14} style={{ transform: "scaleX(-1)" }} /> : <FiLogOut size={14} />}
                </div>
                <div className="db-login-entry-body">
                  <div className="db-login-entry-time">{date} · {time}</div>
                  <div className="db-login-entry-meta">
                    {parseMeta(e.device)}
                    {reasonLabel && <span className="db-login-entry-reason">{reasonLabel}</span>}
                  </div>
                </div>
                <span className={`db-login-entry-badge db-login-entry-badge--${isLogin ? "in" : "out"}`}>
                  {isLogin ? "Login" : "Logout"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AboutSection = () => (
  <div className="db-about-page">

    {/* ── Tagline banner ── */}
    <div className="db-about-banner">
      <div className="db-about-banner-tag">Singapore · Deep Tech · GreenTech</div>
      <h2 className="db-about-banner-title">Reimagining water treatment through electrochemical innovation</h2>
      <p className="db-about-banner-sub">
        Hydroleap replaces conventional, chemical-intensive water treatment with automated,
        modular electrochemical systems — more cost-effective, energy-efficient, and
        environmentally compliant.
      </p>
    </div>

    {/* ── Description ── */}
    <div className="db-about-body">
      <div className="db-about-desc-block">
        <p className="db-about-para">
          Hydroleap is a Singapore-based greentech company delivering next-generation wastewater
          treatment through chemical-free electrochemical technology. We replace conventional,
          chemical-intensive processes with automated, modular systems that are more cost-effective,
          energy-efficient, and environmentally compliant.
        </p>
        <p className="db-about-para">
          Our platform serves industries ranging from data centres and pharmaceuticals to food &amp;
          beverage and palm oil — empowering operators to reduce costs, meet regulations, and
          optimise water reuse without operational complexity.
        </p>
      </div>

      {/* ── Technologies ── */}
      <div className="db-about-section-label">Core Technologies</div>
      <div className="db-about-grid">
        {[
          {
            code: "HL-EC",
            name: "Electro-coagulation",
            desc: "Removes suspended solids, heavy metals, and emulsified oils through electrochemical coagulation — no chemical dosing required.",
            detail: "Ideal for industrial wastewater, palm oil, and food processing effluents.",
          },
          {
            code: "HL-EO",
            name: "Electro-oxidation",
            desc: "Destroys persistent organic pollutants, pathogens, and COD through advanced electrochemical oxidation.",
            detail: "Used for pharmaceutical, chemical, and high-strength organic wastewater.",
          },
          {
            code: "HL-EO-CT",
            name: "Cooling Tower EO",
            desc: "Chemical-free scale, corrosion, and biofilm control for industrial cooling water systems.",
            detail: "Proven in data centre and commercial building cooling applications.",
          },
        ].map(t => (
          <div key={t.code} className="db-about-card">
            <div className="db-about-card-code">{t.code}</div>
            <div className="db-about-card-title">{t.name}</div>
            <p className="db-about-card-desc">{t.desc}</p>
            <p className="db-about-card-detail">{t.detail}</p>
          </div>
        ))}
      </div>

      {/* ── Industries ── */}
      <div className="db-about-section-label">Industries Served</div>
      <div className="db-about-industries">
        {["Data Centres", "Pharmaceuticals", "Food & Beverage", "Palm Oil Processing",
          "Chemical Manufacturing", "Commercial Buildings", "Municipal Water", "Semiconductor"].map(ind => (
          <span key={ind} className="db-about-industry-chip">{ind}</span>
        ))}
      </div>

      {/* ── Funding + Awards ── */}
      <div className="db-about-two-col">

        <div>
          <div className="db-about-section-label">Funding Milestones</div>
          <div className="db-about-funding-cards">
            <div className="db-about-funding-card">
              <div className="db-about-funding-val">US$1.9M</div>
              <div className="db-about-funding-round">Seed Round</div>
              <div className="db-about-funding-year">2019</div>
            </div>
            <div className="db-about-funding-card db-about-funding-card--accent">
              <div className="db-about-funding-val">US$4.4M</div>
              <div className="db-about-funding-round">Series A</div>
              <div className="db-about-funding-year">2025 · Wavemaker Impact</div>
            </div>
          </div>
        </div>

        <div>
          <div className="db-about-section-label">Recognition &amp; Awards</div>
          <div className="db-about-awards-list">
            {[
              { year: "2025", award: "Emerging Enterprise Award", body: "EnterpriseSG APAC25" },
              { year: "—",    award: "Tech Plan Demo Day",         body: "Overall Winner" },
              { year: "—",    award: "SEA Market Readiness Award", body: "Overall Winner" },
              { year: "—",    award: "Global Prize for Innovation in Desalination", body: "Finalist" },
              { year: "—",    award: "IAA Business as a Force for Good", body: "Ultimate Champion" },
            ].map((a, i) => (
              <div key={i} className="db-about-award-row">
                <div className="db-about-award-dot" />
                <div>
                  <div className="db-about-award-name">{a.award}</div>
                  <div className="db-about-award-body">{a.body}{a.year !== "—" ? ` · ${a.year}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Vision ── */}
      <div className="db-about-vision">
        <div className="db-about-vision-quote">
          "Our mission is to make clean water accessible and affordable by eliminating
          the complexity and cost of conventional chemical treatment."
        </div>
        <div className="db-about-vision-attr">— Hydroleap, Singapore</div>
      </div>

    </div>
  </div>
);

const ContactSection = () => (
  <div className="db-contact-page">

    {/* Banner */}
    <div className="db-contact-banner">
      <div className="db-contact-banner-tag">Support · Partnerships · Enquiries</div>
      <h2 className="db-contact-banner-title">We're here to help</h2>
      <p className="db-contact-banner-sub">
        Reach out to the Hydroleap team for technical support, project enquiries,
        or partnership opportunities. We typically respond within one business day.
      </p>
    </div>

    {/* Primary — WhatsApp highlighted */}
    <a
      className="db-contact-primary"
      href="https://wa.me/6588176832"
      target="_blank"
      rel="noreferrer"
    >
      <div className="db-contact-primary-icon">
        <FiMessageSquare size={22} />
      </div>
      <div className="db-contact-primary-body">
        <div className="db-contact-primary-label">Fastest response — WhatsApp</div>
        <div className="db-contact-primary-val">+65 8817 6832</div>
        <div className="db-contact-primary-hint">Tap to open WhatsApp chat</div>
      </div>
      <FiExternalLink size={16} className="db-contact-primary-arrow" />
    </a>

    {/* Contact grid */}
    <div className="db-contact-grid">
      <a className="db-contact-card" href="mailto:info@hydroleap.com">
        <div className="db-contact-card-icon"><FiMail size={18} /></div>
        <div className="db-contact-card-label">Email</div>
        <div className="db-contact-card-val">info@hydroleap.com</div>
        <div className="db-contact-card-hint">General enquiries & support</div>
      </a>

      <a
        className="db-contact-card"
        href="https://www.hydroleap.com"
        target="_blank"
        rel="noreferrer"
      >
        <div className="db-contact-card-icon"><FiExternalLink size={18} /></div>
        <div className="db-contact-card-label">Website</div>
        <div className="db-contact-card-val">www.hydroleap.com</div>
        <div className="db-contact-card-hint">Product info & news</div>
      </a>

      <a
        className="db-contact-card"
        href="https://maps.google.com/?q=84+Toh+Guan+Rd+E+Singapore+608501"
        target="_blank"
        rel="noreferrer"
      >
        <div className="db-contact-card-icon"><FiMapPin size={18} /></div>
        <div className="db-contact-card-label">Office</div>
        <div className="db-contact-card-val">84 Toh Guan Rd E, #03-08/09</div>
        <div className="db-contact-card-hint">Singapore Water Exchange, Singapore 608501 — View on Maps ↗</div>
      </a>

      <a
        className="db-contact-card"
        href="https://www.linkedin.com/company/hydroleap"
        target="_blank"
        rel="noreferrer"
      >
        <div className="db-contact-card-icon">
          {/* LinkedIn icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
            <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
          </svg>
        </div>
        <div className="db-contact-card-label">LinkedIn</div>
        <div className="db-contact-card-val">Hydroleap</div>
        <div className="db-contact-card-hint">Follow for news & updates</div>
      </a>
    </div>

    {/* Business hours + response */}
    <div className="db-contact-bottom">
      <div className="db-contact-hours">
        <div className="db-contact-hours-title"><FiClock size={14} /> Business Hours</div>
        <div className="db-contact-hours-grid">
          <span className="db-contact-hours-day">Monday – Friday</span>
          <span className="db-contact-hours-time">9:00 AM – 6:00 PM SGT</span>
          <span className="db-contact-hours-day">Saturday</span>
          <span className="db-contact-hours-time">10:00 AM – 2:00 PM SGT</span>
          <span className="db-contact-hours-day">Sunday & Public Holidays</span>
          <span className="db-contact-hours-time">Closed</span>
        </div>
      </div>

      <div className="db-contact-response">
        <div className="db-contact-response-title">Response Times</div>
        <div className="db-contact-response-row">
          <span className="db-contact-response-dot db-contact-response-dot--green" />
          <span><strong>WhatsApp</strong> — Usually within a few hours</span>
        </div>
        <div className="db-contact-response-row">
          <span className="db-contact-response-dot db-contact-response-dot--amber" />
          <span><strong>Email</strong> — Within 1 business day</span>
        </div>
        <div className="db-contact-response-row">
          <span className="db-contact-response-dot db-contact-response-dot--muted" />
          <span><strong>Website form</strong> — 2–3 business days</span>
        </div>
      </div>
    </div>

  </div>
);

// ── Guided Tour ───────────────────────────────────────────────────────────────

const TOUR_STEPS = [
  {
    selector: null,
    title: "Welcome to your Hydroleap Dashboard",
    desc: "This quick tour walks you through every key feature. Use the arrows, keyboard (← →), or click the dots to navigate. Press Esc to exit at any time.",
  },
  {
    selector: '[data-tour="brand"]',
    title: "Your Portal",
    desc: "The Hydroleap sidebar is your command centre. Click the toggle button at the top to collapse it when you need more screen space.",
  },
  {
    selector: '[data-tour="nav"]',
    title: "Main Navigation",
    desc: "Navigate between all sections here — Dashboard, My Projects, Reports, Session History, Tutorial, About, and Contact.",
  },
  {
    selector: '[data-tour="nav-dashboard"]',
    title: "Dashboard Overview",
    desc: "Your home screen. See total projects, active devices, live alert count, and the average flow rate across all your projects at a glance.",
  },
  {
    selector: '[data-tour="nav-projects"]',
    title: "My Projects",
    desc: "Browse all your assigned IoT projects. Click any project card to open its full real-time monitoring dashboard with live sensor data.",
  },
  {
    selector: '[data-tour="nav-reports"]',
    title: "Reports",
    desc: "Build and download professional PDF reports. Choose a project, pick Historic or Real-time data, select a date range and fields, then preview or export.",
  },
  {
    selector: '[data-tour="starred"]',
    title: "Starred Projects",
    desc: "Pin your most-used projects here for instant one-click access. Star a project from its card, or remove it by clicking × in this panel.",
  },
  {
    selector: '[data-tour="avatar"]',
    title: "Your Profile",
    desc: "Click your avatar to open the profile panel — view and edit your name, phone, company, date of birth, and check your verification status.",
  },
  {
    selector: '[data-tour="theme"]',
    title: "Dark / Light Mode",
    desc: "Toggle between dark and light themes instantly. Your preference is saved automatically and restored on next login.",
  },
  {
    selector: '[data-tour="topbar"]',
    title: "Top Bar",
    desc: "Shows the current section title and your company badge. Click your avatar here to also open the profile panel from anywhere in the dashboard.",
  },
];

function TourOverlay({ onClose, sidebarOpen, setSidebarOpen }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  const cur   = TOUR_STEPS[step];
  const total = TOUR_STEPS.length;
  const PAD   = 12;

  // Stable ref so the keydown handler never goes stale even when onClose identity changes
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => { if (!sidebarOpen) setSidebarOpen(true); }, []); // eslint-disable-line

  useEffect(() => {
    if (!cur.selector) { setRect(null); return; }
    const el = document.querySelector(cur.selector);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const timer = setTimeout(() => setRect(el.getBoundingClientRect()), 200);
    return () => clearTimeout(timer);
  }, [step]); // eslint-disable-line

  // Registered once on mount — uses ref so it always calls the latest onClose
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setStep(s => Math.min(s + 1, total - 1));
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   setStep(s => Math.max(s - 1, 0));
      if (e.key === "Escape") { e.preventDefault(); onCloseRef.current(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line

  // Tooltip placement — clamp all four edges so it never leaves the viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const TW = Math.min(300, vw - 24);   // adaptive width, 12px margin each side
  const TH = 290;                        // estimated tooltip height for clamping

  let tipStyle = {};
  let arrowDir = null;

  if (!rect) {
    tipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else {
    const cx = rect.left + rect.width / 2;

    const clampX = (x) => Math.max(12, Math.min(x, vw - TW - 12));
    const clampY = (y) => Math.max(12, Math.min(y, vh - TH - 12));

    const canRight = rect.right  + TW + 20 <= vw;
    const canLeft  = rect.left   - TW - 20 >= 0;
    const canBelow = rect.bottom + TH + 16 <= vh;
    const canAbove = rect.top    - TH - 16 >= 0;

    if (canRight) {
      // right of element — clamp so tooltip never overflows right or bottom
      tipStyle = { left: clampX(rect.right + 16), top: clampY(rect.top) };
      arrowDir = "left";
    } else if (canLeft) {
      // left of element
      tipStyle = { left: clampX(rect.left - TW - 16), top: clampY(rect.top) };
      arrowDir = "right";
    } else if (canBelow) {
      // below element
      tipStyle = { top: Math.min(rect.bottom + 14, vh - TH - 12), left: clampX(cx - TW / 2) };
      arrowDir = "up";
    } else if (canAbove) {
      // above element
      tipStyle = { top: Math.max(12, rect.top - TH - 14), left: clampX(cx - TW / 2) };
      arrowDir = "down";
    } else {
      // fallback: float above the element, centred horizontally
      tipStyle = { top: clampY(rect.top - TH - 14), left: clampX(cx - TW / 2) };
    }
  }

  return (
    <>
      {/* SVG spotlight backdrop */}
      <svg
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 9000 }}
        onClick={onClose}
      >
        {rect ? (
          <>
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={rect.left - PAD} y={rect.top - PAD}
                  width={rect.width + PAD * 2} height={rect.height + PAD * 2}
                  rx="10" fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(10,15,28,0.78)" mask="url(#tour-mask)" />
            {/* teal glow ring around spotlight */}
            <rect
              x={rect.left - PAD} y={rect.top - PAD}
              width={rect.width + PAD * 2} height={rect.height + PAD * 2}
              rx="10" fill="none" stroke="#00d4c8" strokeWidth="2"
              style={{ filter: "drop-shadow(0 0 8px rgba(0,212,200,0.6))" }}
            />
          </>
        ) : (
          <rect width="100%" height="100%" fill="rgba(10,15,28,0.78)" />
        )}
      </svg>

      {/* Tooltip card */}
      <div
        className={`tour-tooltip tour-tooltip--${arrowDir || "center"}`}
        style={{ position: "fixed", zIndex: 9001, width: TW, maxWidth: `calc(100vw - 24px)`, ...tipStyle }}
        onClick={e => e.stopPropagation()}
      >
        <div className="tour-tooltip-top">
          <div className="tour-tooltip-step">{step + 1} <span>/ {total}</span></div>
          <button className="tour-close-btn" onClick={onClose} title="Exit tour"><FiX size={14} /></button>
        </div>

        <div className="tour-tooltip-icon"><FiCrosshair size={16} /></div>
        <div className="tour-tooltip-title">{cur.title}</div>
        <p className="tour-tooltip-desc">{cur.desc}</p>

        {/* Dot progress */}
        <div className="tour-dots">
          {TOUR_STEPS.map((_, i) => (
            <button key={i} className={`tour-dot${i === step ? " active" : ""}`} onClick={() => setStep(i)} />
          ))}
        </div>

        {/* Navigation */}
        <div className="tour-tooltip-nav">
          <button className="tour-btn-skip" onClick={onClose}>Skip tour</button>
          <div className="tour-btn-group">
            <button className="tour-btn-prev" disabled={step === 0} onClick={() => setStep(s => s - 1)}>← Prev</button>
            {step < total - 1
              ? <button className="tour-btn-next" onClick={() => setStep(s => s + 1)}>Next →</button>
              : <button className="tour-btn-done" onClick={onClose}>Done ✓</button>
            }
          </div>
        </div>
      </div>
    </>
  );
};

// ── Admin Home Overview ────────────────────────────────────────────────────────

const AdminHome = ({ isHydroleap, pendingCounts, totalCounts, onNavigate }) => {
  const totalPending = pendingCounts.users + pendingCounts.admins + pendingCounts.profiles;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="adm-home">

      {/* Hero banner */}
      <div className="adm-hero">
        <div className="adm-hero-left">
          <div className="adm-hero-greeting">{greeting}</div>
          <h2 className="adm-hero-title">{isHydroleap ? "Super Admin Overview" : "Admin Overview"}</h2>
          <p className="adm-hero-sub">
            {isHydroleap
              ? "Full visibility across all companies, users, and projects."
              : "Manage your company's users, projects, and approvals."}
          </p>
          <div className="adm-hero-summary">
            <div className="adm-hero-metric">
              <span className="adm-hero-metric-value">{totalPending}</span>
              <span className="adm-hero-metric-label">Pending</span>
            </div>
            <div className="adm-hero-metric-divider" />
            <div className="adm-hero-metric">
              <span className="adm-hero-metric-value">{totalCounts.users}</span>
              <span className="adm-hero-metric-label">Users</span>
            </div>
            <div className="adm-hero-metric-divider" />
            <div className="adm-hero-metric">
              <span className="adm-hero-metric-value">{totalCounts.admins}</span>
              <span className="adm-hero-metric-label">Admins</span>
            </div>
            {isHydroleap && <>
              <div className="adm-hero-metric-divider" />
              <div className="adm-hero-metric">
                <span className="adm-hero-metric-value">{totalCounts.superAdmins}</span>
                <span className="adm-hero-metric-label">Super Admins</span>
              </div>
            </>}
            <div className="adm-hero-metric-divider" />
            <div className="adm-hero-metric">
              <span className="adm-hero-metric-value">{totalCounts.projects}</span>
              <span className="adm-hero-metric-label">{isHydroleap ? "Projects" : "Projects (Company)"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending approvals */}
      <div className="adm-section-row">
        <div className="adm-section-label">Pending Approvals</div>
        {totalPending > 0 && (
          <button className="adm-section-action" onClick={() => onNavigate("approval-pending", "users")}>
            Review all <FiArrowLeft size={11} style={{ transform: "rotate(180deg)", marginLeft: 3 }} />
          </button>
        )}
      </div>
      <div className="adm-stat-grid">
        {[
          { icon: <FiUserPlus size={22} />,    label: "User Registrations", value: pendingCounts.users,    color: "teal",   nav: ["approval-pending","users"]    },
          { icon: <FiShield size={22} />,       label: "Admin Requests",     value: pendingCounts.admins,   color: "blue",   nav: ["approval-pending","admins"]   },
          { icon: <FiAlertCircle size={22} />,  label: "Profile Updates",    value: pendingCounts.profiles, color: "amber",  nav: ["profile-updates"] },
          { icon: <FiTrendingUp size={22} />,   label: "Total Pending",      value: totalPending,           color: "purple", nav: null                            },
        ].map(({ icon, label, value, color, nav }) => (
          <div
            key={label}
            className={`adm-stat-card adm-stat-card--${color}${nav ? " adm-stat-card--clickable" : ""}`}
            onClick={nav ? () => onNavigate(...nav) : undefined}
            role={nav ? "button" : undefined}
            tabIndex={nav ? 0 : undefined}
          >
            <div className="adm-stat-top">
              <div className="adm-stat-icon">{icon}</div>
              {nav && <FiArrowLeft size={13} className="adm-stat-chevron" />}
            </div>
            <div className="adm-stat-value">{value ?? "—"}</div>
            <div className="adm-stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Directory */}
      <div className="adm-section-row">
        <div className="adm-section-label">Directory</div>
      </div>
      <div className={`adm-stat-grid${isHydroleap ? "" : " adm-stat-grid--3"}`}>
        {[
          { icon: <FiUsers  size={22} />, label: "Registered Users",  value: totalCounts.users,       color: "green",  nav: ["people-directory","users"]  },
          { icon: <FiUser   size={22} />, label: "Registered Admins", value: totalCounts.admins,      color: "indigo", nav: ["people-directory","admins"] },
          ...(isHydroleap ? [{ icon: <FiShield size={22} />, label: "Super Admins", value: totalCounts.superAdmins, color: "purple", nav: ["people-directory","admins"] }] : []),
          { icon: <FiGrid   size={22} />, label: "Total Projects",    value: totalCounts.projects,    color: "cyan",   nav: ["projects"]                  },
        ].map(({ icon, label, value, color, nav }) => (
          <div
            key={label}
            className={`adm-stat-card adm-stat-card--${color} adm-stat-card--clickable`}
            onClick={() => onNavigate(...nav)}
            role="button"
            tabIndex={0}
          >
            <div className="adm-stat-top">
              <div className="adm-stat-icon">{icon}</div>
              <FiArrowLeft size={13} className="adm-stat-chevron" />
            </div>
            <div className="adm-stat-value">{value ?? "—"}</div>
            <div className="adm-stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="adm-section-row">
        <div className="adm-section-label">Quick Actions</div>
      </div>
      <div className="adm-quick-grid">
        {[
          { icon: <FiCheckCircle size={18}/>, label: "Review Approvals",  sub: "Pending user & admin signups",    key: "approval-pending", color: "teal"   },
          { icon: <FiUser        size={18}/>, label: "Profile Updates",   sub: "Pending profile change requests", key: "profile-updates",  color: "amber"  },
          { icon: <FiGrid        size={18}/>, label: "Projects",           sub: "View & monitor all projects",     key: "projects",         color: "blue"   },
          { icon: <FiLink        size={18}/>, label: "Project Access",     sub: "Assign projects to users",        key: "project-access",   color: "purple" },
          { icon: <FiUsers       size={18}/>, label: "People Directory",   sub: "Browse all users & admins",       key: "people-directory", color: "green"  },
          ...(isHydroleap ? [{ icon: <FiGlobe size={18}/>, label: "Company Access", sub: "Manage company permissions", key: "company-access", color: "amber" }] : []),
        ].map(item => (
          <button key={item.key} className={`adm-quick-card adm-quick-card--${item.color}`} onClick={() => onNavigate(item.key)}>
            <div className="adm-quick-icon">{item.icon}</div>
            <div className="adm-quick-body">
              <div className="adm-quick-label">{item.label}</div>
              <div className="adm-quick-sub">{item.sub}</div>
            </div>
            <FiArrowLeft size={14} className="adm-quick-arrow" />
          </button>
        ))}
      </div>

    </div>
  );
};

// ── Notification Bell ──────────────────────────────────────────────────────────

const NotificationPanel = ({ counts, seenCounts, onNavigate, onClose }) => {
  const items = [
    { key: "users",    icon: <FiUserPlus size={15}/>,    label: "User registrations",   sub: "pending signup approvals",   nav: ["approval-pending", "users"],    color: "teal"  },
    { key: "admins",   icon: <FiShield size={15}/>,      label: "Admin requests",        sub: "pending admin approvals",    nav: ["approval-pending", "admins"],   color: "blue"  },
    { key: "profiles", icon: <FiAlertCircle size={15}/>, label: "Profile update requests", sub: "awaiting your approval",   nav: ["profile-updates"], color: "amber" },
  ];

  return (
    <div className="notif-panel" role="dialog" aria-label="Notifications">
      <div className="notif-panel-header">
        <span className="notif-panel-title">Notifications</span>
        <button className="notif-panel-close" onClick={onClose} aria-label="Close notifications">✕</button>
      </div>
      <div className="notif-panel-list">
        {items.map(item => {
          const count = counts[item.key] || 0;
          const isNew = count > (seenCounts[item.key] || 0);
          return (
            <button
              key={item.key}
              className={`notif-item${isNew ? " notif-item--new" : ""}`}
              onClick={() => { onNavigate(...item.nav); onClose(); }}
            >
              <div className={`notif-item-icon notif-item-icon--${item.color}`}>{item.icon}</div>
              <div className="notif-item-body">
                <div className="notif-item-label">
                  <strong>{count}</strong> {item.label}
                </div>
                <div className="notif-item-sub">{item.sub}</div>
              </div>
              {isNew && <span className="notif-item-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <button className="notif-panel-cta" onClick={() => { onNavigate("approval-pending"); onClose(); }}>
        View all approvals →
      </button>
    </div>
  );
};

// ── Admin Profile Section ─────────────────────────────────────────────────────

const ADMIN_API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";

function AdminProfileRow({ label, value }) {
  return (
    <div className="admin-prof-row">
      <div className="admin-prof-label">{label}</div>
      <div className="admin-prof-value">{value || "—"}</div>
    </div>
  );
}

function AdminProfileEditRow({ label, value, onChange, type = "text" }) {
  return (
    <div className="admin-prof-row">
      <div className="admin-prof-label">{label}</div>
      <input
        className="admin-prof-input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function AdminProfileSection() {
  const [profile,   setProfile]   = useState(null);
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState({});
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving,    setSaving]    = useState(false);

  const [pwOpen,    setPwOpen]    = useState(false);
  const [pwDraft,   setPwDraft]   = useState({ current: "", next: "", confirm: "" });
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwSaved,   setPwSaved]   = useState(false);
  const [pwError,   setPwError]   = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("profile");
      if (stored) setProfile(JSON.parse(stored));
    } catch {}
  }, []);

  const startEdit = () => {
    setDraft({
      name:   profile?.name   || "",
      phone:  profile?.phone  || "",
      dob:    profile?.dob    || "",
      gender: profile?.gender || "",
    });
    setEditing(true);
    setSaved(false);
    setSaveError("");
  };

  const cancelEdit = () => { setEditing(false); setDraft({}); setSaveError(""); };

  const savePassword = async () => {
    setPwError(""); setPwSaved(false);
    if (!pwDraft.current) { setPwError("Enter your current password."); return; }
    if (pwDraft.next !== pwDraft.confirm) { setPwError("New passwords do not match."); return; }
    if (pwDraft.next.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    setPwSaving(true);
    try {
      await changeAdminPassword({ current_password: pwDraft.current, new_password: pwDraft.next, confirm_password: pwDraft.confirm });
      setPwSaved(true);
      setPwDraft({ current: "", next: "", confirm: "" });
      setPwOpen(false);
      setTimeout(() => setPwSaved(false), 5000);
    } catch (err) {
      setPwError(err.message || "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  };

  const saveEdit = async () => {
    setSaving(true); setSaveError("");
    try {
      const payload = { name: draft.name, phone: draft.phone, dob: draft.dob, gender: draft.gender };
      Object.keys(payload).forEach(k => { if (!payload[k]) delete payload[k]; });
      await requestAdminProfileUpdate(payload);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    } catch (err) {
      setSaveError(err.message || "Failed to submit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return (
    <div className="db-loading" role="status">
      <div className="db-spinner" />
      <span>Loading profile…</span>
    </div>
  );

  const displayName = profile.name || "—";
  const initials = displayName !== "—"
    ? displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "A";
  const company = profile.company_name || profile.company;

  return (
    <div className="up-wrap">

      {/* ── Hero ── */}
      <div className="up-hero">
        <div className="up-hero-bg" />
        <div className="up-hero-body">
          <div className="up-avatar">{initials}</div>
          <div className="up-hero-text">
            <div className="up-hero-name">{displayName}</div>
            <div className="up-hero-email">{profile.email || "—"}</div>
            {company && <span className="up-company-chip">{company}</span>}
            {profile.role && <span className="up-company-chip" style={{ marginLeft: 4 }}>{profile.role}</span>}
          </div>
        </div>
      </div>

      {saved && (
        <div className="up-banner up-banner--ok" role="status">
          <FiCheck size={13} /> Update submitted — pending approval.
        </div>
      )}
      {saveError && <div className="up-banner up-banner--err" role="alert">{saveError}</div>}

      {/* ── Personal Information ── */}
      <div className="up-card">
        <div className="up-card-hd">
          <FiUser size={14} />
          <span>Personal Information</span>
          {!editing && (
            <button className="up-card-action" onClick={startEdit}>
              <FiEdit2 size={12} /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="up-form">
            <div className="up-form-grid">
              <UpField label="Full Name"     value={draft.name}   onChange={v => setDraft(d => ({ ...d, name: v }))} />
              <UpField label="Phone"         value={draft.phone}  onChange={v => setDraft(d => ({ ...d, phone: v }))} />
              <UpField label="Date of Birth" value={draft.dob}    type="date" onChange={v => setDraft(d => ({ ...d, dob: v }))} />
              <div className="up-form-field">
                <label className="up-form-label">Gender</label>
                <select className="up-form-input" value={draft.gender}
                  onChange={e => setDraft(d => ({ ...d, gender: e.target.value }))}>
                  <option value="">Select</option>
                  {["Male", "Female", "Non-binary", "Prefer not to say"].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="up-form-actions">
              <button className="up-btn-primary" onClick={saveEdit} disabled={saving}>
                <FiCheck size={13} /> {saving ? "Saving…" : "Submit for Approval"}
              </button>
              <button className="up-btn-ghost" onClick={cancelEdit}>
                <FiX size={13} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="up-info-grid">
            <UpInfoItem label="Full Name"     value={displayName} />
            <UpInfoItem label="Phone"         value={profile.phone} />
            <UpInfoItem label="Date of Birth" value={profile.dob} />
            <UpInfoItem label="Gender"        value={profile.gender} />
          </div>
        )}
      </div>

      {/* ── Account ── */}
      {!editing && (
        <div className="up-card">
          <div className="up-card-hd">
            <FiShield size={14} />
            <span>Account</span>
          </div>
          <div className="up-info-grid">
            <UpInfoItem label="Email"   value={profile.email} />
            <UpInfoItem label="Company" value={company} />
            <UpInfoItem label="Role"    value={profile.role} />
          </div>
        </div>
      )}

      {/* ── Security ── */}
      <div className="up-card">
        <div className="up-card-hd">
          <FiShield size={14} />
          <span>Security</span>
          <button
            className="up-card-action"
            onClick={() => { setPwOpen(o => !o); setPwError(""); setPwDraft({ current: "", next: "", confirm: "" }); }}
          >
            {pwOpen ? "Cancel" : "Change Password"}
          </button>
        </div>

        {pwSaved && (
          <div className="up-banner up-banner--ok" role="status">
            <FiCheck size={13} /> Password updated successfully.
          </div>
        )}

        {pwOpen ? (
          <div className="up-form">
            {pwError && <div className="up-banner up-banner--err" role="alert">{pwError}</div>}
            <div className="up-form-grid up-form-grid--single">
              <UpField label="Current Password"     value={pwDraft.current} type="password" onChange={v => setPwDraft(d => ({ ...d, current: v }))} />
              <UpField label="New Password"         value={pwDraft.next}    type="password" onChange={v => setPwDraft(d => ({ ...d, next: v }))} />
              <UpField label="Confirm New Password" value={pwDraft.confirm} type="password" onChange={v => setPwDraft(d => ({ ...d, confirm: v }))} />
            </div>
            <div className="up-form-actions">
              <button className="up-btn-primary" onClick={savePassword} disabled={pwSaving}>
                <FiCheck size={13} /> {pwSaving ? "Updating…" : "Update Password"}
              </button>
            </div>
          </div>
        ) : (
          <p className="up-card-hint">Use a strong, unique password to keep your account secure.</p>
        )}
      </div>

    </div>
  );
}

// ── User Project Access Console ───────────────────────────────────────────────

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

  useEffect(() => {
    async function fetchCompanyFromProfile() {
      try {
        const stored = localStorage.getItem("profile");
        let company = "";
        if (stored) {
          const profile = JSON.parse(stored);
          company = profile.company || profile.company_name || profile.companyName || "";
        } else {
          const data = await getAdminProfile();
          company = data.company || data.company_name || data.companyName || "";
          localStorage.setItem("profile", JSON.stringify(data));
        }
        setCompanyName(company.trim());
      } catch { setCompanyName(""); }
      finally { setAdminLoading(false); }
    }
    fetchCompanyFromProfile();
  }, []);

  useEffect(() => {
    if (adminLoading) return;
    setLoading(true);
    Promise.all([getAllUsers(), getAllProjects(), getCompanyAccesses()])
      .then(([userRes, projRes, companyAccessRes]) => {
        let usersRaw = userRes.users || [];
        let projectsRaw = projRes.projects || [];
        const companyAccessList = companyAccessRes.company_accesses || [];
        const filterCompany = companyName && companyName.toLowerCase() !== "hydroleap";
        if (filterCompany) {
          usersRaw = usersRaw.filter(u =>
            (u.company_name || "").trim().toLowerCase() === companyName.trim().toLowerCase()
          );
          const accessibleAssetIds = companyAccessList
            .filter(ca => (ca.company || "").trim().toLowerCase() === companyName.trim().toLowerCase())
            .map(ca => ca.asset_id);
          projectsRaw = projectsRaw.filter(p => accessibleAssetIds.includes(p.asset_id));
        }
        setUsers(usersRaw.map(u => u.email).filter(Boolean));
        setProjects(projectsRaw);
        setLoading(false);
      }).catch(() => { setUsers([]); setProjects([]); setLoading(false); });
  }, [adminLoading, companyName]);

  useEffect(() => {
    if (!selectedEmail) { setAssignedProjects([]); setSelectedToAssign([]); return; }
    setLoading(true);
    getUserAccesses(selectedEmail)
      .then(res => { setAssignedProjects((res.user_accesses || []).map(a => a.asset_id).filter(Boolean)); setSelectedToAssign([]); setLoading(false); })
      .catch(() => { setAssignedProjects([]); setLoading(false); });
  }, [selectedEmail]);

  const handleAssign = async () => {
    if (!selectedEmail || selectedToAssign.length === 0) return;
    setAssigning(true); setMessage("");
    try {
      await assignUserProjects({ email: selectedEmail, projectIds: [...assignedProjects, ...selectedToAssign] });
      setMessage(`Projects assigned to ${selectedEmail}`);
      setSelectedToAssign([]);
      const res = await getUserAccesses(selectedEmail);
      setAssignedProjects((res.user_accesses || []).map(a => a.asset_id));
    } catch (err) { setMessage(err.message || "Failed to assign projects."); }
    setAssigning(false);
  };

  const handleRemove = async (pid) => {
    if (!selectedEmail) return;
    if (!window.confirm(`Remove ${selectedEmail}'s access to ${pid}?`)) return;
    setRemoving(true); setMessage("");
    try {
      await removeUserProject({ email: selectedEmail, projectId: pid });
      setMessage(`Removed access to ${pid}`);
      setAssignedProjects(prev => prev.filter(p => p !== pid));
    } catch (err) { setMessage(err.message || "Failed to remove access."); }
    setRemoving(false);
  };

  const filteredUsers = users.filter(e => e.toLowerCase().includes(searchUser.toLowerCase()));
  const filteredProjects = projects.filter(p => (p.asset_id || "").toLowerCase().includes(searchProject.toLowerCase()));
  const assignableProjects = filteredProjects.filter(p => !assignedProjects.includes(p.asset_id));

  const selectedUserInitials = selectedEmail
    ? selectedEmail.split("@")[0].slice(0, 2).toUpperCase()
    : "";

  return (
    <div className="upac-root">

      {/* Page header */}
      <div className="adm-page-header">
        <div className="adm-page-header-left">
          <div className="adm-page-header-icon adm-page-header-icon--teal"><FiLink size={16} /></div>
          <div>
            <div className="adm-page-header-title">Project Access</div>
            <div className="adm-page-header-sub">Assign and manage project access for users{companyName ? ` in ${companyName}` : ""}</div>
          </div>
        </div>
      </div>

      <div className="upac-layout">

        {/* Left: user list */}
        <div className="upac-users-panel">
          <div className="upac-panel-header">
            <FiUsers size={14} />
            <span>Users</span>
            <span className="upac-count-badge">{users.length}</span>
          </div>
          <div className="upac-search-bar">
            <FiSearch size={13} className="upac-search-icon" />
            <input
              className="upac-search-input"
              type="text"
              placeholder="Search by email…"
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
            />
          </div>
          <div className="upac-user-list">
            {loading && !selectedEmail ? (
              <div className="upac-empty">Loading users…</div>
            ) : filteredUsers.length === 0 ? (
              <div className="upac-empty">No users found</div>
            ) : filteredUsers.map(email => {
              const initials = email.split("@")[0].slice(0, 2).toUpperCase();
              const isSelected = email === selectedEmail;
              return (
                <button
                  key={email}
                  className={`upac-user-row${isSelected ? " upac-user-row--active" : ""}`}
                  onClick={() => setSelectedEmail(isSelected ? "" : email)}
                >
                  <div className="upac-user-avatar">{initials}</div>
                  <div className="upac-user-email">{email}</div>
                  {isSelected && <FiCheck size={13} className="upac-user-check" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: project management */}
        <div className="upac-projects-panel">
          {!selectedEmail ? (
            <div className="upac-empty-state">
              <div className="upac-empty-state-icon"><FiLink size={28} /></div>
              <div className="upac-empty-state-title">Select a user</div>
              <div className="upac-empty-state-sub">Choose a user from the list to view and manage their project access</div>
            </div>
          ) : (
            <>
              {/* Selected user header */}
              <div className="upac-selected-header">
                <div className="upac-selected-avatar">{selectedUserInitials}</div>
                <div>
                  <div className="upac-selected-email">{selectedEmail}</div>
                  <div className="upac-selected-meta">
                    {loading ? "Loading…" : `${assignedProjects.length} project${assignedProjects.length !== 1 ? "s" : ""} assigned`}
                  </div>
                </div>
              </div>

              {message && (
                <div className={`upac-message${message.toLowerCase().includes("fail") || message.toLowerCase().includes("error") ? " upac-message--error" : " upac-message--success"}`}>
                  {message}
                </div>
              )}

              {/* Current assignments */}
              <div className="upac-section-label">
                <FiCheck size={13} /> Assigned Projects
              </div>
              {loading ? (
                <div className="upac-empty">Loading assignments…</div>
              ) : assignedProjects.length === 0 ? (
                <div className="upac-empty">No projects assigned yet</div>
              ) : (
                <div className="upac-assigned-grid">
                  {assignedProjects.map(pid => (
                    <div key={pid} className="upac-assigned-chip">
                      <FiGrid size={12} />
                      <span>{pid}</span>
                      <button
                        className="upac-chip-remove"
                        onClick={() => handleRemove(pid)}
                        disabled={removing}
                        title={`Remove access to ${pid}`}
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="upac-divider" />

              {/* Assign new */}
              <div className="upac-section-label">
                <FiPlus size={13} /> Assign Projects
              </div>
              <div className="upac-search-bar" style={{ marginBottom: 12 }}>
                <FiSearch size={13} className="upac-search-icon" />
                <input
                  className="upac-search-input"
                  type="text"
                  placeholder="Search available projects…"
                  value={searchProject}
                  onChange={e => setSearchProject(e.target.value)}
                />
              </div>
              <div className="upac-project-list">
                {assignableProjects.length === 0 ? (
                  <div className="upac-empty">All projects already assigned</div>
                ) : assignableProjects.map(p => {
                  const checked = selectedToAssign.includes(p.asset_id);
                  return (
                    <label
                      key={p.asset_id}
                      className={`upac-project-row${checked ? " upac-project-row--checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="upac-checkbox"
                        checked={checked}
                        onChange={() => setSelectedToAssign(prev =>
                          prev.includes(p.asset_id)
                            ? prev.filter(id => id !== p.asset_id)
                            : [...prev, p.asset_id]
                        )}
                        disabled={assigning}
                      />
                      <FiGrid size={13} className="upac-project-icon" />
                      <div className="upac-project-info">
                        <span className="upac-project-name">{p.asset_id}</span>
                        {p.client_id && <span className="upac-project-device">{p.client_id}</span>}
                      </div>
                      {checked && <FiCheck size={13} className="upac-project-check" />}
                    </label>
                  );
                })}
              </div>

              {selectedToAssign.length > 0 && (
                <div className="upac-confirm-bar">
                  <span className="upac-confirm-count">{selectedToAssign.length} selected</span>
                  <button
                    className="upac-confirm-btn"
                    onClick={handleAssign}
                    disabled={assigning}
                  >
                    {assigning ? "Assigning…" : <><FiCheck size={14} /> Confirm Assignment</>}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

// ── Dashboard Shell ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { profile, role, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen,      setSidebarOpen]      = useState(true);
  const [active,           setActive]           = useState(() => sessionStorage.getItem("hl_active") || (role === "admin" ? "home" : "dashboard"));
  const [notifOpen,        setNotifOpen]        = useState(false);
  const [pendingCounts,    setPendingCounts]    = useState({ users: 0, admins: 0, profiles: 0 });
  const [totalCounts,      setTotalCounts]      = useState({ users: 0, admins: 0, superAdmins: 0, projects: 0 });
  const [seenCounts,       setSeenCounts]       = useState(() => {
    try { return JSON.parse(localStorage.getItem("hl_notif_seen") || "{}"); }
    catch { return {}; }
  });
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [darkMode,         setDarkMode]         = useState(() => {
    const saved = localStorage.getItem("hl_theme");
    return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("hl_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Clear any restore keys left by the refresh button once we've applied them
  useEffect(() => {
    sessionStorage.removeItem("hl_active");
    sessionStorage.removeItem("hl_selected_project");
  }, []);
  const [starred,       setStarred]       = useState([]);
  const [pendingReport, setPendingReport] = useState(null);

  useEffect(() => {
    if (role !== "admin") {
      getStarredProjects().then(res => setStarred(res?.starred || [])).catch(() => {});
    }
  }, [role]);

  // ── Register device info for the current session ──
  useEffect(() => {
    if (role === "user") {
      updateSessionDevice(navigator.userAgent).catch(() => {});
    }
  }, [role]);

  // ── User profile-approval notifications ──
  const [profileNotifs, setProfileNotifs] = useState([]);

  useEffect(() => {
    if (role !== "user") return;
    const fetchNotifs = () => {
      getUserNotifications().then(res => setProfileNotifs(res?.notifications || [])).catch(() => {});
    };
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(iv);
  }, [role]);

  const dismissProfileNotifs = () => {
    markUserNotificationsRead().catch(() => {});
    setProfileNotifs([]);
  };

  // ── Admin notification polling ──
  useEffect(() => {
    if (role !== "admin") return;
    const fetchCounts = async () => {
      try {
        const [u, a, p, allU, allA, companyAccess, projRes] = await Promise.all([
          getPendingUsers(),
          getPendingAdmins(),
          getPendingProfileUpdates(),
          getAllUsers(),
          getAllAdmins(),
          getCompanyAccesses(),
          getAllProjects(),
        ]);
        const storedProfile = JSON.parse(localStorage.getItem("profile") || "{}");
        const myCompany = (storedProfile.company_name || storedProfile.company || "").trim().toLowerCase();
        const isSuper = myCompany === "hydroleap";
        const allAccesses = companyAccess?.company_accesses || [];
        const projectCount = isSuper
          ? (projRes?.projects || []).length
          : allAccesses.filter(ca => (ca.company || "").trim().toLowerCase() === myCompany).length;
        setPendingCounts({
          users:    (u  || []).length,
          admins:   (a  || []).length,
          profiles: (p  || []).length,
        });
        const allAdminsList = allA?.admins || allA || [];
        const superAdminCount = allAdminsList.filter(a =>
          (a.company_name || a.company || a.companyName || "").trim().toLowerCase() === "hydroleap"
        ).length;
        setTotalCounts({
          users:       (allU?.users || allU || []).length,
          admins:      allAdminsList.length,
          superAdmins: superAdminCount,
          projects:    projectCount,
        });
      } catch {}
    };
    fetchCounts();
    const iv = setInterval(fetchCounts, 30000);
    return () => clearInterval(iv);
  }, [role]);

  const unreadCount = Object.entries(pendingCounts).reduce((sum, [key, count]) =>
    sum + Math.max(0, count - (seenCounts[key] || 0)), 0);

  const markAllSeen = () => {
    localStorage.setItem("hl_notif_seen", JSON.stringify(pendingCounts));
    setSeenCounts({ ...pendingCounts });
  };

  const handleAdminNavigate = (key, subView) => {
    setActive(key);
    if (subView === "users"  && key === "approval-pending") setApprovalView("users");
    if (subView === "admins" && key === "approval-pending") setApprovalView("admins");
    if (subView === "users"  && key === "people-directory") setPeopleView("users");
    if (subView === "admins" && key === "people-directory") setPeopleView("admins");
  };

  const MAX_STARRED = 3;

  const toggleStar = async (pid) => {
    const isStarred = starred.includes(pid);
    // Block adding when already at limit
    if (!isStarred && starred.length >= MAX_STARRED) return;
    // Optimistic update
    setStarred(prev => isStarred ? prev.filter(id => id !== pid) : [...prev, pid]);
    try {
      const res = await toggleStarredProject(pid);
      setStarred(res?.starred || []);
    } catch {
      // Revert on failure
      setStarred(prev => isStarred ? prev.filter(id => id !== pid) : [...prev, pid]);
    }
  };
  const [tourActive,       setTourActive]       = useState(false);
  const [approvalView,     setApprovalView]     = useState("users");
  const [peopleView,       setPeopleView]       = useState("users");
  const [selectedProject,  setSelectedProject]  = useState(() => sessionStorage.getItem("hl_selected_project") || null);
  const [companyName,      setCompanyName]      = useState("");
  const [displayName,      setDisplayName]      = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!profile) navigate("/login");
  }, [profile, navigate]);

  // Resolve name + company from stored profile
  useEffect(() => {
    try {
      const p = profile || JSON.parse(localStorage.getItem("profile") || "{}");
      const name = p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "";
      const company = p.company || p.company_name || p.companyName || "";
      setDisplayName(name);
      setCompanyName(company);
    } catch {}
  }, [profile]);

  // ── Logout + idle detection — must be before early return ────────────────────
  const handleLogout = useCallback(() => {
    const email = (profile?.email || "").trim().toLowerCase();
    if (email) pushSessionEntry(email, "logout", "manual");
    logoutSession().catch(() => {});
    logout(navigate);
  }, [profile, logout, navigate]);

  const [idleWarning, setIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(10);
  const idleTimer    = useRef(null);
  const countdownRef = useRef(null);

  const clearCountdown = useCallback(() => {
    clearInterval(countdownRef.current);
    countdownRef.current = null;
  }, []);

  const startCountdown = useCallback(() => {
    setIdleCountdown(10);
    clearCountdown();
    countdownRef.current = setInterval(() => {
      setIdleCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          const email = (profile?.email || "").trim().toLowerCase();
          if (email) pushSessionEntry(email, "logout", "inactivity");
          logoutSession().catch(() => {});
          logout(navigate);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [profile, logout, navigate, clearCountdown]);

  const resetIdleTimer = useCallback(() => {
    if (idleWarning) return;
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setIdleWarning(true);
      startCountdown();
    }, 5 * 60 * 1000);
  }, [idleWarning, startCountdown]);

  const stayLoggedIn = useCallback(() => {
    setIdleWarning(false);
    setIdleCountdown(10);
    clearCountdown();
    resetIdleTimer();
  }, [clearCountdown, resetIdleTimer]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const onActivity = () => resetIdleTimer();
    events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach(ev => window.removeEventListener(ev, onActivity));
      clearTimeout(idleTimer.current);
      clearCountdown();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profile) return null;

  const isAdmin      = role === "admin";
  const isHydroleap  = companyName.toLowerCase() === "hydroleap";
  const initials     = displayName
    ? displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : isAdmin ? "A" : "U";

  // ── Nav items by role ──
  const USER_NAV = [
    { key: "dashboard",      icon: <FiHome     size={17} />, label: "Dashboard"      },
    { key: "projects",       icon: <FiGrid     size={17} />, label: "My Projects"    },
    { key: "reports",        icon: <FiFileText size={17} />, label: "Reports"        },
    { key: "report-history", icon: <FiClock    size={17} />, label: "Report History" },
    { separator: true, label: "More" },
    { key: "login-history",  icon: <FiShield   size={17} />, label: "Session History" },
    { key: "tutorial",       icon: <FiBookOpen size={17} />, label: "Tutorial"        },
    { key: "about",          icon: <FiInfo     size={17} />, label: "About"           },
    { key: "contact",        icon: <FiMail     size={17} />, label: "Contact Us"      },
  ];

  const ADMIN_NAV = [
    { key: "home",               icon: <FiHome        size={17} />, label: "Overview"        },
    { key: "approval-pending",   icon: <FiCheckCircle size={17} />, label: "Approvals"       },
    { key: "profile-updates",    icon: <FiUser        size={17} />, label: "Profile Updates" },
    { key: "projects",           icon: <FiGrid        size={17} />, label: "Projects"        },
    { key: "project-access",     icon: <FiLink        size={17} />, label: "Project Access"  },
    { key: "people-directory",   icon: <FiUsers       size={17} />, label: "People"          },
    ...(isHydroleap ? [{ key: "company-access", icon: <FiGlobe size={17} />, label: "Company Access" }] : []),
    { separator: true, label: "More" },
    { key: "adm-reports",        icon: <FiFileText size={17} />, label: "Reports"         },
    { key: "adm-report-history", icon: <FiClock    size={17} />, label: "Report History"  },
    { key: "adm-login-history",  icon: <FiShield   size={17} />, label: "Session History" },
    { key: "adm-tutorial",       icon: <FiBookOpen size={17} />, label: "Tutorial"        },
    { key: "adm-about",          icon: <FiInfo     size={17} />, label: "About"           },
    { key: "adm-contact",        icon: <FiMail     size={17} />, label: "Contact Us"      },
  ];

  const NAV_ITEMS = isAdmin ? ADMIN_NAV : USER_NAV;

  // Top-bar title logic
  const topbarTitle = (() => {
    if (active === "projects" && selectedProject) return selectedProject;
    const found = NAV_ITEMS.find(n => n.key === active);
    return found?.label || "Dashboard";
  })();

  const handleSelectProject = (pid) => {
    pushActivity({ verb: "Viewed", subject: `${pid} real-time data` });
    setSelectedProject(pid);
  };

  const handleSelectProjectFromOverview = (pid) => {
    pushActivity({ verb: "Viewed", subject: `${pid} real-time data` });
    setActive("projects");
    setSelectedProject(pid);
  };

  const handleBackFromIoT = () => {
    setSelectedProject(null);
  };

  const handleNavClick = (key) => {
    setActive(key);
    if (key !== "projects") setSelectedProject(null);
  };

  return (
    <div className="dash-root">

      {/* ── Idle warning modal ── */}
      {idleWarning && (
        <div className="idle-overlay">
          <div className="idle-modal">
            <div className="idle-modal-icon"><FiClock size={28} /></div>
            <div className="idle-modal-title">Still there?</div>
            <p className="idle-modal-body">
              You've been inactive for 5 minutes.<br />
              You'll be signed out automatically in <strong>{idleCountdown}s</strong>.
            </p>
            <div className="idle-modal-actions">
              <button className="idle-btn-stay" onClick={stayLoggedIn}>Stay logged in</button>
              <button className="idle-btn-logout" onClick={handleLogout}>Log out now</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`dash-sidebar ${sidebarOpen ? "open" : "closed"}`}>

        <div className="sidebar-brand" data-tour="brand">
          <img src={hydroleapLogo} alt="Hydroleap" />
          {sidebarOpen && (
            <>
              <div className="sidebar-brand-name">Hydroleap</div>
              <div className="sidebar-brand-sub">{isAdmin ? "Admin Portal" : "User Portal"}</div>
            </>
          )}
        </div>

        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <FiChevronRight size={16} /> : <FiMenu size={16} />}
        </button>

        <nav className="sidebar-nav" data-tour="nav">
          {sidebarOpen && <div className="sidebar-section-label">Navigation</div>}
          {NAV_ITEMS.map((item, idx) => item.separator ? (
            <div key={`sep-${idx}`} className={`sidebar-nav-sep ${sidebarOpen ? "sidebar-nav-sep--labeled" : ""}`}>
              {sidebarOpen && <span>{item.label}</span>}
            </div>
          ) : (
            <button
              key={item.key}
              data-tour={`nav-${item.key}`}
              className={`nav-item ${active === item.key ? "active" : ""}`}
              onClick={() => handleNavClick(item.key)}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
              {item.badge > 0 && (
                <span className="nav-badge" title={`${item.badge} pending`}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {!isAdmin && starred.length > 0 && (
          <div className="sidebar-starred" data-tour="starred">
            {sidebarOpen && (
              <div className="sidebar-section-label" style={{ display: "flex", justifyContent: "space-between", paddingRight: 8 }}>
                <span>Starred</span>
                <span style={{ opacity: 0.5 }}>{starred.length}/3</span>
              </div>
            )}
            {starred.map(pid => (
              <div key={pid} className="sidebar-starred-item">
                <button
                  className="sidebar-starred-nav"
                  onClick={() => handleSelectProjectFromOverview(pid)}
                  title={pid}
                >
                  <FiStar size={13} className="starred" />
                  {sidebarOpen && <span className="sidebar-starred-label">{pid}</span>}
                </button>
                {sidebarOpen && (
                  <button
                    className="sidebar-starred-remove"
                    onClick={() => toggleStar(pid)}
                    title="Unstar"
                  >
                    <FiX size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="sidebar-user-info" data-tour="avatar">
              <div className="sidebar-avatar sidebar-avatar--btn" onClick={() => setProfileOpen(true)} title="My Profile">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sidebar-user-name">{displayName || (isAdmin ? "Admin" : "User")}</div>
                <div className="sidebar-user-email">{companyName}</div>
              </div>
            </div>
          )}
          <button className="theme-toggle-btn" data-tour="theme" onClick={() => setDarkMode(d => !d)} title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
            {darkMode ? <FiSun size={15} /> : <FiMoon size={15} />}
            {sidebarOpen && <span>{darkMode ? "Light mode" : "Dark mode"}</span>}
          </button>
          <button className="logout-btn" onClick={handleLogout} title={!sidebarOpen ? "Logout" : undefined}>
            <FiLogOut size={16} />
            {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* Mobile backdrop — closes sidebar when tapped outside */}
      {sidebarOpen && (
        <div className="dash-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── MAIN ── */}
      <div className={`dash-main ${sidebarOpen ? "" : "sidebar-closed"}`}>

        {/* Top bar */}
        <div className="dash-topbar" data-tour="topbar">
          <div className="topbar-title">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              aria-expanded={sidebarOpen}
            >
              <FiMenu size={18} aria-hidden="true" />
            </button>

            {/* Back button when viewing IoT inline */}
            {active === "projects" && selectedProject && (
              <button className="db-back-btn" onClick={handleBackFromIoT} aria-label="Back to projects">
                <FiArrowLeft size={15} /> Projects
              </button>
            )}

            {topbarTitle}
          </div>

          <div className="topbar-right">
            <button
              className="topbar-refresh-btn"
              onClick={() => {
                sessionStorage.setItem("hl_active", active);
                if (selectedProject) sessionStorage.setItem("hl_selected_project", selectedProject);
                window.location.reload();
              }}
              title="Refresh page"
              aria-label="Refresh page"
            >
              <FiRefreshCw size={15} />
            </button>

            {/* Notification bell — admin */}
            {isAdmin && (
              <div className="notif-wrap">
                <button
                  className="topbar-notif-btn"
                  onClick={() => { setNotifOpen(o => !o); if (!notifOpen) markAllSeen(); }}
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} new)` : ""}`}
                  title="Notifications"
                >
                  <FiBell size={16} />
                  {unreadCount > 0 && (
                    <span className="notif-badge" aria-hidden="true">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div className="notif-backdrop" onClick={() => setNotifOpen(false)} aria-hidden="true" />
                    <NotificationPanel
                      counts={pendingCounts}
                      seenCounts={seenCounts}
                      onNavigate={handleAdminNavigate}
                      onClose={() => setNotifOpen(false)}
                    />
                  </>
                )}
              </div>
            )}

            {/* Notification bell — user */}
            {!isAdmin && (
              <div className="notif-wrap">
                <button
                  className="topbar-notif-btn"
                  onClick={() => { setNotifOpen(o => !o); if (!notifOpen) dismissProfileNotifs(); }}
                  aria-label={`Notifications${profileNotifs.length > 0 ? ` (${profileNotifs.length} new)` : ""}`}
                  title="Notifications"
                >
                  <FiBell size={16} />
                  {profileNotifs.length > 0 && (
                    <span className="notif-badge" aria-hidden="true">{profileNotifs.length > 9 ? "9+" : profileNotifs.length}</span>
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div className="notif-backdrop" onClick={() => setNotifOpen(false)} aria-hidden="true" />
                    <div className="notif-panel" role="dialog" aria-label="Notifications">
                      <div className="notif-panel-header">
                        <span className="notif-panel-title">Notifications</span>
                        <button className="notif-panel-close" onClick={() => setNotifOpen(false)} aria-label="Close">✕</button>
                      </div>
                      <div className="notif-panel-list">
                        {profileNotifs.length === 0 ? (
                          <div className="notif-empty">
                            <div className="notif-empty-icon"><FiBell size={18} /></div>
                            <div className="notif-empty-title">You're all caught up!</div>
                            <div className="notif-empty-sub">No new notifications right now.</div>
                          </div>
                        ) : (
                          profileNotifs.map(n => (
                            <div key={n.notification_id} className="notif-item notif-item--new">
                              <div className="notif-item-icon notif-item-icon--green"><FiCheckCircle size={15} /></div>
                              <div className="notif-item-body">
                                <div className="notif-item-label">{n.message}</div>
                                <div className="notif-item-sub">{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</div>
                              </div>
                              <span className="notif-item-dot" aria-hidden="true" />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {companyName && <span className="topbar-badge">{companyName}</span>}
            <div className="topbar-name">{displayName || (isAdmin ? "Admin" : "User")}</div>
            <div className="topbar-avatar topbar-avatar--btn" onClick={() => setProfileOpen(true)} title="My Profile">{initials}</div>
          </div>
        </div>

        {/* Content */}
        <div className={`dash-content${active === "projects" && selectedProject ? " dash-content--iot" : ""}`}>

          {/* ── USER SECTIONS ── */}
          {!isAdmin && active === "dashboard" && (
            <UserOverviewSection
              onSelectProject={handleSelectProjectFromOverview}
              onNavigateToProjects={() => setActive("projects")}
              starred={starred}
              onViewReport={r => { setPendingReport(r); setActive("reports"); }}
              notifications={profileNotifs}
              onDismissNotifs={dismissProfileNotifs}
            />
          )}

          {!isAdmin && active === "projects" && !selectedProject && (
            <div className="section-card">
              <div className="section-heading">
                <span className="section-heading-icon"><FiGrid size={15} /></span>
                My Projects
              </div>
              <div className="section-subheading">Select a project to view live IoT data</div>
              <UserProjectsSection onSelectProject={handleSelectProject} starred={starred} onToggleStar={toggleStar} />
            </div>
          )}

          {!isAdmin && active === "projects" && selectedProject && (
            <IoTDashboard
              projectId={selectedProject}
              embedded={true}
              onBack={handleBackFromIoT}
            />
          )}


          {!isAdmin && active === "reports" && (
            <div className="section-card">
              <div className="section-heading">
                <span className="section-heading-icon"><FiFileText size={15} /></span>
                Reports
              </div>
              <div className="section-subheading">Select a project, data type, and fields to generate a PDF report</div>
              <ReportBuilderSection initialReport={pendingReport} onConsumed={() => setPendingReport(null)} />
            </div>
          )}

          {!isAdmin && active === "report-history" && (
            <div className="section-card">
              <div className="section-heading">
                <span className="section-heading-icon"><FiClock size={15} /></span>
                Report History
              </div>
              <div className="section-subheading">All PDF reports generated from this account</div>
              <ReportHistorySection onViewReport={r => { setPendingReport(r); setActive("reports"); }} />
            </div>
          )}

          {!isAdmin && active === "login-history" && (
            <div className="section-card">
              <div className="section-heading">
                <span className="section-heading-icon"><FiClock size={15} /></span>
                Session History
              </div>
              <div className="section-subheading">Login and logout events recorded on this account</div>
              <LoginHistorySection email={profile?.email} />
            </div>
          )}

          {!isAdmin && active === "about" && (
            <div className="section-card">
              <div className="section-heading">
                <span className="section-heading-icon"><FiInfo size={15} /></span>
                About the Company
              </div>
              <div className="section-subheading">Hydroleap — Advanced Electrochemical Water Treatment</div>
              <AboutSection />
            </div>
          )}

          {!isAdmin && active === "contact" && (
            <div className="section-card">
              <div className="section-heading">
                <span className="section-heading-icon"><FiMail size={15} /></span>
                Contact Us
              </div>
              <div className="section-subheading">Get in touch with the Hydroleap team</div>
              <ContactSection />
            </div>
          )}

          {!isAdmin && active === "tutorial" && (
            <div className="section-card">
              <div className="section-heading">
                <span className="section-heading-icon"><FiBookOpen size={15} /></span>
                Tutorial
              </div>
              <div className="section-subheading">Learn how to use every feature of the dashboard</div>

              {/* Start tour CTA */}
              <div className="db-tutorial-hero">
                <div className="db-tutorial-hero-icon"><FiCrosshair size={32} /></div>
                <h3 className="db-tutorial-hero-title">Interactive Guided Tour</h3>
                <p className="db-tutorial-hero-desc">
                  Take a step-by-step walkthrough of the dashboard. Each step highlights
                  a feature with a spotlight and a description. Use arrow keys or the
                  on-screen buttons to move between steps.
                </p>
                <button
                  className="db-tutorial-start-btn"
                  onClick={() => setTourActive(true)}
                >
                  <FiCrosshair size={15} /> Start Interactive Tour
                </button>
              </div>

              {/* Feature overview cards */}
              <div className="db-tutorial-section-label">What you'll learn</div>
              <div className="db-tutorial-grid">
                {[
                  { icon: <FiHome size={16}/>,       title: "Dashboard Overview",   desc: "See live stats, alert counts, and average flow rates across all your projects." },
                  { icon: <FiGrid size={16}/>,       title: "My Projects",          desc: "Browse assigned projects and open any project's real-time IoT monitoring view." },
                  { icon: <FiFileText size={16}/>,   title: "Reports",              desc: "Generate and download PDF reports with date-filtered historic data and graphs." },
                  { icon: <FiStar size={16}/>,       title: "Starred Projects",     desc: "Pin frequently accessed projects to the sidebar for one-click navigation." },
                  { icon: <FiUser size={16}/>,       title: "Profile Panel",        desc: "View and edit your name, phone number, company, and date of birth." },
                  { icon: <FiSun size={16}/>,        title: "Theme Toggle",         desc: "Switch between dark and light themes. Your preference is saved automatically." },
                  { icon: <FiClock size={16}/>,      title: "Session History",      desc: "Review a log of logins and logouts with browser, OS, and reason." },
                  { icon: <FiHelpCircle size={16}/>, title: "Help & FAQ",           desc: "Answers to common questions about sensors, reports, and platform features." },
                ].map((f, i) => (
                  <div key={i} className="db-tutorial-card">
                    <div className="db-tutorial-card-icon">{f.icon}</div>
                    <div className="db-tutorial-card-title">{f.title}</div>
                    <div className="db-tutorial-card-desc">{f.desc}</div>
                  </div>
                ))}
              </div>

              {/* Keyboard shortcuts hint */}
              <div className="db-tutorial-shortcuts">
                <div className="db-tutorial-shortcuts-title">Keyboard shortcuts during tour</div>
                <div className="db-tutorial-shortcut-row"><kbd>→</kbd> Next step</div>
                <div className="db-tutorial-shortcut-row"><kbd>←</kbd> Previous step</div>
                <div className="db-tutorial-shortcut-row"><kbd>Esc</kbd> Exit tour</div>
              </div>
            </div>
          )}

          {/* ── ADMIN SECTIONS ── */}
          {isAdmin && (
            <>
              {active === "home" && (
                <AdminHome
                  isHydroleap={isHydroleap}
                  pendingCounts={pendingCounts}
                  totalCounts={totalCounts}
                  onNavigate={handleAdminNavigate}
                />
              )}

              {active === "approval-pending" && (
                <>
                  <div className="adm-page-header">
                    <div className="adm-page-header-left">
                      <div className="adm-page-header-icon adm-page-header-icon--teal"><FiCheckCircle size={16} /></div>
                      <div>
                        <div className="adm-page-header-title">Pending Approvals</div>
                        <div className="adm-page-header-sub">
                          {approvalView === "users" ? "Review pending user signups" : "Review pending admin signups"}
                        </div>
                      </div>
                    </div>
                    <div className="sub-toggle">
                      <button className={approvalView === "users"  ? "active" : ""} onClick={() => setApprovalView("users")}>
                        Users {pendingCounts.users > 0 && <span className="sub-toggle-badge">{pendingCounts.users}</span>}
                      </button>
                      <button className={approvalView === "admins" ? "active" : ""} onClick={() => setApprovalView("admins")}>
                        Admins {pendingCounts.admins > 0 && <span className="sub-toggle-badge">{pendingCounts.admins}</span>}
                      </button>
                    </div>
                  </div>
                  {approvalView === "users"  && <PendingUserApproval />}
                  {approvalView === "admins" && <PendingAdminApproval />}
                </>
              )}

              {active === "profile-updates" && (
                <>
                  <div className="adm-page-header">
                    <div className="adm-page-header-left">
                      <div className="adm-page-header-icon adm-page-header-icon--amber"><FiUser size={16} /></div>
                      <div>
                        <div className="adm-page-header-title">Profile Updates</div>
                        <div className="adm-page-header-sub">Review and approve pending profile change requests</div>
                      </div>
                    </div>
                    {pendingCounts.profiles > 0 && (
                      <span className="sub-toggle-badge">{pendingCounts.profiles} pending</span>
                    )}
                  </div>
                  <PendingProfileApproval />
                </>
              )}

              {active === "projects" && !selectedProject && (
                <AllProjects onSelectProject={handleSelectProject} />
              )}
              {active === "projects" && selectedProject && (
                <IoTDashboard
                  projectId={selectedProject}
                  embedded={true}
                  onBack={handleBackFromIoT}
                />
              )}

              {active === "project-access" && <UserProjectAccessPage />}

              {active === "company-access" && <CompanyProjectAccessPage />}

              {active === "people-directory" && (
                <>
                  <div className="adm-page-header">
                    <div className="adm-page-header-left">
                      <div className="adm-page-header-icon adm-page-header-icon--green"><FiUsers size={16} /></div>
                      <div>
                        <div className="adm-page-header-title">People Directory</div>
                        <div className="adm-page-header-sub">
                          {peopleView === "users" ? "All registered users" : "All registered admins"}
                        </div>
                      </div>
                    </div>
                    <div className="sub-toggle">
                      <button className={peopleView === "users"  ? "active" : ""} onClick={() => setPeopleView("users")}>
                        Users {totalCounts.users > 0 && <span className="sub-toggle-badge sub-toggle-badge--dim">{totalCounts.users}</span>}
                      </button>
                      <button className={peopleView === "admins" ? "active" : ""} onClick={() => setPeopleView("admins")}>
                        Admins {totalCounts.admins > 0 && <span className="sub-toggle-badge sub-toggle-badge--dim">{totalCounts.admins}</span>}
                      </button>
                    </div>
                  </div>
                  {peopleView === "users" ? <UserListSection /> : <AdminListSection />}
                </>
              )}

              {active === "adm-reports" && (
                <div className="section-card">
                  <div className="section-heading">
                    <span className="section-heading-icon"><FiFileText size={15} /></span>
                    Reports
                  </div>
                  <div className="section-subheading">Select a project, data type, and fields to generate a PDF report</div>
                  <ReportBuilderSection adminMode initialReport={pendingReport} onConsumed={() => setPendingReport(null)} />
                </div>
              )}

              {active === "adm-report-history" && (
                <div className="section-card">
                  <div className="section-heading">
                    <span className="section-heading-icon"><FiClock size={15} /></span>
                    Report History
                  </div>
                  <div className="section-subheading">All PDF reports generated from this account</div>
                  <ReportHistorySection onViewReport={r => { setPendingReport(r); setActive("adm-reports"); }} />
                </div>
              )}

              {active === "adm-login-history" && (
                <div className="section-card">
                  <div className="section-heading">
                    <span className="section-heading-icon"><FiShield size={15} /></span>
                    Session History
                  </div>
                  <div className="section-subheading">Login and logout events recorded on this account</div>
                  <LoginHistorySection email={profile?.email} />
                </div>
              )}

              {active === "adm-tutorial" && (
                <div className="section-card">
                  <div className="section-heading">
                    <span className="section-heading-icon"><FiBookOpen size={15} /></span>
                    Tutorial
                  </div>
                  <div className="section-subheading">Learn how to use every feature of the dashboard</div>
                  <div className="db-tutorial-hero">
                    <div className="db-tutorial-hero-icon"><FiCrosshair size={32} /></div>
                    <h3 className="db-tutorial-hero-title">Interactive Guided Tour</h3>
                    <p className="db-tutorial-hero-desc">
                      Take a step-by-step walkthrough of the dashboard. Each step highlights
                      a feature with a spotlight and a description. Use arrow keys or the
                      on-screen buttons to move between steps.
                    </p>
                    <button className="db-tutorial-start-btn" onClick={() => setTourActive(true)}>
                      <FiCrosshair size={15} /> Start Interactive Tour
                    </button>
                  </div>
                  <div className="db-tutorial-section-label">What you'll learn</div>
                  <div className="db-tutorial-grid">
                    {[
                      { icon: <FiHome size={16}/>,       title: "Dashboard Overview",   desc: "See live stats, pending approvals, and team totals at a glance." },
                      { icon: <FiCheckCircle size={16}/>, title: "Approvals",            desc: "Review and approve pending user and admin registrations." },
                      { icon: <FiUser size={16}/>,        title: "Profile Updates",      desc: "Review requests from users to update their profile details." },
                      { icon: <FiGrid size={16}/>,        title: "Projects",             desc: "View and manage all IoT projects in your organisation." },
                      { icon: <FiLink size={16}/>,        title: "Project Access",       desc: "Assign users to specific projects and manage their access." },
                      { icon: <FiUsers size={16}/>,       title: "People Directory",     desc: "Browse all users and admins registered in your company." },
                      { icon: <FiFileText size={16}/>,    title: "Reports",              desc: "Generate PDF reports with date-filtered historic IoT data." },
                      { icon: <FiShield size={16}/>,      title: "Session History",      desc: "Review your own login and logout history on this account." },
                    ].map((f, i) => (
                      <div key={i} className="db-tutorial-card">
                        <div className="db-tutorial-card-icon">{f.icon}</div>
                        <div className="db-tutorial-card-title">{f.title}</div>
                        <div className="db-tutorial-card-desc">{f.desc}</div>
                      </div>
                    ))}
                  </div>
                  <div className="db-tutorial-shortcuts">
                    <div className="db-tutorial-shortcuts-title">Keyboard shortcuts during tour</div>
                    <div className="db-tutorial-shortcut-row"><kbd>→</kbd> Next step</div>
                    <div className="db-tutorial-shortcut-row"><kbd>←</kbd> Previous step</div>
                    <div className="db-tutorial-shortcut-row"><kbd>Esc</kbd> Exit tour</div>
                  </div>
                </div>
              )}

              {active === "adm-about" && (
                <div className="section-card">
                  <div className="section-heading">
                    <span className="section-heading-icon"><FiInfo size={15} /></span>
                    About the Company
                  </div>
                  <div className="section-subheading">Hydroleap — Advanced Electrochemical Water Treatment</div>
                  <AboutSection />
                </div>
              )}

              {active === "adm-contact" && (
                <div className="section-card">
                  <div className="section-heading">
                    <span className="section-heading-icon"><FiMail size={15} /></span>
                    Contact Us
                  </div>
                  <div className="section-subheading">Get in touch with the Hydroleap team</div>
                  <ContactSection />
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* ── Guided Tour Overlay ── */}
      {tourActive && (
        <TourOverlay
          onClose={() => setTourActive(false)}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      {/* ── Profile Panel ── */}
      {profileOpen && (
        <div className="profile-panel-overlay" onClick={() => setProfileOpen(false)}>
          <div className="profile-panel" onClick={e => e.stopPropagation()}>
            <div className="profile-panel-header">
              <div className="profile-panel-title">
                <FiUser size={15} /> My Profile
              </div>
              <button className="profile-panel-close" onClick={() => setProfileOpen(false)}>
                <FiX size={16} />
              </button>
            </div>
            <div className="profile-panel-body">
              {isAdmin ? <AdminProfileSection /> : <UserProfileSection />}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
