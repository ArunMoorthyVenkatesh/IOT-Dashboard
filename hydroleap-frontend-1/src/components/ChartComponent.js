// ChartComponent.js
import React, { useRef, useEffect } from "react";
import { Chart } from "chart.js/auto";

const ChartComponent = ({ label, value, max, unit }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");

    const myChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [label],
        datasets: [
          {
            label: `${label}: ${value} ${unit}`,
            data: [value],
            backgroundColor: "skyblue",
            borderColor: "dodgerblue",
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: "y",
        scales: {
          x: {
            min: 0,
            max: max,
          },
        },
      },
    });

    return () => {
      myChart.destroy();
    };
  }, [label, value, max, unit]);

  return <canvas ref={chartRef} style={{ marginBottom: "30px" }} />;
};

export default ChartComponent;
