/**
 * pages/Customers.jsx
 * -----------------------
 */
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Users, Star } from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Loader from "../components/Loader";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "../api/endpoints";

const emptyForm = { name: "", phone: "", email: "", address: "", loyalty_points: 0 };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => load(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCustomers(search);
      setCustomers(res.data ?? []);
    } catch { toast.error("Failed to load customers"); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setErrors({}); setModalOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "", loyalty_points: c.loyalty_points });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, loyalty_points: Number(form.loyalty_points) || 0 };
      if (editing) {
        await updateCustomer(editing.customer_id, payload);
        toast.success("Customer updated");
      } else {
        await createCustomer(payload);
        toast.success("Customer added");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await deleteCustomer(deleteTarget.customer_id);
      toast.success("Customer deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users size={22}/> Customers</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your customer relationships and loyalty points.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/> Add Customer</button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <Loader label="Loading customers..." /> : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Loyalty Points</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No customers found</td></tr>
                )}
                {customers.map((c) => (
                  <tr key={c.customer_id}>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.phone || "—"}</td>
                    <td>{c.email || "—"}</td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Star size={13} fill="currentColor" /> {c.loyalty_points}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Customer" : "Add Customer"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">Loyalty Points</label>
            <input type="number" min="0" className="input" value={form.loyalty_points} onChange={(e) => setForm({ ...form, loyalty_points: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Delete customer "${deleteTarget?.name}"? This cannot be undone.`}
      />
    </div>
  );
}
