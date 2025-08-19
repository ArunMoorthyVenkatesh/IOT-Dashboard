import React, { useState, useMemo, useRef } from "react";
import html2pdf from "html2pdf.js";
import dayjs from "dayjs";
import hydroleapLogo from "../assets/hydroleap-logo.png";
import "./ReportSection.css";
import AuditTrailGraphs from "./AuditTrailGraphs";
import AuditTrail from "./AuditTrail";

const FIELD_LABELS = {
  FIT_01: "FIT-01 (Flow 1, m³/hr)",
  FIT_02: "FIT-02 (Flow 2, m³/hr)",
  LIT_01: "LIT-01 (Level 1, m)",
  LIT_02: "LIT-02 (Level 2, m)",
  Rectifier_V: "Rectifier Voltage (V)",
  Rectifier_A: "Rectifier Current (A)",
  Temperature: "Temperature (°C)",
  Pressure: "Pressure (bar)",
  "system running": "System Running",
  Pump_01: "Pump",
  Rectifier_01: "Rectifier"
};
const EXCLUDED_KEYS = ["projectId", "project_id", "deviceId", "device_id", "timestamp"];

export default function ReportSection({
  projectId,
  deviceId,
  data,
  auditLogs
}) {
  const [view, setView] = useState("realtime"); // "realtime" | "historic"
  const [selectedFields, setSelectedFields] = useState([]);
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const reportRef = useRef();

  const ALL_FIELDS = Object.keys(FIELD_LABELS);
  const availableRTFields = ALL_FIELDS.filter(
    key => data && data[key] !== undefined && data[key] !== null
  );

  const allAuditKeys = useMemo(() => {
    const keysSet = new Set();
    (auditLogs || []).forEach(log => {
      Object.keys(log.newImage || {}).forEach(k => {
        if (!EXCLUDED_KEYS.includes(k)) keysSet.add(k);
      });
    });
    return Array.from(keysSet);
  }, [auditLogs]);

  const availableHistoricFields = allAuditKeys;

  const historyMap = useMemo(() => {
    const result = {};
    availableHistoricFields.forEach(key => {
      result[key] = (auditLogs || [])
        .filter(log => log.newImage && log.newImage[key] !== undefined && log.newImage[key] !== null)
        .map(log => ({
          time: log.timestamp,
          value: log.newImage[key]
        }))
        .sort((a, b) => new Date(a.time) - new Date(b.time));
    });
    return result;
  }, [auditLogs, availableHistoricFields]);

  const filteredHistoricData = key => {
    if (!historyMap[key]) return [];
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return historyMap[key].filter(
      d => new Date(d.time) >= from && new Date(d.time) <= to
    );
  };

  const fieldList = view === "realtime" ? availableRTFields : availableHistoricFields;
  const allSelected = selectedFields.length === fieldList.length && fieldList.length > 0;
  const handleSelectAll = () => {
    setSelectedFields(allSelected ? [] : [...fieldList]);
  };
  const handleSelectField = key => {
    setSelectedFields(sel =>
      sel.includes(key) ? sel.filter(k => k !== key) : [...sel, key]
    );
  };

  function handleDownloadPDF() {
    if (!reportRef.current) return;
    const buttons = reportRef.current.querySelectorAll(".no-print");
    buttons.forEach(btn => btn.style.display = "none");
    html2pdf()
      .set({
        filename: `${projectId}_official_report.pdf`,
        margin: [12, 10],
        image: { type: "jpeg", quality: 0.99 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      })
      .from(reportRef.current)
      .save()
      .then(() => {
        buttons.forEach(btn => btn.style.display = "");
      });
  }

  const todayStr = dayjs().format("DD/MM/YYYY");

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Toggle, field selection */}
      <div className="toggle-switch-row-centered" style={{ margin: "12px 0 22px 0" }}>
        <div className="toggle-switch-row">
          <button
            className={view === "realtime" ? "toggle-btn active" : "toggle-btn"}
            onClick={() => { setView("realtime"); setSelectedFields([]); }}
          >
            Real Time Data
          </button>
          <button
            className={view === "historic" ? "toggle-btn active" : "toggle-btn"}
            onClick={() => { setView("historic"); setSelectedFields([]); }}
          >
            Historic Data
          </button>
        </div>
      </div>
      {/* Select fields */}
      <div style={{ marginBottom: 18 }}>
        <div className="report-checkboxes">
          {fieldList.map(f => (
            <label key={f} className="pretty-checkbox">
              <input
                type="checkbox"
                checked={selectedFields.includes(f)}
                onChange={() => handleSelectField(f)}
              />
              <span className="custom-check"></span>
              {FIELD_LABELS[f] || f}
            </label>
          ))}
        </div>
      </div>
      {/* ===================== REPORT PREVIEW FOR PDF ===================== */}
      <div ref={reportRef} style={{
        background: "#fff",
        borderRadius: 22,
        boxShadow: "0 4px 32px 0 #009f8d0c",
        padding: "36px 32px 30px 32px",
        position: "relative",
        marginTop: 18
      }}>
        {/* Logo and Title */}
        <img
          src={hydroleapLogo}
          alt="Hydroleap Logo"
          className="report-logo"
          style={{
            position: "absolute",
            top: 24,
            right: 32,
            width: 120,
            height: "auto",
            objectFit: "contain",
            zIndex: 10
          }}
        />
        <h1 style={{
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "2.2rem",
          marginBottom: 14,
          marginTop: 8
        }}>Official Project Report</h1>
        <div style={{ textAlign: "center", fontSize: 16, marginBottom: 18 }}>
          <span>Project ID: <b>{projectId}</b></span>
          {" | "}
          <span>Device ID: <b>{deviceId}</b></span>
          {" | "}
          <span>Date Issued: <b>{todayStr}</b></span>
        </div>
        {/* Real Time Data Table */}
        {view === "realtime" && (
          <div>
            <h2 style={{ marginTop: 12, marginBottom: 10, fontSize: 22 }}>Real Time Data</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {selectedFields.map(key => (
                  <tr key={key}>
                    <td>{FIELD_LABELS[key] || key}</td>
                    <td>{data[key] !== undefined ? String(data[key]) : "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Historic Data Graphs and Audit Trail */}
        {view === "historic" && (
          <>
            {/* Graphs */}
            <div>
              <AuditTrailGraphs
                projectId={projectId}
                variables={selectedFields}
                auditLogs={auditLogs}
                dateFrom={dateFrom}
                dateTo={dateTo}
                forReport
              />
            </div>
            {/* Force page break before AuditTrail Table in PDF */}
            <div style={{ pageBreakBefore: "always", breakBefore: "page" }}>
              <h2 style={{ marginTop: 32, marginBottom: 10, fontSize: 22 }}>
                Audit Trail Change Table
              </h2>
              <AuditTrail
                projectId={projectId}
                auditLogs={auditLogs}
                dateFrom={dateFrom}
                dateTo={dateTo}
                forReport
              />
            </div>
          </>
        )}
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button
          className="download-btn no-print"
          style={{
            background: "#fff", border: "2px solid #009f8d", color: "#212",
            borderRadius: 8, padding: "10px 22px", fontWeight: 700, fontSize: "1.1rem",
            cursor: selectedFields.length === 0 ? "not-allowed" : "pointer",
            opacity: selectedFields.length === 0 ? 0.5 : 1
          }}
          onClick={handleDownloadPDF}
        >
          Download Report
        </button>
      </div>
    </div>
  );
}
