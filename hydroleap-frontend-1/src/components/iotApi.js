import axios from "axios";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

export const fetchIoTData = async (projectId, plc) => {
  const response = await axios.get(`${API_BASE}/iot/${projectId}/${plc}`);
  return response.data;
};
