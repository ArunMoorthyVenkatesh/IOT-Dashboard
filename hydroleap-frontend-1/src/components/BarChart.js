// src/components/BarChart.js
import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const BarChart = ({ label, value, unit, maxValue }) => {
  const data = {
    labels: [label],
    datasets: [
      {
        label: `${label} (${unit})`,
        data: [value],
        backgroundColor: "rgba(75,192,192,0.6)",
        borderColor: "rgba(75,192,192,1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        max: maxValue || undefined, // ✅ set max value if provided
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div style={{ width: "250px", margin: "1rem auto", background: "#fff", padding: "1rem", borderRadius: "12px" }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default BarChart;
