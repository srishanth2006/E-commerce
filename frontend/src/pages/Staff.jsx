/**
 * pages/Staff.jsx
 * ----------------
 * Admin-only page to manage staff accounts (admin / cashier).
 * View, create, edit, deactivate, and delete staff members.
 */
import { useEffect, useState } from "react";
import { Users, Plus, Edit2, Trash2, Shield, ShieldOff, X } from "lucide-react";
import toast from "react-hot-toast";
import { getStaffUsers, createStaffUser, updateStaffUser, deleteStaffUser, toggleStaffUser } from "../api/endpoints";
import Modal from "../components/Modal";

const emptyForm = { username: "", email: "", password: "", role: "cashier" };

export default function Staff() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getStaffUsers();
      setUsers(res.data ?? []);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ username: u.username, email: u.email, password: "", role: u.role });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = "Username required";
    if (!form.email.trim()) e.email = "Email required";
    if (!editing && !form.password) e.password = "Password required";
    if (form.password && form.password.length < 6) e.password = "Min 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        const payload = { username: form.username, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await updateStaffUser(editing.user_id, payload);
        toast.success("Staff updated");
      } else {
        await createStaffUser(form);
        toast.success("Staff created");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (u) => {
    try {
      await toggleStaffUser(u.user_id);
      toast.success(u.is_active ? "Deactivated" : "Activated");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Delete "${u.username}"? This cannot be undone.`)) return;
    try {
      await deleteStaffUser(u.user_id);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold dark:text-white flex items-center gap-2">
          <Users size={22} /> Staff Management
        </h1>
        <button onClick={openCreate} className="btn-primary text-sm">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-10">Loading staff...</p>
      ) : users.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No staff found.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                <th className="p-3">Username</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-medium dark:text-white">{u.username}</td>
                  <td className="p-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {u.role === "admin" ? "Owner" : "Cashier"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      u.is_active
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleToggle(u)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title={u.is_active ? "Deactivate" : "Activate"}>
                        {u.is_active ? <ShieldOff size={14} /> : <Shield size={14} />}
                      </button>
                      <button onClick={() => handleDelete(u)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Staff" : "Add Staff"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoFocus />
            {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="label">{editing ? "New Password (leave blank to keep)" : "Password"}</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "••••••••" : ""} />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="cashier">Cashier</option>
              <option value="admin">Owner (Admin)</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
