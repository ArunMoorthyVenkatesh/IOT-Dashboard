import { useEffect, useState } from "react";
import { FiTrash2, FiAlertTriangle, FiX, FiCheck } from "react-icons/fi";
import { getAllAdmins, deleteAdmin } from "../services/api";
import "./MemberList.css";

export default function AdminListSection() {
  const [admins,       setAdmins]       = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [companyFilter,setCompanyFilter]= useState("");
  const [companyName,  setCompanyName]  = useState("");
  const [confirmId,    setConfirmId]    = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("profile") || "{}");
      setCompanyName(p.company_name || "");
    } catch {}
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true); setError("");
    try {
      const res = await getAllAdmins();
      setAdmins(res?.admins || []);
    } catch (err) {
      setAdmins([]);
      setError(err?.message || "Failed to fetch admin list.");
    }
    setLoading(false);
  };

  const handleDelete = async (adminId) => {
    setDeleting(true);
    try {
      await deleteAdmin(adminId);
      setAdmins(prev => prev.filter(a => a.admin_id !== adminId));
    } catch (err) {
      setError(err?.message || "Failed to delete admin.");
    }
    setDeleting(false);
    setConfirmId(null);
  };

  const filteredAdmins = admins.filter(a => {
    const s = search.toLowerCase();
    const c = companyFilter.toLowerCase();
    const matchesSearch = (a.name && a.name.toLowerCase().includes(s)) || (a.email && a.email.toLowerCase().includes(s));
    const matchesCompany = c === "" || (a.company_name && a.company_name.toLowerCase().includes(c));
    if (companyName.toLowerCase() === "hydroleap") return matchesSearch && matchesCompany;
    return a.company_name === companyName && matchesSearch && matchesCompany;
  });

  return (
    <div className="member-list-root">
      <h2 className="member-list-heading">Admin List</h2>
      <input className="member-list-input" type="text" value={search}
        onChange={e => setSearch(e.target.value)} placeholder="Search admins by name or email..." />
      <input className="member-list-input" type="text" value={companyFilter}
        onChange={e => setCompanyFilter(e.target.value)} placeholder="Filter by company name..." />

      {loading && <p>Loading admins...</p>}
      {error && <div className="member-list-error">{error}</div>}
      {!loading && !error && filteredAdmins.length === 0 && (
        <p className="member-list-empty">No admins found.</p>
      )}

      <div className="member-list-grid">
        {filteredAdmins.map((a) => (
          <div key={a.admin_id} className="member-card">
            <h3>{a.name || "—"}</h3>
            <p><b>Email:</b> {a.email || "—"}</p>
            {a.phone && <p><b>Phone:</b> {a.phone}</p>}
            {a.dob && <p><b>DOB:</b> {a.dob}</p>}
            {a.gender && <p><b>Gender:</b> {a.gender}</p>}
            {a.company_name && <p className="member-company"><b>Company:</b> {a.company_name}</p>}
            {a.created_at && (
              <p className="member-joined"><b>Joined:</b> {new Date(a.created_at).toLocaleString()}</p>
            )}

            {confirmId === a.admin_id ? (
              <div className="member-confirm-row">
                <FiAlertTriangle size={13} className="member-confirm-icon" />
                <span className="member-confirm-text">Remove this admin?</span>
                <button
                  className="member-btn-confirm"
                  onClick={() => handleDelete(a.admin_id)}
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
                onClick={() => setConfirmId(a.admin_id)}
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
