import axios from "axios";

// ✅ Use .env value or fallback to localhost
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

export const fetchIoTData = async (projectId, deviceId) => {
  const encodedDeviceId = encodeURIComponent(deviceId);

  try {
    const response = await axios.get(
      `${API_BASE}/iot/${projectId}/${encodedDeviceId}`
    );
    return response.data;
  } catch (error) {
    console.error("❌ Failed to fetch IoT data:", error);
    throw new Error("IoT fetch failed");
  }
};
