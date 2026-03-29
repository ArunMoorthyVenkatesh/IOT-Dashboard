const BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";

export async function sendOtp(email) {
  const res = await fetch(`${BASE_URL}/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function verifyOtp({ email, otp }) {
  const res = await fetch(`${BASE_URL}/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function requestSignup(data) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function loginUser({ email, password, role }) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function sendResetOtp({ email, role }) {
  const res = await fetch(`${BASE_URL}/auth/forgot-password/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function resetPassword({ email, role, otp, new_password, confirm_password }) {
  const res = await fetch(`${BASE_URL}/auth/forgot-password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role, otp, new_password, confirm_password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}