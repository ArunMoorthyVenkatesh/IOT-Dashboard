// LineGraph.js
import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const LineGraph = ({ label, data }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !Array.isArray(data)) return;

    const ctx = canvasRef.current.getContext("2d");
    const chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [
          {
            label,
            data,
            borderColor: "#4bc0c0",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "#000",
            },
          },
        },
      },
    });

    return () => chartInstance.destroy();
  }, [data, label]);

  return (
    <div className="line-graph-container" style={{ width: "100%", height: "250px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default LineGraph;


