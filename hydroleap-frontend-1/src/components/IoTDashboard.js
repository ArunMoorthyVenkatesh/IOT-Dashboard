// src/components/IoTDashboard.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {   } from "../api/iotApi";
import "./IoTDashboard.css";

const IoTDashboard = () => {
  const { projectId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!projectId) return;
     (projectId, "PLC_02")
      .then((response) => {
        setData(response);
        setError("");
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        setError("Failed to load project data.");
        setData(null);
      });
  }, [projectId]);

  if (error) {
    return (
      <div className="dashboard">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard">
        <p className="error"></p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>{projectId} Dashboard</h1>

      {data["system running"] !== undefined && (
        <div className="status-card">
          <span>System</span>
          <div className={`status-light ${data["system running"] ? "green" : "red"}`} />
        </div>
      )}

      {data.Pump_01 !== undefined && (
        <div className="status-card">
          <span>Pump</span>
          <div className={`status-light ${data.Pump_01 ? "green" : "red"}`} />
        </div>
      )}

      {data.FIT_01 !== undefined && (
        <div className="status-card">
          <span>FIT-01</span>
          <span>{data.FIT_01} m³</span>
        </div>
      )}

      {data.LIT_01 !== undefined && (
        <div className="status-card">
          <span>LIT-01</span>
          <span>{data.LIT_01} m</span>
        </div>
      )}

      {data.Rectifier_01 !== undefined && (
        <div className="status-card">
          <span>Rectifier</span>
          <div className={`status-light ${data.Rectifier_01 ? "green" : "red"}`} />
        </div>
      )}

      {data.Rectifier_V !== undefined && (
        <div className="status-card">
          <span>Voltage</span>
          <span>{data.Rectifier_V} V</span>
        </div>
      )}

      {data.Rectifier_A !== undefined && (
        <div className="status-card">
          <span>Current</span>
          <span>{data.Rectifier_A} A</span>
        </div>
      )}
    </div>
  );
};

export default IoTDashboard;