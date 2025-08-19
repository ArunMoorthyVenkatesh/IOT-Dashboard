import axios from "axios";

// ✅ Replace with your actual .env variable or fallback
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

export const fetchIoTData = async (projectId, deviceId) => {
  try {
    const token = localStorage.getItem("adminToken");

    const response = await axios.get(
      `${API_BASE}/iot/${projectId}/${deviceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("❌ Error fetching IoT data:", error);
    throw new Error("Failed to fetch IoT data.");
  }
};
