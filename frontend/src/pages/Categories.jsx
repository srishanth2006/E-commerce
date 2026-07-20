/**
 * pages/Categories.jsx
 * -----------------------
 */
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Loader from "../components/Loader";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../api/endpoints";

const emptyForm = { name: "", description: "" };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCategories();
      setCategories(res.data ?? []);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setErrors({}); setModalOpen(true); };
  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || "" });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Category name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.category_id, form);
        toast.success("Category updated");
      } else {
        await createCategory(form);
        toast.success("Category added");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory(deleteTarget.category_id);
      toast.success("Category deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tags size={22}/> Categories</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Organize your products into categories.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/> Add Category</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <Loader label="Loading categories..." /> : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Products</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-gray-400 py-8">No categories yet</td></tr>
                )}
                {categories.map((cat) => (
                  <tr key={cat.category_id}>
                    <td className="font-medium">{cat.name}</td>
                    <td className="text-gray-500">{cat.description || "—"}</td>
                    <td>{cat.products?.length ?? "-"}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(cat)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Category" : "Add Category"} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Category Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rice" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
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
        message={`Delete category "${deleteTarget?.name}"? Products in this category will keep their data but lose their category link.`}
      />
    </div>
  );
}
