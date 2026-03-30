import { useEffect, useState } from "react";
import { FiTrash2, FiAlertTriangle, FiX, FiCheck } from "react-icons/fi";
import { getAllUsers, deleteUser } from "../services/api";
import "./MemberList.css";

export default function UserListSection() {
  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [searchTerm,    setSearchTerm]    = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [companyName,   setCompanyName]   = useState("");
  const [confirmId,     setConfirmId]     = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [viewerRole,    setViewerRole]    = useState("");

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("profile") || "{}");
      setCompanyName(p.company_name || "");
      setViewerRole(localStorage.getItem("role") || "");
    } catch {}
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true); setError("");
    try {
      const res = await getAllUsers();
      setUsers(res?.users || []);
    } catch (err) {
      setUsers([]);
      setError(err?.message || "Failed to fetch user list.");
    }
    setLoading(false);
  };

  const handleDelete = async (userId) => {
    setDeleting(true);
    try {
      await deleteUser(userId);
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    } catch (err) {
      setError(err?.message || "Failed to delete user.");
    }
    setDeleting(false);
    setConfirmId(null);
  };

  const filteredUsers = users.filter(u => {
    const s = searchTerm.toLowerCase();
    const c = companySearch.toLowerCase();
    const matchesSearch = (u.name && u.name.toLowerCase().includes(s)) || (u.email && u.email.toLowerCase().includes(s));
    const matchesCompany = c === "" || (u.company_name && u.company_name.toLowerCase().includes(c));
    if (companyName.toLowerCase() === "hydroleap") return matchesSearch && matchesCompany;
    return u.company_name === companyName && matchesSearch && matchesCompany;
  });

  return (
    <div className="member-list-root">
      <h2 className="member-list-heading">User List</h2>
      <input className="member-list-input" type="text" value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name or email..." />
      <input className="member-list-input" type="text" value={companySearch}
        onChange={e => setCompanySearch(e.target.value)} placeholder="Filter by company name..." />

      {loading && <p>Loading users...</p>}
      {error && <div className="member-list-error">{error}</div>}
      {!loading && !error && filteredUsers.length === 0 && (
        <p className="member-list-empty">No users found.</p>
      )}

      <div className="member-list-grid">
        {filteredUsers.map((u) => (
          <div key={u.user_id} className="member-card">
            <h3>{u.name || "—"}</h3>
            <p><b>Email:</b> {u.email || "—"}</p>
            {u.phone && <p><b>Phone:</b> {u.phone}</p>}
            {u.dob && <p><b>DOB:</b> {u.dob}</p>}
            {u.gender && <p><b>Gender:</b> {u.gender}</p>}
            {u.company_name && <p className="member-company"><b>Company:</b> {u.company_name}</p>}
            {u.created_at && (
              <p className="member-joined"><b>Joined:</b> {new Date(u.created_at).toLocaleString()}</p>
            )}

            {viewerRole === "admin" && confirmId === u.user_id ? (
              <div className="member-confirm-row">
                <FiAlertTriangle size={13} className="member-confirm-icon" />
                <span className="member-confirm-text">Remove this user?</span>
                <button
                  className="member-btn-confirm"
                  onClick={() => handleDelete(u.user_id)}
                  disabled={deleting}
                >
                  <FiCheck size={13} /> {deleting ? "…" : "Yes"}
                </button>
                <button
                  className="member-btn-cancel"
                  onClick={() => setConfirmId(null)}
                  disabled={deleting}
                >
                  <FiX size={13} />
                </button>
              </div>
            ) : (
              <button
                className="member-btn-delete"
                onClick={() => setConfirmId(u.user_id)}
              >
                <FiTrash2 size={13} /> Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
