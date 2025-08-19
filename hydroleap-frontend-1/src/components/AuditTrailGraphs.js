import React, { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const EXCLUDED_KEYS = ["projectId", "project_id", "deviceId", "device_id", "timestamp","system_running","Rectifier_01","Pump_01"];

function extractVariables(auditLogs) {
  const vars = new Set();
  auditLogs.forEach(log => {
    Object.keys(log.newImage || {}).forEach(k => {
      if (!EXCLUDED_KEYS.includes(k)) vars.add(k);
    });
  });
  return Array.from(vars);
}

function buildTimeSeries(auditLogs, variable) {
  return auditLogs
    .map(log => ({
      timestamp: log.timestamp,
      newValue: log.newImage?.[variable],
    }))
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
          `http://localhost:8888/api/history/cloudwatch/logs?project_id=${projectId}`
        );
        const events = res.data.events || [];
        const parsed = events.map((e) => ({
          timestamp: e.timestamp,
          newImage: e.data?.newImage || {},
        }));
        setAuditLogs(parsed);
        setVariables(extractVariables(parsed));

        // Set default date range ONLY ONCE after first fetch
        if (parsed.length > 0 && !initializedDateRange) {
          const sorted = parsed.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          setFromDate(dayjs(sorted[0].timestamp).format("YYYY-MM-DD"));
          setToDate(dayjs(sorted[sorted.length - 1].timestamp).format("YYYY-MM-DD"));
          setInitializedDateRange(true);
        }
      } catch (err) {
        setAuditLogs([]);
        setVariables([]);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchLogs();
    // eslint-disable-next-line
  }, [projectId, initializedDateRange]);

  // Reset date range if projectId changes
  useEffect(() => {
    setInitializedDateRange(false);
    setFromDate("");
    setToDate("");
  }, [projectId]);

  // Filter logs by date
  const filteredLogs = auditLogs.filter(log => {
    const date = dayjs(log.timestamp);
    const afterFrom = fromDate ? date.isSameOrAfter(dayjs(fromDate), "day") : true;
    const beforeTo = toDate ? date.isSameOrBefore(dayjs(toDate), "day") : true;
    return afterFrom && beforeTo;
  });

  if (loading) return <div style={{ textAlign: "center", color: "#bbb", margin: 40 }}>Loading graphs...</div>;
  if (!auditLogs.length || !variables.length)
    return <div style={{ textAlign: "center", color: "#bbb", margin: 40 }}>No audit trail data for this project.</div>;

  return (
    <div style={{ padding: 24 }}>
      {/* Centered Heading */}
      <h2 style={{
        fontSize: "1.5rem",
        fontWeight: "bold",
        marginBottom: "1rem",
        textAlign: "center",
        letterSpacing: "0.03em"
      }}>
        Audit Trail Change History
      </h2>

      {/* Date pickers */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "center", justifyContent: "center" }}>
        <label>
          From:{" "}
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ marginRight: 16, padding: 4 }}
          />
        </label>
        <label>
          To:{" "}
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ padding: 4 }}
          />
        </label>
      </div>

      {/* Vertical, centered, elongated graphs */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
        alignItems: "center"
      }}>
        {variables.map(variable => {
          const data = buildTimeSeries(filteredLogs, variable);
          if (!data.length) return null;
          return (
            <div key={variable} style={{
              background: "#fff",
              borderRadius: 18,
              boxShadow: "0 3px 16px #0001",
              padding: 18,
              marginBottom: 0,
              width: "100%",
              maxWidth: 800, // ELONGATED width
              alignSelf: "center",
            }}>
              <h3 style={{ fontWeight: 600, fontSize: "1.1rem", marginBottom: 8 }}>{variable}</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data} margin={{ top: 10, right: 24, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTime}
                    minTickGap={40}
                  />
                  <YAxis allowDecimals />
                  <Tooltip labelFormatter={formatTime} />
                  {/* NO Legend! */}
                  <Line
                    type="monotone"
                    dataKey="newValue"
                    name="New Value"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    dot
                  />
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
