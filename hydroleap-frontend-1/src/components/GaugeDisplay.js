// src/components/GaugeDisplay.js
import React from 'react';
import ReactSpeedometer from 'react-d3-speedometer';

const GaugeDisplay = ({ label, value, maxValue, unit }) => {
  const displayValue = value === null || value === undefined ? "N/A" : `${value} ${unit || ""}`;
  const showGauge = value !== null && value !== undefined;

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>{label}</h2>
      {showGauge ? (
        <ReactSpeedometer
          maxValue={maxValue}
          value={value}
          segments={8}
          needleColor="#002d4b"
          startColor="#27db7c"
          endColor="#ef4747"
          textColor="#1a3450"
          width={290}
          height={180}
          ringWidth={23}
          valueTextFontSize="27px"
          currentValueText={displayValue}
        />
      ) : (
        <div style={styles.naText}>N/A</div>
      )}
    </div>
  );
};

const styles = {
  container: {
    background: "#fff",
    borderRadius: "18px",
    boxShadow: "0 4px 18px #abd0ff1b",
    padding: "1.1rem 1.1rem 0.5rem 1.1rem",
    minWidth: 260,
    minHeight: 210,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: "0.8rem",
    justifyContent: "center",
  },
  heading: {
    fontSize: "1.07rem",
    fontWeight: 700,
    marginBottom: "0.4rem",
    color: "#1466b3",
    textAlign: "center"
  },
  naText: {
    fontSize: "2.3rem",
    fontWeight: 700,
    color: "#ccc",
    marginTop: "3.5rem",
    marginBottom: "2.3rem"
  },
};

export default GaugeDisplay;
