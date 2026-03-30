import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import "./AuditTrailGraphs.css";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const EXCLUDED_KEYS = ["pk", "asset_id", "client_id", "timestamp", "Rectifier_1_ON", "Rectifier_2_ON"];

function extractVariables(auditLogs) {
  const vars = new Set();
  auditLogs.forEach(log => {
    Object.keys(log.newImage || {}).forEach(k => { if (!EXCLUDED_KEYS.includes(k)) vars.add(k); });
  });
  return Array.from(vars);
}

function buildTimeSeries(auditLogs, variable) {
  return auditLogs
    .map(log => ({ timestamp: log.timestamp, newValue: log.newImage?.[variable] }))
    .filter(item => item.newValue !== undefined)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

const formatTime = (timestamp) => dayjs(timestamp).format("DD MMM, h:mm A");

const AuditTrailGraphs = ({ projectId }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [initializedDateRange, setInitializedDateRange] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE || "http://localhost:8000/api"}/history/cloudwatch/logs?asset_id=${projectId}`
        );
        const events = res.data.events || [];
        const parsed = events.map(e => ({ timestamp: e.timestamp, newImage: e.data?.newImage || {} }));
        setAuditLogs(parsed);
        setVariables(extractVariables(parsed));
        if (parsed.length > 0 && !initializedDateRange) {
          const sorted = parsed.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          setFromDate(dayjs(sorted[0].timestamp).format("YYYY-MM-DD"));
          setToDate(dayjs(sorted[sorted.length - 1].timestamp).format("YYYY-MM-DD"));
          setInitializedDateRange(true);
        }
      } catch { setAuditLogs([]); setVariables([]); }
      finally { setLoading(false); }
    };
    if (projectId) fetchLogs();
    // eslint-disable-next-line
  }, [projectId, initializedDateRange]);

  useEffect(() => {
    setInitializedDateRange(false);
    setFromDate("");
    setToDate("");
  }, [projectId]);

  const filteredLogs = auditLogs.filter(log => {
    const date = dayjs(log.timestamp);
    const afterFrom = fromDate ? date.isSameOrAfter(dayjs(fromDate), "day") : true;
    const beforeTo = toDate ? date.isSameOrBefore(dayjs(toDate), "day") : true;
    return afterFrom && beforeTo;
  });

  if (loading) return <div className="atg-empty">Loading graphs...</div>;
  if (!auditLogs.length || !variables.length)
    return <div className="atg-empty">No audit trail data for this project.</div>;

  return (
    <div className="atg-root">
      <h2 className="atg-heading">Audit Trail Change History</h2>

      <div className="atg-date-row">
        <label>From:{" "}
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </label>
        <label>To:{" "}
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </label>
      </div>

      <div className="atg-charts-col">
        {variables.map(variable => {
          const data = buildTimeSeries(filteredLogs, variable);
          if (!data.length) return null;
          return (
            <div key={variable} className="atg-chart-card">
              <h3>{variable}</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data} margin={{ top: 10, right: 24, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tickFormatter={formatTime} minTickGap={40} />
                  <YAxis allowDecimals />
                  <Tooltip labelFormatter={formatTime} />
                  <Line type="monotone" dataKey="newValue" name="New Value"
                    stroke="#82ca9d" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditTrailGraphs;
