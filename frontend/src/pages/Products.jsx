/**
 * pages/Products.jsx
 * ---------------------
 * MODULE 2 - full product CRUD: search, category/brand filter, barcode,
 * batch/expiry tracking, MRP/GST/discount, min/max stock, image upload.
 */
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Package, Upload, ImageOff, Barcode as BarcodeIcon, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Loader from "../components/Loader";
import StockBadge from "../components/StockBadge";
import {
  getProducts, createProduct, updateProduct, deleteProduct, getCategories,
  uploadProductImage, getBrands, createBrand, barcodeImageUrl, qrCodeImageUrl,
  toggleProductActive,
} from "../api/endpoints";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000";

const emptyForm = {
  name: "", category_id: "", brand_id: "", barcode: "", batch_number: "", expiry_date: "",
  purchase_price: "", profit_margin_percent: "15", selling_price: "", mrp: "", gst_percent: "5", discount_percent: "0",
  stock_quantity: "", reorder_level: "10", max_stock: "", unit: "pcs", preset_quantities: "",
};

const UNITS = ["pcs", "kg", "g", "litre", "ml", "packet", "box", "dozen"];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newBrand, setNewBrand] = useState("");
  const [codesFor, setCodesFor] = useState(null); // product to show barcode/QR modal for

  useEffect(() => { loadCategories(); loadBrands(); }, []);
  useEffect(() => {
    const timer = setTimeout(() => loadProducts(), 300); // debounce search
    return () => clearTimeout(timer);
  }, [search, categoryFilter]);

  const loadCategories = async () => {
    try { setCategories((await getCategories()).data ?? []); } catch { /* silent */ }
  };
  const loadBrands = async () => {
    try { setBrands((await getBrands()).data ?? []); } catch { /* brands are optional, fail quietly */ }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.category_id = categoryFilter;
      const res = await getProducts(params);
      setProducts(res.data ?? []);
    } catch { toast.error("Failed to load products"); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setImageFile(null); setErrors({}); setModalOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      category_id: p.category_id || "",
      brand_id: p.brand_id || "",
      barcode: p.barcode || "",
      batch_number: p.batch_number || "",
      expiry_date: p.expiry_date || "",
      purchase_price: p.purchase_price,
      profit_margin_percent: p.profit_margin_percent ?? 15,
      selling_price: p.selling_price,
      mrp: p.mrp || "",
      gst_percent: p.gst_percent,
      discount_percent: p.discount_percent,
      stock_quantity: p.stock_quantity,
      reorder_level: p.reorder_level,
      max_stock: p.max_stock || "",
      unit: p.unit,
      preset_quantities: p.preset_quantities || "",
    });
    setImageFile(null);
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Product name is required";
    if (form.purchase_price === "" || Number(form.purchase_price) < 0) e.purchase_price = "Enter a valid purchase price";
    if (!form.mrp || Number(form.mrp) <= 0) e.mrp = "MRP is required (selling price = MRP)";
    if (form.stock_quantity === "" || Number(form.stock_quantity) < 0) e.stock_quantity = "Enter a valid stock quantity";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddBrand = async () => {
    if (!newBrand.trim()) return;
    try {
      const res = await createBrand({ name: newBrand.trim() });
      setBrands((b) => [...b, res.data]);
      setForm((f) => ({ ...f, brand_id: res.data.brand_id }));
      setNewBrand("");
      toast.success("Brand added");
    } catch {
      toast.error("Failed to add brand");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : null,
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        barcode: form.barcode || null,
        batch_number: form.batch_number || null,
        expiry_date: form.expiry_date || null,
        purchase_price: Number(form.purchase_price),
        profit_margin_percent: Number(form.profit_margin_percent) || 15,
        mrp: form.mrp ? Number(form.mrp) : null,
        gst_percent: Number(form.gst_percent) || 0,
        discount_percent: Number(form.discount_percent) || 0,
        stock_quantity: Number(form.stock_quantity),
        reorder_level: Number(form.reorder_level),
        max_stock: form.max_stock ? Number(form.max_stock) : null,
      };

      let productId;
      if (editing) {
        await updateProduct(editing.product_id, payload);
        productId = editing.product_id;
        toast.success("Product updated");
      } else {
        const res = await createProduct(payload);
        productId = res.data.product_id;
        toast.success("Product added");
      }

      if (imageFile) {
        await uploadProductImage(productId, imageFile);
      }

      setModalOpen(false);
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct(deleteTarget.product_id);
      toast.success("Product deleted");
      setDeleteTarget(null);
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete");
    }
  };

  const expiryColor = (dateStr) => {
    if (!dateStr) return "";
    const days = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    if (days < 0) return "text-red-600 font-semibold";
    if (days <= 15) return "text-red-500";
    if (days <= 30) return "text-amber-500";
    return "text-gray-500 dark:text-gray-400";
  };

  const handleToggleActive = async (product) => {
    try {
      const res = await toggleProductActive(product.product_id);
      toast.success(`Product ${res.data.is_active ? "activated" : "deactivated"}`);
      loadProducts();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package size={22}/> Products</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your store's product catalog.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/> Add Product</button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search products by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-56" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <Loader label="Loading products..." /> : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Purchase Price</th>
                  <th>Selling Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Expiry</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-gray-400 py-8">No products found</td></tr>
                )}
                {products.map((p) => (
                  <tr key={p.product_id} className={!p.is_active ? "opacity-60" : ""}>
                    <td>
                      {p.image_url ? (
                        <img src={`${API_BASE}${p.image_url}`} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                          <ImageOff size={16} />
                        </div>
                      )}
                    </td>
                    <td className="font-medium">
                      {p.name}
                      {p.brand && <span className="block text-xs text-gray-400">{p.brand.name}</span>}
                    </td>
                    <td>{p.category?.name || "—"}</td>
                    <td>₹{(p.purchase_price ?? 0).toFixed(2)}</td>
                    <td>₹{(p.selling_price ?? 0).toFixed(2)}</td>
                    <td><StockBadge stock={p.stock_quantity} reorderLevel={p.reorder_level} /></td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(p)}
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition ${
                          p.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200"
                        }`}
                        title={p.is_active ? "Click to deactivate" : "Click to activate"}
                      >
                        {p.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {p.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className={expiryColor(p.expiry_date)}>{p.expiry_date || "—"}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        {p.barcode && (
                          <button onClick={() => setCodesFor(p)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Barcode / QR">
                            <BarcodeIcon size={15} />
                          </button>
                        )}
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "Add Product"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Product Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Basmati Rice 1kg" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Uncategorized</option>
                {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Brand</label>
              <div className="flex gap-2">
                <select className="input" value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}>
                  <option value="">No brand</option>
                  {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 mt-1.5">
                <input className="input py-1 text-xs" placeholder="New brand name" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} />
                <button type="button" onClick={handleAddBrand} className="btn-secondary text-xs px-2 py-1 whitespace-nowrap">+ Add</button>
              </div>
            </div>

            <div>
              <label className="label">Barcode</label>
              <input className="input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="e.g. 8901234567890" />
            </div>

            <div>
              <label className="label">Batch Number</label>
              <input className="input" value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} />
            </div>

            <div>
              <label className="label">Expiry Date</label>
              <input type="date" className="input" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </div>

            <div>
              <label className="label">Unit</label>
              <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Preset Quantities (optional)</label>
              <input className="input" value={form.preset_quantities} onChange={(e) => setForm({ ...form, preset_quantities: e.target.value })} placeholder="e.g. 250g,500g,1kg,2kg" />
              <p className="text-xs text-gray-400 mt-1">Comma-separated options shown to customers. Leave empty for default (1 unit).</p>
            </div>

            <div>
              <label className="label">Purchase Price (₹) *</label>
              <input type="number" step="0.01" min="0" className="input" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
              {errors.purchase_price && <p className="text-xs text-red-500 mt-1">{errors.purchase_price}</p>}
            </div>

            <div>
              <label className="label">MRP (₹) *</label>
              <input type="number" step="0.01" min="0" className="input" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} />
              {errors.mrp && <p className="text-xs text-red-500 mt-1">{errors.mrp}</p>}
              <p className="text-xs text-gray-400 mt-1">Selling price = MRP. This is what customers pay.</p>
            </div>

            <div>
              <label className="label">Selling Price (₹)</label>
              <div className="input bg-gray-50 dark:bg-gray-900 font-bold text-green-600">
                ₹{form.mrp ? Number(form.mrp).toFixed(2) : "Enter MRP above"}
              </div>
              <p className="text-xs text-gray-400 mt-1">Always equals MRP</p>
            </div>

            <div>
              <label className="label">Profit Margin (%)</label>
              <input type="number" step="0.01" min="0" className="input" value={form.profit_margin_percent} onChange={(e) => setForm({ ...form, profit_margin_percent: e.target.value })} />
              <p className="text-xs text-gray-400 mt-1">For reference only (used when MRP is not set)</p>
            </div>

            <div>
              <label className="label">GST %</label>
              <input type="number" step="0.01" min="0" className="input" value={form.gst_percent} onChange={(e) => setForm({ ...form, gst_percent: e.target.value })} />
            </div>

            <div>
              <label className="label">Discount %</label>
              <input type="number" step="0.01" min="0" className="input" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
            </div>

            <div>
              <label className="label">Stock Quantity *</label>
              <input type="number" min="0" className="input" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
              {errors.stock_quantity && <p className="text-xs text-red-500 mt-1">{errors.stock_quantity}</p>}
            </div>

            <div>
              <label className="label">Minimum Stock (reorder level)</label>
              <input type="number" min="0" className="input" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
            </div>

            <div>
              <label className="label">Maximum Stock</label>
              <input type="number" min="0" className="input" value={form.max_stock} onChange={(e) => setForm({ ...form, max_stock: e.target.value })} />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Product Image</label>
              <label className="flex items-center gap-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 cursor-pointer text-sm text-gray-500 hover:border-primary-500">
                <Upload size={16} />
                {imageFile ? imageFile.name : "Click to upload an image (stored as a file path)"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files[0])} />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save Product"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Delete product "${deleteTarget?.name}"? This cannot be undone.`}
      />

      {/* MODULE 15: barcode / QR code viewer */}
      <Modal open={!!codesFor} onClose={() => setCodesFor(null)} title={`Codes for ${codesFor?.name || ""}`}>
        {codesFor && (
          <div className="flex flex-col sm:flex-row gap-6 items-center justify-center py-2">
            <div className="text-center">
              <img src={barcodeImageUrl(codesFor.product_id)} alt="Barcode" className="max-w-full" onError={(e) => (e.target.style.display = "none")} />
              <p className="text-xs text-gray-400 mt-1">Barcode</p>
            </div>
            <div className="text-center">
              <img src={qrCodeImageUrl(codesFor.product_id)} alt="QR Code" className="w-32 h-32" onError={(e) => (e.target.style.display = "none")} />
              <p className="text-xs text-gray-400 mt-1">QR Code</p>
            </div>
          </div>
        )}
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-2">
          Requires python-barcode / qrcode + Pillow installed on the backend. See README.
        </p>
      </Modal>
    </div>
  );
}
