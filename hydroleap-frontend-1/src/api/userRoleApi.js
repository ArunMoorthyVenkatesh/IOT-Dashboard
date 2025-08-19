import axios from "axios";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

export const assignUserRole = (userId, role) =>
  axios.put(`${API_BASE}/admin/roles/assign/${userId}`, { role });
