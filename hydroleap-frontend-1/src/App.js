import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// General Components
import Landing from "./components/Landing";
import Choice from "./components/Choice";
import Login from "./components/Login";
import Register from "./components/Register";

// Admin Components
import AdminDashboard from "./components/AdminDashboard"; // SPA dashboard with all sections inside
import ProjectAccessPage from "./components/ProjectAccessPage";

// User Components
import UserDashboard from "./components/UserDashboard";
import UserProfilePage from "./components/UserProfilePage";
import UserProjectsPage from "./components/UserProjectsPage";

// Shared Components
import AllProjects from "./components/AllProjects";
import IoTDashboard2 from "./components/IoTDashboard2";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/choose" element={<Choice />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Shared */}
        <Route path="/projects" element={<AllProjects />} />
        <Route path="/iot/:projectId" element={<IoTDashboard2 />} />

        {/* Admin Auth & SPA Dashboard */}
<Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin/project-access" element={<ProjectAccessPage />} />

        {/* User Routes */}
        <Route path="/user-dashboard" element={<UserDashboard />} />
<Route path="/profile" element={<UserProfilePage />} />
        <Route path="/user/projects" element={<UserProjectsPage />} />
      </Routes>
    </Router>
  );
};

export default App;
