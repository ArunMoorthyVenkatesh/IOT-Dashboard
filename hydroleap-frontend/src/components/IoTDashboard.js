import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import GaugeDisplay from "./GaugeDisplay";
import { getAllProjects, getCloudWatchLogs } from "../services/api";
import hydroleapLogo from "../assets/hydroleap-logo.png";
import "./IoTDashboard.css";

// ── Date Helpers (native JS — no dayjs) ────────────────────────────────────────

const toISODate = (ts) => new Date(ts).toISOString().slice(0, 10);

const fmtLong = (ts) => {
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
};

const fmtShort = (ts) => {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
};

const inRange = (ts, from, to) => {
  const d = toISODate(ts);
  return (!from || d >= from) && (!to || d <= to);
};

// ── SVG Icons (inline — no react-icons) ───────────────────────────────────────

const IcoArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>
  </svg>
);

const IcoRefresh = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

const IcoAlert = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// IcoPower kept for potential future use
// eslint-disable-next-line no-unused-vars
const IcoPower = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
  </svg>
);

const IcoDroplet = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
);

const IcoZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const IcoThermometer = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
  </svg>
);

const IcoActivity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

// ── Constants ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const FIELD_LABELS = {
  Pump_speed:      "Pump Speed (RPM)",
  Flow_1:          "Flow 1 (m\u00b3/hr)",
  Flow_2:          "Flow 2 (m\u00b3/hr)",
  Pressure_1:      "Pressure 1 (bar)",
  Pressure_2:      "Pressure 2 (bar)",
  Temperature_1:   "Temperature 1 (\u00b0C)",
  Temperature_2:   "Temperature 2 (\u00b0C)",
  Rectifier_1_ON:  "Rectifier 1",
  Rectifier_2_ON:  "Rectifier 2",
  Rectifier_1_Vol: "Rectifier 1 Voltage (V)",
  Rectifier_1_Amps:"Rectifier 1 Current (A)",
  Rectifier_2_Vol: "Rectifier 2 Voltage (V)",
  Rectifier_2_Amps:"Rectifier 2 Current (A)",
};

const GAUGE_META = [
  { field: "Flow_1",          label: "Flow 1",            max: 15,  unit: "m\u00b3/hr" },
  { field: "Flow_2",          label: "Flow 2",            max: 15,  unit: "m\u00b3/hr" },
  { field: "Pressure_1",      label: "Pressure 1",        max: 20,  unit: "bar" },
  { field: "Pressure_2",      label: "Pressure 2",        max: 20,  unit: "bar" },
  { field: "Temperature_1",   label: "Temperature 1",     max: 400, unit: "\u00b0C" },
  { field: "Temperature_2",   label: "Temperature 2",     max: 400, unit: "\u00b0C" },
  { field: "Rectifier_1_Vol", label: "Rectifier 1 (V)",   max: 50,  unit: "V" },
  { field: "Rectifier_1_Amps",label: "Rectifier 1 (A)",   max: 30,  unit: "A" },
  { field: "Rectifier_2_Vol", label: "Rectifier 2 (V)",   max: 50,  unit: "V" },
  { field: "Rectifier_2_Amps",label: "Rectifier 2 (A)",   max: 30,  unit: "A" },
];

const SYSTEM_META = [
  { key: "Rectifier_1_ON", label: "Rectifier 1", icon: <IcoZap />,     color: "#f59e0b" },
  { key: "Rectifier_2_ON", label: "Rectifier 2", icon: <IcoZap />,     color: "#f97316" },
];

