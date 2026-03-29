import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

// ── Lazy-loaded route components ─────────────────────────────────────────────

const Landing   = lazy(() => import("./components/Landing"));
const Login     = lazy(() => import("./components/Login"));
const Register  = lazy(() => import("./components/Register"));
const Dashboard = lazy(() => import("./components/Dashboard"));

// ── Route-level suspense fallback ─────────────────────────────────────────────
const PageLoader = () => (
  <div
    role="status"
    aria-label="Loading page"
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0b1120",
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        border: "3px solid rgba(0,212,200,0.15)",
        borderTop: "3px solid #00d4c8",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  </div>
);

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => (
  <Router>
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>

    <AuthProvider>
      <ErrorBoundary>
        <main id="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"          element={<Landing />} />
              <Route path="/login"     element={<Login />} />
              <Route path="/register"  element={<Register />} />

              {/* Unified dashboard — all post-login content */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Legacy redirects — keep old bookmarked URLs working */}
              <Route path="/admin-dashboard"  element={<Navigate to="/dashboard" replace />} />
              <Route path="/user-dashboard"   element={<Navigate to="/dashboard" replace />} />
              <Route path="/profile"          element={<Navigate to="/dashboard" replace />} />
              <Route path="/user/projects"    element={<Navigate to="/dashboard" replace />} />
              <Route path="/projects"         element={<Navigate to="/dashboard" replace />} />
              <Route path="/admin/project-access" element={<Navigate to="/dashboard" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </main>
      </ErrorBoundary>
    </AuthProvider>
  </Router>
);

export default App;
