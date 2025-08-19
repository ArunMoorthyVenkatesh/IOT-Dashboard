// src/components/BarGraph.js
import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

// Register required components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

const BarGraph = ({ label, value, unit, maxValue }) => {
  const data = {
    labels: [label],
    datasets: [
      {
        label: unit,
        data: [value],
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    indexAxis: "y",
    maintainAspectRatio: false,
    scales: {
      x: {
        beginAtZero: true,
        max: maxValue,
        title: {
          display: true,
          text: `${unit}`,
        },
      },
      y: {
        ticks: {
          font: {
            size: 14,
          },
        },
        title: {
          display: true,
          text: label,
        },
      },
    },
    plugins: {
      legend: { display: true },
      tooltip: { enabled: true },
    },
  };

  return (
    <div style={{ width: "100%", maxWidth: "400px", height: "160px", margin: "10px auto" }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default BarGraph;