const REALTIME_FIELDS = [
  { key: "Pump_speed",       label: "Pump Speed",      icon: <IcoDroplet />,    color: "#3b82f6", unit: "RPM" },
  { key: "Flow_1",           label: "Flow 1",           icon: <IcoDroplet />,    color: "#10b981", unit: "m\u00b3/hr" },
  { key: "Flow_2",           label: "Flow 2",           icon: <IcoDroplet />,    color: "#00d4c8", unit: "m\u00b3/hr" },
  { key: "Pressure_1",       label: "Pressure 1",       icon: <IcoActivity />,   color: "#8b5cf6", unit: "bar" },
  { key: "Pressure_2",       label: "Pressure 2",       icon: <IcoActivity />,   color: "#a78bfa", unit: "bar" },
  { key: "Temperature_1",    label: "Temperature 1",    icon: <IcoThermometer />,color: "#f59e0b", unit: "\u00b0C" },
  { key: "Temperature_2",    label: "Temperature 2",    icon: <IcoThermometer />,color: "#f97316", unit: "\u00b0C" },
  { key: "Rectifier_1_Vol",  label: "Rectifier 1 (V)",  icon: <IcoZap />,        color: "#ec4899", unit: "V" },
  { key: "Rectifier_1_Amps", label: "Rectifier 1 (A)",  icon: <IcoZap />,        color: "#ef4444", unit: "A" },
  { key: "Rectifier_2_Vol",  label: "Rectifier 2 (V)",  icon: <IcoZap />,        color: "#00d4c8", unit: "V" },
  { key: "Rectifier_2_Amps", label: "Rectifier 2 (A)",  icon: <IcoZap />,        color: "#a78bfa", unit: "A" },
];

const AUDIT_EXCLUDED = [
  "pk", "asset_id", "client_id", "timestamp",
  "Rectifier_1_ON", "Rectifier_2_ON",
];

const CHART_COLORS = [
  "#00d4c8", "#3b82f6", "#10b981", "#f59e0b",
  "#8b5cf6", "#f97316", "#ec4899", "#a78bfa",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractVariables(logs, excluded = AUDIT_EXCLUDED) {
  const vars = new Set();
  logs.forEach(log =>
    Object.keys(log.newImage || {}).forEach(k => {
      if (!excluded.includes(k)) vars.add(k);
    })
  );
  return Array.from(vars);
}

function buildTimeSeries(logs, variable) {
  return logs
    .map(log => ({ timestamp: log.timestamp, newValue: log.newImage?.[variable] }))
    .filter(item => item.newValue !== undefined)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// ── Chart Tooltip ─────────────────────────────────────────────────────────────

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-time">{fmtShort(label)}</div>
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip-row">
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="chart-tooltip-val">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonCards = () => (
  <div className="metric-grid" role="status" aria-label="Loading data\u2026">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="skeleton-card">
        <div className="skeleton sk-circle" />
        <div className="skeleton sk-bar" style={{ width: "60%", marginTop: 10 }} />
        <div className="skeleton sk-bar" style={{ width: "40%", marginTop: 8 }} />
      </div>
    ))}
  </div>
);

// ── Header ────────────────────────────────────────────────────────────────────

const HeaderBar = ({ onRefresh }) => {
  const navigate = useNavigate();
  const userName = (() => {
    try {
      const p = JSON.parse(localStorage.getItem("profile") || "{}");
      return p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "";
    } catch { return ""; }
  })();
  const initials = userName
    ? userName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";
  return (
    <header className="dash-header" role="banner">
      <div className="dash-header-left">
        <button onClick={() => navigate(-1)} className="dash-back-btn" aria-label="Go back">
          <IcoArrowLeft /> Back
        </button>
        <div className="dash-brand">
          <img src={hydroleapLogo} alt="Hydroleap logo" className="dash-logo" />
          <span className="dash-title">
            Hydroleap<span className="dash-title-accent"> IoT</span>
          </span>
        </div>
      </div>
      <div className="dash-header-right">
        <button
          className="page-refresh-btn" onClick={onRefresh}
          title="Refresh dashboard" aria-label="Refresh dashboard"
        >
          <IcoRefresh />
        </button>
        {userName && <span className="dash-username">{userName}</span>}
        <div className="dash-avatar" aria-hidden="true" title={userName}>{initials}</div>
      </div>
    </header>
  );
};

// ── Project Info Bar ──────────────────────────────────────────────────────────

