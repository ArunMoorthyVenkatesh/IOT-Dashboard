/**
 * Hydroleap API Service Layer
 *
 * Centralises all HTTP calls.  Every function:
 *  - Injects the correct auth token from localStorage
 *  - Throws a structured { message, status } error on failure
 *  - Never exposes raw fetch/axios internals to UI components
 *
 * DO NOT change BASE_URL or endpoint paths without updating the
 * corresponding FastAPI routes in hydroleap-backend/.
 */

const BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";

// ─── Auth helpers ───────────────────────────────────────────────────────────

function getAdminToken() {
  return localStorage.getItem("adminToken") || "";
}

function getUserToken() {
  return localStorage.getItem("token") || "";
}

/**
 * Returns the best available token.
 * Admin token wins because admins also use user-scoped endpoints.
 */
function getToken() {
  return getAdminToken() || getUserToken();
}

// ─── Core request helper ─────────────────────────────────────────────────────

/**
 * @param {string} path    - path relative to BASE_URL (e.g. "/login")
 * @param {object} options - standard fetch options
 * @returns {Promise<any>} parsed JSON response
 * @throws {{ message: string, status: number }} on non-2xx
 */
async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = getToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const apiKey = process.env.REACT_APP_API_KEY;
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw { message: "Network error — check your connection.", status: 0 };
  }

  if (res.ok) {
    // 204 No Content returns no body
    if (res.status === 204) return null;
    return res.json();
  }

  // Build a useful error message from backend detail or status text
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    message = body?.detail || body?.msg || body?.message || message;
  } catch {
    // body wasn't JSON; use status text
    message = res.statusText || message;
  }

  // 401 = token missing, expired, or invalid — clear auth and redirect to login
  if (res.status === 401) {
    ["token", "adminToken", "profile", "role", "userEmail", "userName", "adminCompany", "sessionId"]
      .forEach(k => localStorage.removeItem(k));
    window.location.href = "/login";
  }

  throw { message, status: res.status };
}

// ─── Auth & OTP ─────────────────────────────────────────────────────────────

export const sendOtp = (email) =>
  request("/otp/send", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const verifyOtp = ({ email, otp }) =>
  request("/otp/verify", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });

export const loginUser = ({ email, password, role }) =>
  request("/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });

export const requestSignup = (data) =>
  request("/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const sendResetOtp = ({ email, role }) =>
  request("/auth/forgot-password/send-otp", {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });

export const resetPassword = ({ email, role, otp, new_password, confirm_password }) =>
  request("/auth/forgot-password/reset", {
    method: "POST",
    body: JSON.stringify({ email, role, otp, new_password, confirm_password }),
  });

export const checkEmail = (email) =>
  request(`/check/check-email/${encodeURIComponent(email)}`);

// ─── User ────────────────────────────────────────────────────────────────────

export const getMyProfile = () => request("/user/me");

export const updateMyProfile = (data) =>
  request("/user/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const requestProfileUpdate = (data) =>
  request("/user/request-profile-update", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getStarredProjects = () => request("/user/starred");

export const changePassword = ({ current_password, new_password, confirm_password }) =>
  request("/user/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password, confirm_password }),
  });

export const getActiveSessions = () => request("/user/sessions/active");

export const revokeOtherSessions = () =>
  request("/user/sessions/revoke-others", { method: "POST" });

export const logoutSession = () =>
  request("/user/logout", { method: "POST" });

export const updateSessionDevice = (device) =>
  request("/user/sessions/update-device", {
    method: "POST",
    body: JSON.stringify({ device }),
  });

export const getUserNotifications = () => request("/user/notifications");

export const markUserNotificationsRead = () =>
  request("/user/notifications/mark-read", { method: "POST" });

export const toggleStarredProject = (project_id) =>
  request("/user/starred/toggle", {
    method: "POST",
    body: JSON.stringify({ project_id }),
  });

export const getAllUsers = () => request("/users");

export const deleteUser = (userId) =>
  request(`/admin/users/${userId}`, { method: "DELETE" });

export const deleteAdmin = (adminId) =>
  request(`/admin/admins/${adminId}`, { method: "DELETE" });

// ─── Admin ───────────────────────────────────────────────────────────────────

export const getAdminProfile = () => request("/admin/me");

export const changeAdminPassword = ({ current_password, new_password, confirm_password }) =>
  request("/admin/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password, confirm_password }),
  });

export const getAllAdmins = () => request("/admins");

export const getPendingUsers = () => request("/admin/pending-users");

export const getPendingAdmins = () => request("/admin/pending-admins");

export const handleUserRequest = ({ id, action }) =>
  request("/admin/handle-user-request", {
    method: "POST",
    body: JSON.stringify({ id, action }),
  });

export const handleAdminRequest = ({ id, action }) =>
  request("/admin/handle-admin-request", {
    method: "POST",
    body: JSON.stringify({ id, action }),
  });

export const requestAdminProfileUpdate = (data) =>
  request("/admin/request-profile-update", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getPendingProfileUpdates = () =>
  request("/admin/pending-profile-updates");

export const handleProfileUpdateRequest = ({ id, action }) =>
  request("/admin/handle-profile-update", {
    method: "POST",
    body: JSON.stringify({ id, action }),
  });

// ─── Projects ────────────────────────────────────────────────────────────────

export const getAllProjects = () => request("/projects");

export const getUserAccesses = (email) =>
  request(`/user-accesses?email=${encodeURIComponent(email)}`);

export const assignUserProjects = ({ email, projectIds }) =>
  request("/user-accesses/assign", {
    method: "POST",
    body: JSON.stringify({ email, projectIds }),
  });

export const removeUserProject = ({ email, projectId }) =>
  request("/user-accesses/remove", {
    method: "POST",
    body: JSON.stringify({ email, projectId }),
  });

export const getCompanyAccesses = () => request("/company-accesses");

export const assignCompanyProjects = (data) =>
  request("/company-accesses/assign", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const removeCompanyProject = (data) =>
  request("/company-accesses/remove", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getCompanies = () => request("/companies");

// ─── History & CloudWatch ────────────────────────────────────────────────────

export const getCloudWatchLogs = (assetId) =>
  request(`/history/cloudwatch/logs?asset_id=${encodeURIComponent(assetId)}`);

export const getProjectHistory = (assetId) =>
  request(`/history/${encodeURIComponent(assetId)}`);
