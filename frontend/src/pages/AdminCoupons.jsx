/**
 * pages/AdminCoupons.jsx
 * -----------------------
 */
import { useEffect, useState } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Loader from "../components/Loader";
import { getCoupons, createCoupon, deleteCoupon } from "../api/endpoints";

const emptyForm = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  min_order: "",
  max_uses: "",
  expires_at: "",
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCoupons();
      setCoupons(res.data ?? []);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setForm(emptyForm); setErrors({}); setModalOpen(true); };

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = "Coupon code is required";
    if (!form.discount_value || Number(form.discount_value) <= 0) e.discount_value = "Enter a valid discount value";
    if (form.discount_type === "percentage" && Number(form.discount_value) > 100) e.discount_value = "Percentage cannot exceed 100";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order: form.min_order ? Number(form.min_order) : 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
      };
      await createCoupon(payload);
      toast.success("Coupon created");
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCoupon(deleteTarget.id || deleteTarget.coupon_id);
      toast.success("Coupon deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete coupon");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tag size={22} /> Coupons</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Create and manage discount coupons.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Coupon</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <Loader label="Loading coupons..." /> : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Discount</th>
                  <th>Min Order</th>
                  <th>Usage</th>
                  <th>Expires</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-8">No coupons yet</td></tr>
                )}
                {coupons.map((c) => (
                  <tr key={c.id || c.coupon_id}>
                    <td className="font-mono font-medium">{c.code}</td>
                    <td className="text-gray-500">{c.description || "—"}</td>
                    <td>
                      {c.discount_type === "percentage"
                        ? `${c.discount_value}%`
                        : `₹${Number(c.discount_value).toFixed(2)}`
                      }
                    </td>
                    <td>{c.min_order ? `₹${Number(c.min_order).toFixed(2)}` : "—"}</td>
                    <td>{c.used_count ?? c.times_used ?? 0}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                    <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}</td>
                    <td>
                      <div className="flex justify-end">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Coupon" size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Coupon Code *</label>
            <input className="input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. SAVE20" />
            {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Discount Type *</label>
              <select className="input" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </div>
            <div>
              <label className="label">Discount Value *</label>
              <input className="input" type="number" min="0" step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} placeholder={form.discount_type === "percentage" ? "e.g. 20" : "e.g. 100"} />
              {errors.discount_value && <p className="text-xs text-red-500 mt-1">{errors.discount_value}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Min Order (₹)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="label">Max Uses</label>
              <input className="input" type="number" min="1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Unlimited" />
            </div>
          </div>
          <div>
            <label className="label">Expires At</label>
            <input className="input" type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Creating..." : "Create Coupon"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Delete coupon "${deleteTarget?.code}"? This cannot be undone.`}
      />
    </div>
  );
}
