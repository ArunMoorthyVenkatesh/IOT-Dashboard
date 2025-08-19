import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8888/api";

const UserRoleAssignment = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users`); // Adjust if you use a different route
      setUsers(res.data);
    } catch (err) {
      alert("Failed to fetch users");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`${API_BASE}/admin/roles/assign/${userId}`, { role: newRole });
      alert("Role updated successfully");
      fetchUsers();
    } catch (err) {
      alert("Failed to update role");
    }
  };

  return (
    <div>
      <h2>User Role Assignment</h2>
      {users.map((user) => (
        <div key={user._id} style={{ marginBottom: "1rem" }}>
          <p><strong>{user.email}</strong> – Current Role: {user.role}</p>
          <select value={user.role} onChange={(e) => handleRoleChange(user._id, e.target.value)}>
            <option value="Event Viewer">Event Viewer</option>
            <option value="Event Manager">Event Manager</option>
            <option value="Dashboard User">Dashboard User</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
      ))}
    </div>
  );
};

export default UserRoleAssignment;
