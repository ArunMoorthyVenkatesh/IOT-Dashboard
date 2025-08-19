import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";

const Logout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    const confirm = window.confirm("Are you sure you want to log out?");
    if (confirm) {
      localStorage.removeItem("token");
      navigate("/");
    }
  };

  return (
    <button className="button logout" onClick={handleLogout}>
      Sign Out
    </button>
  );
};

export default Logout;
