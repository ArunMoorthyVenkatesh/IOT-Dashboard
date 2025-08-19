import React, { useEffect, useState } from "react";
import {
  FiMenu, FiUsers, FiUserCheck,
  FiClipboard, FiLogOut
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Header from "./Header222";
import axios from "axios";
import "./AdminDashboard.css";
import AdminProfileSection from './AdminProfileSection';
import PendingUserApproval from './PendingUserApproval';
import PendingAdminApproval from './PendingAdminApproval';
import AllProjects from './AllProjects';
import ProjectAccessPage from './ProjectAccessPage';
import hydroleapLogo from "../assets/hydroleap-logo.png";
import AdminListSection from './AdminListSection';
import UserListSection from './UserListSection';
import CompanyProjectAccessPage from './CompanyProjectAccessPage'; // <--- NEW IMPORT

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";
const ACCENT = "#21c6bc";

export default function AdminDashboard() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [active, setActive] = useState("profile");
  const [, setUsers] = useState([]);
  const [, setLoadingUsers] = useState(false);
  const [, setErrorUsers] = useState("");
  const [peopleDirectoryView, setPeopleDirectoryView] = useState("users");
  const [approvalView, setApprovalView] = useState("users");
  const [companyName, setCompanyName] = useState("");
  const navigate = useNavigate();

  // Splash effect
  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        // Try localStorage first for profile/company name
        let profile = localStorage.getItem("profile");
        let company = "";
        if (profile) {
          profile = JSON.parse(profile);
          company = profile.company || profile.company_name || profile.companyName || "";
        } else {
          const token = localStorage.getItem("adminToken");
          if (!token) return;
          const res = await axios.get(`${API_BASE}/admin/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          company = res.data.company || res.data.company_name || res.data.companyName || "";
          localStorage.setItem("profile", JSON.stringify(res.data));
        }
        setCompanyName(company.trim());
      } catch (e) {
        setCompanyName(""); // fallback
      }
    }
    fetchProfile();
  }, []);

  // Fetch users when section active
  useEffect(() => {
    if (active === "users") fetchUsers();
    // eslint-disable-next-line
  }, [active]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setErrorUsers("");
    try {
      const res = await axios.get(`${API_BASE}/admin/list-users`);
      setUsers(res.data);
    } catch {
      setUsers([]);
      setErrorUsers("Failed to fetch user list.");
    }
    setLoadingUsers(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminCompany");
    localStorage.removeItem("profile");
    alert("Logged out successfully.");
    navigate("/login");
  };

  // --------- SIDEBAR ITEMS ---------
  const BASE_SIDEBAR_ITEMS = [
    { key: "profile", icon: <FiUsers />, label: "Admin Profile" },
    { key: "approval-pending", icon: <FiUserCheck />, label: "Approvals" },
    { key: "projects", icon: <FiClipboard />, label: "Projects" },
    { key: "project-access", icon: <FiClipboard />, label: "Project Assignment Console" },
    { key: "people-directory", icon: <FiUsers />, label: "People Directory" },
  ];

  const SIDEBAR_ITEMS =
    companyName && companyName.toLowerCase() === "hydroleap"
      ? [
          ...BASE_SIDEBAR_ITEMS,
          { key: "company-access", icon: <FiClipboard />, label: "Company Assignment Console" }
        ]
      : BASE_SIDEBAR_ITEMS;

  // --------- SECTION RENDER ---------
  const renderSection = () => {
    switch (active) {
      case "profile":
        return (
          <SectionBlock>
            <AdminProfileSection />
          </SectionBlock>
        );
      case "approval-pending":
        return (
          <SectionBlock
            title="Approval Pending"
            toggle={
              <>
                <div style={{
                  width: "100%",
                  textAlign: "center",
                  marginBottom: 18,
                  fontSize: 18,
                  fontWeight: 500,
                  color: "#188a84",
                  letterSpacing: 0.2,
                }}>
                  {approvalView === "users"
                    ? "Review and approve/reject pending user signups."
                    : "Review and approve/reject pending admin signups."}
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button
                    onClick={() => setApprovalView("users")}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 8,
                      border: "none",
                      fontWeight: 700,
                      background: approvalView === "users" ? "#23c1b5" : "#dff6f6",
                      color: approvalView === "users" ? "#fff" : "#23c1b5",
                      transition: "background 0.16s"
                    }}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setApprovalView("admins")}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 8,
                      border: "none",
                      fontWeight: 700,
                      background: approvalView === "admins" ? "#23c1b5" : "#dff6f6",
                      color: approvalView === "admins" ? "#fff" : "#23c1b5",
                      transition: "background 0.16s"
                    }}
                  >
                    Admins
                  </button>
                </div>
              </>
            }
          >
            {approvalView === "users" ? (
              <PendingUserApproval />
            ) : (
              <PendingAdminApproval />
            )}
          </SectionBlock>
        );
      case "projects":
        return (
          <SectionBlock >
            <AllProjects />
          </SectionBlock>
        );
      case "project-access":
        return (
          <SectionBlock>
            <ProjectAccessPage />
          </SectionBlock>
        );
      case "company-access":
        return (
          <SectionBlock title="Company Assignment Console">
            <CompanyProjectAccessPage />
          </SectionBlock>
        );
      case "people-directory":
        return (
          <SectionBlock
            title="People Directory"
            toggle={
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={() => setPeopleDirectoryView("users")}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    border: "none",
                    fontWeight: 700,
                    background: peopleDirectoryView === "users" ? "#23c1b5" : "#dff6f6",
                    color: peopleDirectoryView === "users" ? "#fff" : "#23c1b5",
                    transition: "background 0.16s"
                  }}
                >
                  User Directory
                </button>
                <button
                  onClick={() => setPeopleDirectoryView("admins")}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    border: "none",
                    fontWeight: 700,
                    background: peopleDirectoryView === "admins" ? "#23c1b5" : "#dff6f6",
                    color: peopleDirectoryView === "admins" ? "#fff" : "#23c1b5",
                    transition: "background 0.16s"
                  }}
                >
                  Admin Directory
                </button>
              </div>
            }
          >
            {peopleDirectoryView === "users" ? (
              <UserListSection />
            ) : (
              <AdminListSection />
            )}
          </SectionBlock>
        );
      default:
        return <SectionBlock title="Admin Dashboard">Welcome to the Admin Dashboard.</SectionBlock>;
    }
  };

  if (showWelcome) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Times New Roman, serif",
          background: "linear-gradient(135deg, #e6fcfa 0%, #fafdff 100%)",
        }}
      >
        <h2
          style={{
            color: ACCENT,
            fontSize: "2.7rem",
            fontWeight: 700,
            textShadow: "0 2px 18px #c5f5f1, 0 2px 5px rgba(40,180,170,0.18)",
          }}
        >
          Hi, welcome to admin dashboard.
        </h2>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", background: "#f4f8fa" }}>
      <div
        style={{
          position: "absolute",
          top: 24,
          left: sidebarOpen ? 210 : 60,
          zIndex: 10,
          transition: "left 0.2s",
        }}
      >
        <Header />
      </div>

      <aside
        className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          background: "#fff",
          boxShadow: "2px 0 16px #1dc3a711",
          minHeight: "100vh",
          width: sidebarOpen ? 200 : 54,
          transition: "width 0.2s",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 18,
            paddingBottom: sidebarOpen ? 16 : 4,
          }}
        >
          <img
            src={hydroleapLogo}
            alt="Hydroleap Logo"
            style={{
              width: sidebarOpen ? 98 : 48,
              height: sidebarOpen ? 98 : 48,
              boxShadow: "0 2px 10px #23c1b51a",
              marginBottom: sidebarOpen ? 10 : 0,
              transition: "width 0.2s, height 0.2s, margin-bottom 0.2s",
            }}
          />
        </div>

        <button
          className="sidebar-toggle"
          style={{
            background: "none",
            border: "none",
            outline: "none",
            cursor: "pointer",
            fontSize: 24,
            margin: "18px 0 18px 12px",
            color: "#23c1b5",
          }}
          onClick={() => setSidebarOpen((o) => !o)}
        >
          <FiMenu />
        </button>

        <nav style={{ flex: 1 }}>
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`sidebar-link ${active === item.key ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                background: "none",
                border: "none",
                outline: "none",
                padding: "12px 18px",
                fontSize: 16,
                color: active === item.key ? "#23c1b5" : "#376872",
                fontWeight: active === item.key ? 700 : 500,
                borderRadius: 8,
                marginBottom: 6,
                backgroundColor: active === item.key ? "#dff6f6" : "transparent",
                transition: "background 0.18s, color 0.18s",
              }}
              onClick={() => setActive(item.key)}
            >
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <button
          className="sidebar-link"
          style={{
            background: "#23c1b5",
            color: "#fff",
            fontWeight: 700,
            border: "none",
            outline: "none",
            margin: "24px 18px",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 16,
            padding: "10px 14px",
          }}
          onClick={handleLogout}
        >
          <FiLogOut />
          {sidebarOpen && "Logout"}
        </button>
      </aside>

      <main
        style={{
          marginLeft: sidebarOpen ? 200 : 54,
          transition: "margin 0.2s",
          padding: "32px 20px 16px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 6px 30px #009f8d19",
            padding: "34px 32px",
            minHeight: "720px",
          }}
        >
          {renderSection()}
        </div>
      </main>
    </div>
  );
}

// Only the title and toggle are centered. All other content is left-aligned.
function SectionBlock({ title, toggle, children }) {
  return (
    <div style={{ width: "100%" }}>
      <h2
        style={{
          fontSize: "2.2rem",
          marginBottom: "1.5rem",
          fontWeight: "700",
          color: "#23c1b5",
          textAlign: "center",
          width: "100%",
        }}
      >
        {title}
      </h2>
      {toggle && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: "100%",
          marginBottom: 24,
        }}>
          {toggle}
        </div>
      )}
      <div style={{ width: "100%" }}>
        {children}
      </div>
    </div>
  );
}
