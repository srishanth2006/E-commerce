/**
 * pages/Suppliers.jsx
 * -----------------------
 */
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Truck, History } from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Loader from "../components/Loader";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierPurchaseHistory } from "../api/endpoints";

const emptyForm = { supplier_name: "", contact_person: "", phone: "", email: "", address: "", gst_number: "" };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => load(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSuppliers(search);
      setSuppliers(res.data ?? []);
    } catch { toast.error("Failed to load suppliers"); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setErrors({}); setModalOpen(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      supplier_name: s.supplier_name,
      contact_person: s.contact_person || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      gst_number: s.gst_number || "",
    });
    setErrors({});
    setModalOpen(true);
  };

  const openHistory = async (s) => {
    setHistoryFor(s);
    setHistoryLoading(true);
    try {
      const res = await getSupplierPurchaseHistory(s.supplier_id);
      setHistory(res.data ?? []);
    } catch {
      toast.error("Failed to load purchase history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.supplier_name.trim()) e.supplier_name = "Supplier name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateSupplier(editing.supplier_id, form);
        toast.success("Supplier updated");
      } else {
        await createSupplier(form);
        toast.success("Supplier added");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await deleteSupplier(deleteTarget.supplier_id);
      toast.success("Supplier deleted");
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
          <h1 className="text-2xl font-bold flex items-center gap-2"><Truck size={22}/> Suppliers</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage the vendors who supply your store.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/> Add Supplier</button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <Loader label="Loading suppliers..." /> : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>GST Number</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No suppliers found</td></tr>
                )}
                {suppliers.map((s) => (
                  <tr key={s.supplier_id}>
                    <td className="font-medium">{s.supplier_name}</td>
                    <td>{s.contact_person || "—"}</td>
                    <td>{s.phone || "—"}</td>
                    <td>{s.email || "—"}</td>
                    <td>{s.gst_number || "—"}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openHistory(s)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Purchase history">
                          <History size={15} />
                        </button>
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Supplier" : "Add Supplier"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Supplier Name *</label>
            <input className="input" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
            {errors.supplier_name && <p className="text-xs text-red-500 mt-1">{errors.supplier_name}</p>}
          </div>
          <div>
            <label className="label">Contact Person</label>
            <input className="input" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">GST Number</label>
            <input className="input" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} placeholder="e.g. 29ABCDE1234F1Z5" />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
        message={`Delete supplier "${deleteTarget?.supplier_name}"? This cannot be undone.`}
      />

      {/* MODULE 4: supplier purchase history */}
      <Modal open={!!historyFor} onClose={() => setHistoryFor(null)} title={`Purchase History - ${historyFor?.supplier_name || ""}`} size="lg">
        {historyLoading ? (
          <p className="text-center text-gray-400 py-6">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-center text-gray-400 py-6">No purchase bills recorded for this supplier yet.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.map((bill) => (
              <div key={bill.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Invoice {bill.invoice_number || `#${bill.id}`}</span>
                  <span className="text-gray-400">{new Date(bill.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{bill.items?.length ?? 0} item(s) &middot; ₹{(bill.total_amount ?? 0).toFixed(2)} &middot; {bill.source}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
