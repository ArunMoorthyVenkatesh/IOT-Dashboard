import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import html2pdf from "html2pdf.js";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  FiDownload, FiX, FiChevronDown, FiEye,
  FiCalendar, FiGrid, FiSliders, FiFileText,
} from "react-icons/fi";
import { getUserAccesses, getAllProjects, getCloudWatchLogs } from "../services/api";
import hydroleapLogo from "../assets/hydroleap-logo.png";
import "./ReportBuilderSection.css";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const FIELD_LABELS = {
  Pump_speed:       "Pump Speed (RPM)",
  Flow_1:           "Flow 1 (m³/hr)",
  Flow_2:           "Flow 2 (m³/hr)",
  Pressure_1:       "Pressure 1 (bar)",
  Pressure_2:       "Pressure 2 (bar)",
  Temperature_1:    "Temperature 1 (°C)",
  Temperature_2:    "Temperature 2 (°C)",
  Rectifier_1_Vol:  "Rectifier 1 Voltage (V)",
  Rectifier_1_Amps: "Rectifier 1 Current (A)",
  Rectifier_2_Vol:  "Rectifier 2 Voltage (V)",
  Rectifier_2_Amps: "Rectifier 2 Current (A)",
  Rectifier_1_ON:   "Rectifier 1 ON",
  Rectifier_2_ON:   "Rectifier 2 ON",
};

// Keys that are not numeric / not suitable for line graphs
const NON_NUMERIC = ["Rectifier_1_ON", "Rectifier_2_ON"];

const EXCLUDED     = ["pk", "asset_id", "client_id", "timestamp"];
const getProjectId = (p) => p?.asset_id || p;

const fmtTime  = (ts) => dayjs(ts).format("DD MMM, h:mm A");
const fmtDate  = (ts) => dayjs(ts).format("DD MMM YYYY, h:mm:ss A");