const ProjectInfoBar = ({ projectId, deviceId, clientId, lastUpdated }) => (
  <div className="project-bar">
    <div className="project-bar-left">
      <span className="project-bar-label">Asset</span>
      <span className="project-id-badge">{projectId}</span>
      {clientId && (
        <>
          <span className="project-bar-sep" aria-hidden="true" />
          <span className="project-bar-label">Client</span>
          <strong className="project-device">{clientId}</strong>
        </>
      )}
    </div>
    <div className="project-bar-right">
      {lastUpdated && (
        <span className="project-last-updated">
          Updated {fmtShort(lastUpdated)}
        </span>
      )}
      <span className="live-badge">
        <span className="live-dot" aria-hidden="true" />
        LIVE
      </span>
    </div>
  </div>
);

// ── System Status Card ────────────────────────────────────────────────────────

const SystemCard = ({ icon, label, value, color }) => {
  const on = Boolean(value);
  const activeColor = on ? color : "#ef4444";
  return (
    <article
      className={`sys-card ${on ? "sys-card--on" : "sys-card--off"}`}
      aria-label={`${label}: ${on ? "Running" : "Stopped"}`}
    >
      <div className="sys-card-icon" style={{ color: activeColor, background: `${activeColor}18` }}>
        {icon}
      </div>
      <div className="sys-card-body">
        <div className="sys-card-label">{label}</div>
        <div className="sys-card-status" style={{ color: activeColor }}>
          <span className={`sys-dot ${on ? "sys-dot--on" : "sys-dot--off"}`} aria-hidden="true" />
          {on ? "RUNNING" : "STOPPED"}
        </div>
      </div>
    </article>
  );
};

// ── Metric Card ───────────────────────────────────────────────────────────────

const MetricCard = ({ label, value, unit, color, icon }) => (
  <article
    className="metric-card"
    aria-label={`${label}: ${value ?? "\u2014"}${unit ? " " + unit : ""}`}
  >
    <div className="metric-card-top">
      <span className="metric-icon" style={{ color }} aria-hidden="true">{icon}</span>
      <span className="metric-label">{label}</span>
    </div>
    <div className="metric-value" style={{ color }}>
      {value !== undefined && value !== null ? value : "\u2014"}
    </div>
    {unit && <div className="metric-unit">{unit}</div>}
    <div className="metric-card-bar" style={{ background: color }} />
  </article>
);

// ── Date Range Filter ─────────────────────────────────────────────────────────

const DateFilter = ({ from, to, onFrom, onTo }) => (
  <div className="date-filter" role="group" aria-label="Date range filter">
    <span className="date-filter-label">Timeline</span>
    <label className="date-filter-field">
      <span>From</span>
      <input
        type="date" value={from} onChange={e => onFrom(e.target.value)}
        className="date-input" aria-label="From date"
      />
    </label>
    <label className="date-filter-field">
      <span>To</span>
      <input
        type="date" value={to} onChange={e => onTo(e.target.value)}
        className="date-input" aria-label="To date"
      />
    </label>
  </div>
);

// ── KV Display ───────────────────────────────────────────────────────────────

const KV_SKIP = new Set(["pk", "asset_id", "client_id", "timestamp"]);

const KVDisplay = ({ data }) => {
  const entries = Object.entries(data || {}).filter(([k]) => !KV_SKIP.has(k));
  return (
    <div className="kv-cell">
      {entries.length > 0
        ? entries.map(([k, v]) => (
            <div key={k} className="kv-row">
              <span className="kv-key">{k}:</span>
              <span className="kv-val">{String(v)}</span>
            </div>
          ))
        : <span className="kv-empty">No changes</span>}
    </div>
  );
};

// ── Audit Trail Tab ────────────────────────────────────────────────────────────

