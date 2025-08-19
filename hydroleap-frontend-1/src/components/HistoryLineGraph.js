import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const HistoryLineGraph = ({ data, label, color = "#8884d8" }) => {
  if (!data || data.length === 0) return <div>No data for {label}</div>;
  return (
    <div style={{ width: "100%", height: 280, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 8px 0" }}>{label} History</h3>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
  dataKey="time"
  tickFormatter={t => {
    const d = new Date(t);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      "\n" +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }}
  minTickGap={24}
/>

          <YAxis />
          <Tooltip labelFormatter={t => new Date(t).toLocaleString()} />
          <Line type="monotone" dataKey="value" stroke={color} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryLineGraph;
