/**
 * sessionHistory — per-user login/logout history stored in localStorage.
 *
 * Entry shape:
 *   { ts, email, device, type: "login"|"logout", reason?: "manual"|"inactivity" }
 */

function historyKey(email) {
  return `hl_session_history_${(email || "").trim().toLowerCase()}`;
}

export function pushSessionEntry(email, type, reason) {
  try {
    const key  = historyKey(email);
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    // Deduplicate: skip if last entry of same type is within 10 s (React Strict Mode double-mount)
    if (prev.length > 0 && prev[0].type === type && Date.now() - prev[0].ts < 10_000) return;
    const entry = { ts: Date.now(), email, device: navigator.userAgent, type, ...(reason ? { reason } : {}) };
    localStorage.setItem(key, JSON.stringify([entry, ...prev].slice(0, 40)));
  } catch {}
}

export function readSessionHistory(email) {
  try { return JSON.parse(localStorage.getItem(historyKey(email)) || "[]"); } catch { return []; }
}