const AuditSection = ({ auditLogs }) => {
  const [from, setFrom] = useState("");
  const [to, setTo]     = useState("");

  useEffect(() => {
    if (!auditLogs.length) return;
    const sorted = [...auditLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    setFrom(prev => prev || toISODate(sorted[0].timestamp));
    setTo(prev   => prev || toISODate(sorted[sorted.length - 1].timestamp));
  }, [auditLogs]);

  const filtered = useMemo(
    () => auditLogs.filter(l => inRange(l.timestamp, from, to)),
    [auditLogs, from, to]
  );

  return (
    <div className="audit-section">
      <DateFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
      <div className="audit-table-wrap">
        <table className="audit-table" aria-label="Audit trail of recent project changes">
          <thead>
            <tr>
              {["Action", "Timestamp", "Previous Values", "Updated Values"].map(h => (
                <th key={h} scope="col">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((log, i) => (
                <tr key={i}>
                  <td><span className="audit-action-badge">{log.action}</span></td>
                  <td className="audit-ts">{fmtLong(log.timestamp)}</td>
                  <td><KVDisplay data={log.oldImage} /></td>
                  <td><KVDisplay data={log.newImage} /></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="audit-empty">
                  No audit logs in the selected date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Audit Graphs Tab ───────────────────────────────────────────────────────────

const AuditGraphsSection = ({ auditLogs }) => {
  const [from, setFrom]   = useState("");
  const [to, setTo]       = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auditLogs.length || ready) return;
    const sorted = [...auditLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    setFrom(toISODate(sorted[0].timestamp));
    setTo(toISODate(sorted[sorted.length - 1].timestamp));
    setReady(true);
  }, [auditLogs, ready]);

  const variables = useMemo(() => extractVariables(auditLogs), [auditLogs]);

  const filtered = useMemo(
    () => auditLogs.filter(l => inRange(l.timestamp, from, to)),
    [auditLogs, from, to]
  );

  if (!auditLogs.length || !variables.length)
    return <div className="section-empty">No audit trail data for this project.</div>;

  return (
    <div className="graphs-section">
      <DateFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
      <div className="graphs-grid">
        {variables.map((variable, idx) => {
          const series = buildTimeSeries(filtered, variable);
          if (!series.length) return null;
          const color  = CHART_COLORS[idx % CHART_COLORS.length];
          const gradId = `grad-${variable.replace(/[^a-z0-9]/gi, "")}`;
          return (
            <section key={variable} className="chart-card" aria-label={`${variable} over time`}>
              <div className="chart-card-header">
                <h3 className="chart-card-title">{variable}</h3>
                <span className="chart-card-count">{series.length} data points</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="timestamp" tickFormatter={fmtShort} minTickGap={60}
                    tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.07)" }} tickLine={false}
                  />
                  <YAxis
                    allowDecimals
                    tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.07)" }} tickLine={false}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Area
                    type="monotone" dataKey="newValue" name={variable}
                    stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </section>
          );
        })}
      </div>
    </div>
  );
};

// ── Tab Config ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "realtime",     label: "Real Time" },
  { id: "audit",        label: "Audit Trail" },
  { id: "audit-graphs", label: "Audit Graphs" },
];

// ── Main Component ─────────────────────────────────────────────────────────────

const IoTDashboard = ({ projectId: propProjectId, embedded = false }) => {
  const { projectId: routeProjectId } = useParams();
  const projectId = propProjectId || routeProjectId;
  const navigate      = useNavigate();

  const [data, setData]               = useState({});
  const [clientId, setClientId]       = useState("");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [auditLogs, setAuditLogs]     = useState([]);
  const [activeTab, setActiveTab]     = useState("realtime");
  const [subView, setSubView]         = useState("numeric");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchProject = useCallback(async () => {
    try {
      const res = await getAllProjects();
      let projects = res.projects || res || [];
      if (!Array.isArray(projects)) projects = [];
      const project = projects.find(p =>
        p.asset_id === projectId || p.pk?.endsWith(`#${projectId}`)
      );
      if (!project) {
        setError("Project not found. It may have been removed or you don\u2019t have access.");
        setClientId(""); setData({});
        return;
      }
      // data is stored as a JSON string in DynamoDB
      let sensorData = {};
      try {
        sensorData = typeof project.data === "string"
          ? JSON.parse(project.data)
          : (project.data || {});
      } catch { sensorData = {}; }

      setClientId(project.client_id || "");
      setData(sensorData);
      setLastUpdated(project.timestamp || new Date().toISOString());
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load project data.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchProject();
    const interval = setInterval(() => { if (mounted) fetchProject(); }, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, [fetchProject]);

  useEffect(() => {
    let mounted = true;
    getCloudWatchLogs(projectId)  // projectId here = asset_id
      .then(res => {
        if (!mounted) return;
        const events = res?.events || [];
        setAuditLogs(events.map(e => ({
          action:    e.data?.eventName || "UNKNOWN",
          timestamp: e.timestamp,
          oldImage:  e.data?.oldImage || {},
          newImage:  e.data?.newImage || {},
        })));
      })
      .catch(() => { /* audit logs are supplementary — silent fail OK */ });
    return () => { mounted = false; };
  }, [projectId]);

  return (
    <div className={embedded ? "iot-embedded-root" : "dash-root"}>
      {!embedded && (
        <HeaderBar onRefresh={() => embedded ? fetchProject() : navigate(0)} />
      )}
      <ProjectInfoBar projectId={projectId} clientId={clientId} lastUpdated={lastUpdated} />

      {/* ── Tab Navigation ── */}
      <nav className="dash-tabs" aria-label="Dashboard sections">
        <div className="tab-group" role="tablist">
          {TABS.map(tab => (
            <button key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-btn${activeTab === tab.id ? " tab-btn--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "realtime" && (
          <div className="tab-sub-group" role="group" aria-label="Real time view mode">
            {[["numeric", "Numeric"], ["gauge", "Gauges"]].map(([v, l]) => (
              <button key={v}
                className={`tab-sub-btn${subView === v ? " tab-sub-btn--active" : ""}`}
                onClick={() => setSubView(v)} aria-pressed={subView === v}>
                {l}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── Error State ── */}
      {error && (
        <div className="dash-error" role="alert" aria-live="assertive">
          <IcoAlert />
          <p>{error}</p>
          <button className="dash-retry-btn" onClick={fetchProject}>
            <IcoRefresh /> Try again
          </button>
        </div>
      )}

      {/* ── Real Time: Numeric ── */}
      {!error && activeTab === "realtime" && subView === "numeric" && (
        loading ? <SkeletonCards /> : (
          <div className="realtime-section">
            <div className="sys-row" role="list" aria-label="System status">
              {SYSTEM_META.filter(m => data[m.key] !== undefined).map(m => (
                <SystemCard key={m.key} icon={m.icon} label={m.label}
                  value={data[m.key]} color={m.color} />
              ))}
            </div>
            <div className="metric-grid" role="list" aria-label="Real-time sensor readings">
              {REALTIME_FIELDS.filter(m => data[m.key] !== undefined).map(m => (
                <MetricCard key={m.key} label={m.label} value={data[m.key]}
                  color={m.color} icon={m.icon} unit={m.unit} />
              ))}
            </div>
          </div>
        )
      )}

      {/* ── Real Time: Gauges ── */}
      {!error && activeTab === "realtime" && subView === "gauge" && (
        loading ? <SkeletonCards /> : (
          <div className="realtime-section">
            <div className="sys-row" role="list" aria-label="System status">
              {SYSTEM_META.filter(m => typeof data[m.key] === "boolean").map(m => (
                <SystemCard key={m.key} icon={m.icon} label={m.label}
                  value={data[m.key]} color={m.color} />
              ))}
            </div>
            <div className="gauge-grid" aria-label="Gauge readings">
              {GAUGE_META.filter(m => typeof data[m.field] === "number").map(m => (
                <div key={m.field} className="gauge-wrap">
                  <GaugeDisplay
                    label={m.label} value={data[m.field]}
                    maxValue={m.max} unit={m.unit}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ── Audit Trail ── */}
      {activeTab === "audit" && <AuditSection auditLogs={auditLogs} />}

      {/* ── Audit Graphs ── */}
      {activeTab === "audit-graphs" && <AuditGraphsSection auditLogs={auditLogs} />}

    </div>
  );
};

export default IoTDashboard;
