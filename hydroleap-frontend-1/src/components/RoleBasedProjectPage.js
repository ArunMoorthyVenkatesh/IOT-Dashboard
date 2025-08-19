import React from "react";
import AdminProjectPage from "./AdminProjectPage";
import UserProjectPage from "./UserProjectPage";

const RoleBasedProjectPage = () => {
  const isAdmin = !!localStorage.getItem("admin");
  return isAdmin ? <AdminProjectPage /> : <UserProjectPage />;
};

export default RoleBasedProjectPage;
