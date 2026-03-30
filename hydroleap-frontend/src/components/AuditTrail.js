import React, { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import "./AuditTrailPage.css";

const formatTime = (timestamp) => dayjs(timestamp).format("DD MMM YYYY, h:mm:ss A");

const KeyValueDisplay = ({ data }) => (
  <div className="json-cell">
    <div className="space-y-1">
      {Object.entries(data).length > 0 ? (
        Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex text-sm">
            <span className="font-semibold text-gray-700 mr-1">{key}:</span>
            <span className="text-gray-900 break-all">{String(value)}</span>
          </div>
        ))
      ) : (
        <span className="text-gray-400 italic">No changes</span>
      )}
    </div>
  </div>
);

const AuditTrailTable = ({ auditLogs }) => (
  <div className="audit-trail">
    <h2 className="audit-title">Recent Activity</h2>
    <table>
      <thead>
        <tr>
          {["Action", "Time", "Old Values", "New Values"].map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {auditLogs.length > 0 ? (
          auditLogs.map((log, idx) => (
            <tr key={idx}>
              <td>{log.action}</td>
              <td>{formatTime(log.timestamp)}</td>
              <td>
                <KeyValueDisplay data={log.oldImage} />
              </td>
              <td>
                <KeyValueDisplay data={log.newImage} />
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={4} className="text-center text-gray-400 py-10">
              No audit logs available for this project.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const AuditTrailPage = ({ projectId }) => {
  const [logs, setLogs] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE || "http://localhost:8000/api"}/history/cloudwatch/logs?asset_id=${projectId}`
        );
        const events = res.data.events || [];
        const parsed = events.map((e) => ({
          action: e.data?.eventName || "UNKNOWN",
          timestamp: e.timestamp,
          oldImage: e.data?.oldImage || {},
          newImage: e.data?.newImage || {},
        }));
        setLogs(parsed);

        // Auto-set range to first and last log, if unset
        if (parsed.length > 0 && (!fromDate || !toDate)) {
          setFromDate(dayjs(parsed[0].timestamp).format("YYYY-MM-DD"));
          setToDate(dayjs(parsed[parsed.length - 1].timestamp).format("YYYY-MM-DD"));
        }
      } catch (err) {
        console.error("Error fetching logs:", err);
      }
    };

    if (projectId) {
      fetchLogs();
    }
    // eslint-disable-next-line
  }, [projectId]);

  // Filter logs by date range
  const filteredLogs = logs.filter(log => {
    if (!fromDate && !toDate) return true;
    const logDate = dayjs(log.timestamp).format("YYYY-MM-DD");
    const afterFrom = fromDate ? logDate >= fromDate : true;
    const beforeTo = toDate ? logDate <= toDate : true;
    return afterFrom && beforeTo;
  });

  return (
    <div className="audit-trail-container">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Timeline input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16, marginBottom: 24
        }}>
          <span>Timeline:</span>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ padding: "5px", borderRadius: 6, border: "1px solid #eee" }}
          />
          <span>to</span>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ padding: "5px", borderRadius: 6, border: "1px solid #eee" }}
          />
        </div>
        <AuditTrailTable auditLogs={filteredLogs} />
      </div>
    </div>
  );
};

export default AuditTrailPage;