// ── Inline graph helpers ─────────────────────────────────────
function buildTimeSeries(logs, variable) {
  return logs
    .map(log => ({ timestamp: log.timestamp, newValue: log.newImage?.[variable] }))
    .filter(item => item.newValue !== undefined)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// ── Inline KeyValue display (for report table) ───────────────
function KVDisplay({ data = {} }) {
  const entries = Object.entries(data).filter(([k]) => !EXCLUDED.includes(k));
  if (!entries.length) return <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>;
  return (
    <div style={{ fontSize: "0.78rem", fontFamily: "monospace", lineHeight: 1.5 }}>
      {entries.map(([k, v]) => (
        <div key={k}>
          <span style={{ fontWeight: 600, color: "#374151" }}>{k}: </span>
          <span style={{ color: "#111" }}>{String(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportBuilderSection({ initialReport = null, onConsumed, adminMode = false } = {}) {

  // ── Projects ─────────────────────────────────────────────────
  const [projects,    setProjects]    = useState([]);
  const [projLoading, setProjLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (adminMode) {
          // Admins load all projects directly (backend already filters by company)
          const projRes = await getAllProjects();
          const all     = Array.isArray(projRes) ? projRes : projRes.projects || [];
          setProjects(all);
        } else {
          const p         = JSON.parse(localStorage.getItem("profile") || "{}");
          const accessRes = await getUserAccesses(p.email || "");
          const accesses  = Array.isArray(accessRes)
            ? accessRes
            : accessRes?.user_accesses || accessRes?.projects || Object.values(accessRes || {});
          const ids = accesses.map(getProjectId).filter(Boolean);
          if (!ids.length) return;
          const projRes = await getAllProjects();
          const all     = Array.isArray(projRes) ? projRes : projRes.projects || [];
          setProjects(all.filter(p => ids.includes(getProjectId(p))));
        }
      } catch {}
      finally { setProjLoading(false); }
    };
    load();
  }, [adminMode]);

  // ── Form state ───────────────────────────────────────────────
  const [selectedProject, setSelectedProject] = useState("");
  const [views,           setViews]           = useState(new Set(["historic"]));
  const [dateFrom,        setDateFrom]        = useState(() => dayjs().subtract(3, "day").format("YYYY-MM-DD"));
  const [dateTo,          setDateTo]          = useState(() => dayjs().format("YYYY-MM-DD"));
  const [selectedFields,  setSelectedFields]  = useState([]);
  const [previewOpen,     setPreviewOpen]     = useState(false);

  const toggleView = (v) => {
    setViews(prev => {
      const next = new Set(prev);
      if (next.has(v) && next.size === 1) return prev;
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
    setSelectedFields([]);
  };

  // ── Data ─────────────────────────────────────────────────────
  const [logs,       setLogs]       = useState([]);
  const [fetching,   setFetching]   = useState(false);
  const [fetchError, setFetchError] = useState("");

  const fetchData = useCallback(async (pid) => {
    if (!pid) return;
    setFetching(true); setFetchError(""); setLogs([]); setSelectedFields([]);
    try {
      const res = await getCloudWatchLogs(pid);
      setLogs(res?.events || []);
    } catch (e) {
      setFetchError(e.message || "Failed to load data.");
    } finally { setFetching(false); }
  }, []);

  // ── Auto-populate from history click ─────────────────────────
  useEffect(() => {
    if (!initialReport) return;
    const { project, fields, dateFrom: df, dateTo: dt, dataTypes } = initialReport;
    setSelectedProject(project);
    setDateFrom(df || dayjs().subtract(3, "day").format("YYYY-MM-DD"));
    setDateTo(dt || dayjs().format("YYYY-MM-DD"));
    setViews(new Set(dataTypes || ["historic"]));
    onConsumed?.();
    setFetching(true); setFetchError(""); setLogs([]);
    getCloudWatchLogs(project)
      .then(res => {
        setLogs(res?.events || []);
        setSelectedFields(fields);
        setPreviewOpen(true);
      })
      .catch(e => setFetchError(e.message || "Failed to load report data."))
      .finally(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReport]);

  const clearAll = () => {
    setSelectedProject(""); setViews(new Set(["historic"])); setSelectedFields([]);
    setLogs([]); setFetchError("");
    setDateFrom(dayjs().subtract(3, "day").format("YYYY-MM-DD"));
    setDateTo(dayjs().format("YYYY-MM-DD"));
  };

  // ── Derived ──────────────────────────────────────────────────
  const realtimeData = useMemo(() => {
    const latest = [...logs].sort((a, b) => b.timestamp - a.timestamp)[0];
    return latest?.data?.newImage || {};
  }, [logs]);

  // auditLogs: flat array of { eventName, oldImage, newImage, timestamp, ... }
  const auditLogs = useMemo(() =>
    logs.map(e => ({
      ...e.data,
      action:    e.data?.eventName || "MODIFY",
      oldImage:  e.data?.oldImage  || {},
      newImage:  e.data?.newImage  || {},
      timestamp: new Date(e.timestamp).toISOString(),
    })),
  [logs]);

  // Date-filtered audit logs for report
  const filteredAuditLogs = useMemo(() =>
    auditLogs.filter(log => {
      const d = dayjs(log.timestamp);
      const after  = dateFrom ? d.isSameOrAfter(dayjs(dateFrom),  "day") : true;
      const before = dateTo   ? d.isSameOrBefore(dayjs(dateTo),   "day") : true;
      return after && before;
    }),
  [auditLogs, dateFrom, dateTo]);

  const allHistoricKeys = useMemo(() => {
    const keys = new Set();
    logs.forEach(e =>
      Object.keys(e.data?.newImage || {}).forEach(k => { if (!EXCLUDED.includes(k)) keys.add(k); })
    );
    return Array.from(keys);
  }, [logs]);

  const realtimeKeys = Object.keys(FIELD_LABELS).filter(
    k => realtimeData[k] !== undefined && realtimeData[k] !== null
  );

  const fieldList = useMemo(() => {
    const keys = new Set();
    if (views.has("historic")) allHistoricKeys.forEach(k => keys.add(k));
    if (views.has("realtime")) realtimeKeys.forEach(k => keys.add(k));
    return Array.from(keys);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views, allHistoricKeys, realtimeData]);

  const allSelected = fieldList.length > 0 && selectedFields.length === fieldList.length;
  const toggleAll   = () => setSelectedFields(allSelected ? [] : [...fieldList]);
  const toggleField = (k) => setSelectedFields(prev =>
    prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
  );
  const removeField = (k) => setSelectedFields(prev => prev.filter(x => x !== k));

  // ── PDF ──────────────────────────────────────────────────────
  const reportRef = useRef();

  const handleDownload = () => {
    if (!reportRef.current || !selectedFields.length) return;
    const hidden = reportRef.current.querySelectorAll(".no-print");
    hidden.forEach(el => (el.style.display = "none"));
    html2pdf()
      .set({
        filename: `${selectedProject}_report.pdf`,
        margin: [12, 10],
        image: { type: "jpeg", quality: 0.99 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      })
      .from(reportRef.current)
      .save()
      .then(() => {
        hidden.forEach(el => (el.style.display = ""));
        try {
          const entry = {
            project:   selectedProject,
            fields:    selectedFields,
            dateFrom,
            dateTo,
            dataTypes: Array.from(views),
            ts:        Date.now(),
          };
          const email = JSON.parse(localStorage.getItem("profile") || "{}").email || "unknown";
          const histKey = `hl_report_history_${email}`;
          const prev = JSON.parse(localStorage.getItem(histKey) || "[]");
          localStorage.setItem(histKey, JSON.stringify([entry, ...prev].slice(0, 20)));
        } catch {}
      });
  };

  const canGenerate = selectedProject && selectedFields.length > 0 && !fetching;

  // ── Reporter info ─────────────────────────────────────────────
  const profile       = JSON.parse(localStorage.getItem("profile") || "{}");
  const reporterName  = profile.name || profile.username || profile.email || "—";
  const reporterCo    = profile.company || profile.company_name || profile.organisation || "—";
  const reporterEmail = profile.email || "—";

  // ── Report content (shared by preview + PDF) ─────────────────
  const ReportContent = () => {
    // Graphs: only selected numeric fields
    const graphVars = selectedFields.filter(k => !NON_NUMERIC.includes(k));

    return (
      <div ref={reportRef} className="rb-report-sheet">

        {/* ── Header ── */}
        <div className="rb-report-header">
          <img src={hydroleapLogo} alt="Hydroleap" className="rb-report-logo" />
          <div className="rb-report-header-text">
            <h1 className="rb-report-title">Official Project Report</h1>
            <div className="rb-report-meta">
              Project: <strong>{selectedProject}</strong>
              {" · "}Date issued: <strong>{dayjs().format("DD/MM/YYYY")}</strong>
              {views.has("historic") && ` · ${dayjs(dateFrom).format("DD MMM YYYY")} → ${dayjs(dateTo).format("DD MMM YYYY")}`}
            </div>
          </div>
        </div>
        <div className="rb-report-divider" />

        {/* ── Prepared by ── */}
        <div className="rb-report-downloader">
          <div className="rb-report-downloader-heading">Prepared by</div>
          <div className="rb-report-downloader-fields">
            <div className="rb-report-downloader-row">
              <span className="rb-report-downloader-label">Name</span>
              <span className="rb-report-downloader-value">{reporterName}</span>
            </div>
            <div className="rb-report-downloader-row">
              <span className="rb-report-downloader-label">Company</span>
              <span className="rb-report-downloader-value">{reporterCo}</span>
            </div>
            <div className="rb-report-downloader-row">
              <span className="rb-report-downloader-label">Email Id</span>
              <span className="rb-report-downloader-value">{reporterEmail}</span>
            </div>
          </div>
        </div>

        {/* ── Real-time snapshot ── */}
        {views.has("realtime") && (
          <>
            <h2 className="rb-report-section-title">Real-time Snapshot</h2>
            <div className="rb-report-table-wrap">
              <table className="rb-report-table">
                <thead><tr><th>Variable</th><th>Value</th></tr></thead>
                <tbody>
                  {selectedFields.map(k => (
                    <tr key={k}>
                      <td>{FIELD_LABELS[k] || k}</td>
                      <td>{realtimeData[k] !== undefined ? String(realtimeData[k]) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Historic: line graphs ── */}
        {views.has("historic") && graphVars.length > 0 && (
          <>
            <h2 className="rb-report-section-title">Change History</h2>
            {graphVars.map(variable => {
              const data = buildTimeSeries(filteredAuditLogs, variable);
              if (!data.length) return null;
              return (
                <div key={variable} className="rb-report-chart-card">
                  <div className="rb-report-chart-label">{FIELD_LABELS[variable] || variable}</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data} margin={{ top: 8, right: 20, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={fmtTime}
                        minTickGap={40}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                      />
                      <YAxis allowDecimals tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <Tooltip labelFormatter={fmtTime} />
                      <Line
                        type="monotone" dataKey="newValue" name="Value"
                        stroke="#00d4c8" strokeWidth={2} dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </>
        )}

        {/* ── Historic: audit trail table ── */}
        {views.has("historic") && (
          <div style={{ pageBreakBefore: "always", breakBefore: "page" }}>
            <h2 className="rb-report-section-title">Audit Trail</h2>
            {filteredAuditLogs.length === 0 ? (
              <p style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "0.85rem" }}>
                No audit records in the selected date range.
              </p>
            ) : (
              <div className="rb-report-table-wrap">
                <table className="rb-report-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Time</th>
                      <th>Old Values</th>
                      <th>New Values</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td>{log.action}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(log.timestamp)}</td>
                        <td><KVDisplay data={log.oldImage} /></td>
                        <td><KVDisplay data={log.newImage} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Attestation stamp ── */}
        <div className="rb-report-attestation">
          <div className="rb-report-attestation-inner">
            <div className="rb-report-stamp-ring">
              <div className="rb-report-stamp-core">
                <img src={hydroleapLogo} alt="" className="rb-report-stamp-logo" />
                <div className="rb-report-stamp-text">CERTIFIED</div>
              </div>
            </div>
            <div className="rb-report-attestation-text">
              <p className="rb-report-attest-line">
                This report has been generated by the Hydroleap IoT Monitoring Platform and is
                authorised as an official document issued on{" "}
                <strong>{dayjs().format("DD MMMM YYYY")}</strong>.
              </p>
              <p className="rb-report-attest-line rb-report-attest-sub">
                The data contained herein is sourced directly from connected IoT devices managed
                under Hydroleap's cloud infrastructure. Any alteration of this document renders it void.
              </p>
              <div className="rb-report-attest-sig">
                <div className="rb-report-sig-line" />
                <div className="rb-report-sig-label">Authorised — Hydroleap Pte. Ltd.</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────
  const hasHistoric = views.has("historic");
  const stepFields  = hasHistoric ? "3" : "2";
  const stepGen     = hasHistoric ? "4" : "3";

  return (
    <div className="rb-root">

      {/* ── Header row ── */}
      <div className="rb-header">
        <div>
          <h2 className="rb-page-title">Report Builder</h2>
          <p className="rb-page-sub">Configure your report below, then preview or download as PDF.</p>
        </div>
        {(selectedProject || selectedFields.length > 0) && (
          <button className="rb-clear-all-btn" onClick={clearAll}>
            <FiX size={13} /> Clear all
          </button>
        )}
      </div>

      {/* ── Step cards ── */}
      <div className="rb-steps">

        {/* Step 1 — Project & data type */}
        <div className="rb-step-card">
          <div className="rb-step-num">1</div>
          <div className="rb-step-body">
            <div className="rb-step-title"><FiGrid size={14} /> Project &amp; Data Type</div>

            <div className="rb-two-col">
              <div className="rb-field-group">
                <label className="rb-label">Project</label>
                <div className="rb-select-wrap">
                  {projLoading
                    ? <div className="rb-inline-loading">Loading…</div>
                    : <>
                        <select
                          className="rb-select"
                          value={selectedProject}
                          onChange={e => { setSelectedProject(e.target.value); setSelectedFields([]); fetchData(e.target.value); }}
                        >
                          <option value="">— Select —</option>
                          {projects.map(p => {
                            const pid = getProjectId(p);
                            return <option key={pid} value={pid}>{pid}</option>;
                          })}
                        </select>
                        <FiChevronDown size={14} className="rb-select-caret" />
                      </>
                  }
                </div>
                {selectedProject && (
                  <button className="rb-inline-clear" onClick={() => { setSelectedProject(""); setSelectedFields([]); setLogs([]); }}>
                    <FiX size={11} /> Clear
                  </button>
                )}
              </div>

              <div className="rb-field-group">
                <label className="rb-label">Data Type</label>
                <div className="rb-toggle">
                  <button
                    className={`rb-toggle-btn${views.has("realtime") ? " active" : ""}`}
                    onClick={() => toggleView("realtime")}
                  >
                    Real-time
                  </button>
                  <button
                    className={`rb-toggle-btn${views.has("historic") ? " active" : ""}`}
                    onClick={() => toggleView("historic")}
                  >
                    Historic
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 — Date range */}
        {views.has("historic") && (
          <div className="rb-step-card">
            <div className="rb-step-num">2</div>
            <div className="rb-step-body">
              <div className="rb-step-title"><FiCalendar size={14} /> Date Range</div>
              <div className="rb-date-row">
                <div className="rb-field-group">
                  <label className="rb-label">From</label>
                  <input className="rb-input-date" type="date" value={dateFrom}
                    max={dateTo} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="rb-date-arrow">→</div>
                <div className="rb-field-group">
                  <label className="rb-label">To</label>
                  <input className="rb-input-date" type="date" value={dateTo}
                    min={dateFrom} max={dayjs().format("YYYY-MM-DD")}
                    onChange={e => setDateTo(e.target.value)} />
                </div>
                <button className="rb-inline-clear" style={{ marginTop: 22 }}
                  onClick={() => { setDateFrom(dayjs().subtract(3, "day").format("YYYY-MM-DD")); setDateTo(dayjs().format("YYYY-MM-DD")); }}>
                  <FiX size={11} /> Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Fields */}
        <div className="rb-step-card">
          <div className="rb-step-num">{stepFields}</div>
          <div className="rb-step-body">
            <div className="rb-step-title-row">
              <div className="rb-step-title"><FiSliders size={14} /> Select Fields</div>
              {fieldList.length > 0 && (
                <div className="rb-field-actions">
                  <button className="rb-text-btn" onClick={toggleAll}>
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                  {selectedFields.length > 0 && (
                    <button className="rb-text-btn rb-text-btn--danger" onClick={() => setSelectedFields([])}>
                      <FiX size={11} /> Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {!selectedProject && <div className="rb-empty-hint">Select a project first to see available fields.</div>}
            {fetching          && <div className="rb-inline-loading">Loading fields…</div>}
            {fetchError        && <div className="rb-fetch-error">{fetchError}</div>}

            {selectedProject && !fetching && fieldList.length === 0 && (
              <div className="rb-empty-hint">No fields available for this project.</div>
            )}

            {selectedProject && !fetching && fieldList.length > 0 && (
              <div className="rb-chips">
                {fieldList.map(k => {
                  const active = selectedFields.includes(k);
                  return (
                    <button key={k} className={`rb-chip${active ? " active" : ""}`} onClick={() => toggleField(k)}>
                      {FIELD_LABELS[k] || k}
                      {active && (
                        <span className="rb-chip-x" onClick={e => { e.stopPropagation(); removeField(k); }}>
                          <FiX size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedFields.length > 0 && (
              <div className="rb-selected-summary">
                {selectedFields.length} field{selectedFields.length > 1 ? "s" : ""} selected
              </div>
            )}
          </div>
        </div>

        {/* Step 4 — Actions */}
        <div className="rb-step-card rb-step-card--actions">
          <div className="rb-step-num">{stepGen}</div>
          <div className="rb-step-body">
            <div className="rb-step-title"><FiFileText size={14} /> Generate Report</div>
            <div className="rb-action-btns">
              <button className="rb-btn-preview" disabled={!canGenerate} onClick={() => setPreviewOpen(true)}>
                <FiEye size={15} /> Preview Report
              </button>
              <button className="rb-btn-download" disabled={!canGenerate} onClick={handleDownload}>
                <FiDownload size={15} /> Download PDF
              </button>
            </div>
            {!canGenerate && (
              <p className="rb-action-hint">
                {!selectedProject ? "Select a project to continue." : "Select at least one field to generate a report."}
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Always-mounted hidden report (keeps reportRef valid for direct download) */}
      <div style={{ position: "absolute", left: "-9999px", top: 0, width: "800px", pointerEvents: "none", opacity: 0 }}
        aria-hidden="true">
        {!previewOpen && <ReportContent />}
      </div>

      {/* ── Preview modal ── */}
      {previewOpen && (
        <div className="rb-modal-overlay" onClick={() => setPreviewOpen(false)}>
          <div className="rb-modal" onClick={e => e.stopPropagation()}>
            <div className="rb-modal-header">
              <div className="rb-modal-title">Report Preview</div>
              <div className="rb-modal-header-actions">
                <button className="rb-btn-download rb-btn-download--sm" onClick={handleDownload}>
                  <FiDownload size={13} /> Download PDF
                </button>
                <button className="rb-modal-close" onClick={() => setPreviewOpen(false)}>
                  <FiX size={16} />
                </button>
              </div>
            </div>
            <div className="rb-modal-body">
              <ReportContent />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
