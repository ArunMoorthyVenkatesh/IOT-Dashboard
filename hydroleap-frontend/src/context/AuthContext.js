/**
 * AuthContext — global authentication state
 *
 * Provides:
 *  - profile    : parsed user/admin object from localStorage
 *  - role       : "user" | "admin" | null
 *  - isAuth     : boolean
 *  - login()    : persist auth data after a successful API login
 *  - logout()   : clear all auth keys and redirect to /login
 *
 * Wrap <App> with <AuthProvider> so any component can call useAuth().
 */

import { createContext, useContext, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

// Keys we write/clear in localStorage
const AUTH_KEYS = ["token", "adminToken", "profile", "role", "userEmail", "userName", "adminCompany", "sessionId"];

function readStoredAuth() {
  try {
    const profile = JSON.parse(localStorage.getItem("profile") || "null");
    const role = localStorage.getItem("role") || null;
    return { profile, role };
  } catch {
    return { profile: null, role: null };
  }
}

export function AuthProvider({ children }) {
  const [{ profile, role }, setAuth] = useState(readStoredAuth);

  const login = useCallback(({ profile: p, token, adminToken, role: r, sessionId }) => {
    if (p)          localStorage.setItem("profile", JSON.stringify(p));
    if (token)      localStorage.setItem("token", token);
    if (adminToken) localStorage.setItem("adminToken", adminToken);
    if (r)          localStorage.setItem("role", r);
    if (sessionId)  localStorage.setItem("sessionId", sessionId);
    setAuth({ profile: p, role: r });
  }, []);

  const logout = useCallback((navigate) => {
    AUTH_KEYS.forEach(k => localStorage.removeItem(k));
    setAuth({ profile: null, role: null });
    if (navigate) navigate("/login");
  }, []);

  const isAuth = Boolean(profile);

  return (
    <AuthContext.Provider value={{ profile, role, isAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook — must be used inside <AuthProvider>.
 *
 * @example
 *   const { profile, role, logout } = useAuth();
 *   const navigate = useNavigate();
 *   <button onClick={() => logout(navigate)}>Sign out</button>
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
