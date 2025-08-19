import React, { useState } from "react";
import HistoryLineGraph from "./HistoryLineGraph";

/**
 * Filter sensor data by selected time range
 * @param {Array} data - Array of { time, value }
 * @param {Date|null} startDate
 * @param {Date|null} endDate
 */
function filterByDateRange(data, startDate, endDate) {
  if (!Array.isArray(data)) return [];
  return data
    .filter(point => {
      const t = new Date(point.time);
      return (!startDate || t >= startDate) && (!endDate || t <= endDate);
    })
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

const GraphWithTimeFilter = ({ data, label, color = "#0088FE" }) => {
  // Default to last 7 days
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultEnd.getDate() - 7);

  const [start, setStart] = useState(defaultStart.toISOString().split("T")[0]);
  const [end, setEnd] = useState(defaultEnd.toISOString().split("T")[0]);

  const startDate = start ? new Date(start + "T00:00:00") : null;
  const endDate = end ? new Date(end + "T23:59:59") : null;

  const filtered = filterByDateRange(data, startDate, endDate);

  return (
    <div
      style={{
        marginBottom: 36,
        background: "#252525",
        borderRadius: 12,
        padding: 16,
        color: "#fff",
      }}
    >
      <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 500 }}>Filter:</span>
        <label>
          <span style={{ opacity: 0.8, marginRight: 5 }}>From</span>
          <input
            type="date"
            value={start}
            max={end}
            onChange={e => setStart(e.target.value)}
            style={{
              padding: "5px 7px",
              borderRadius: 7,
              border: "1px solid #eee",
              background: "#fff",
              marginRight: 10,
            }}
          />
        </label>
        <label>
          <span style={{ opacity: 0.8, marginRight: 5 }}>To</span>
          <input
            type="date"
            value={end}
            min={start}
            max={new Date().toISOString().split("T")[0]}
            onChange={e => setEnd(e.target.value)}
            style={{
              padding: "5px 7px",
              borderRadius: 7,
              border: "1px solid #eee",
              background: "#fff",
              marginRight: 8,
            }}
          />
        </label>
        <span style={{ fontSize: 13, opacity: 0.6 }}>
          ({filtered.length} points)
        </span>
      </div>

      <HistoryLineGraph data={filtered} label={label} color={color} />
    </div>
  );
};

export default GraphWithTimeFilter;
