import { useEffect, useState, useRef } from "react";
import { Search, Receipt, Eye, Calendar, X, Trash2, Pencil, Plus, Minus } from "lucide-react";
import toast from "react-hot-toast";
import { getSales, getSale, deleteSale, updateSale, getProducts, getCustomers } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";

export default function BillHistory() {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSale, setEditSale] = useState(null);

  useEffect(() => { loadSales(); }, [startDate, endDate]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await getSales(params);
      setSales(res.data ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const viewDetail = async (saleId) => {
    setDetailLoading(true);
    try {
      const res = await getSale(saleId);
      setDetail(res.data);
      setDetailOpen(true);
    } catch { /* silent */ } finally { setDetailLoading(false); }
  };

  const handleDelete = async (saleId) => {
    if (!confirm(`Delete invoice #${saleId}? Stock will be restored.`)) return;
    try {
      await deleteSale(saleId);
      toast.success(`Invoice #${saleId} deleted. Stock restored.`);
      loadSales();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete invoice");
    }
  };

  const openEdit = async (saleId) => {
    try {
      const res = await getSale(saleId);
      setEditSale(res.data);
      setEditOpen(true);
    } catch (err) {
      toast.error("Failed to load invoice");
    }
  };

  const filtered = sales.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(s.sale_id).includes(q) ||
      (s.customer?.name ?? "").toLowerCase().includes(q) ||
      (s.payment_method ?? "").toLowerCase().includes(q)
    );
  });

  const statusColor = (status) => {
    if (status === "paid") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (status === "pending") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt size={22}/> Bill History</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">View, edit, and search past invoices.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by invoice #, customer, payment..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <input type="date" className="input !w-auto" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" className="input !w-auto" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(""); setEndDate(""); }} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400">Total Bills</p>
          <p className="text-xl font-bold">{filtered.length}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400">Total Revenue</p>
          <p className="text-xl font-bold text-primary-600">₹{filtered.reduce((s, x) => s + (x.grand_total ?? 0), 0).toFixed(2)}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400">Paid</p>
          <p className="text-xl font-bold text-green-600">{filtered.filter((s) => s.payment_status === "paid").length}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{filtered.filter((s) => s.payment_status === "pending").length}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 font-medium">Invoice #</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No bills found</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.sale_id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium">#{s.sale_id}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(s.sale_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-4 py-3">{s.customer?.name || "Walk-in"}</td>
                  <td className="px-4 py-3 text-gray-500">{(s.items ?? []).length}</td>
                  <td className="px-4 py-3 font-medium">₹{(s.grand_total ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 capitalize">{s.payment_method}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(s.payment_status)}`}>{s.payment_status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => viewDetail(s.sale_id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="View details"><Eye size={15} /></button>
                      {isAdmin && (
                        <>
                          <button onClick={() => openEdit(s.sale_id)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500" title="Edit invoice"><Pencil size={15} /></button>
                          <button onClick={() => handleDelete(s.sale_id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500" title="Delete invoice"><Trash2 size={15} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={`Invoice #${detail?.sale_id ?? ""}`} size="md">
        {detailLoading ? (
          <p className="text-center text-gray-400 py-8">Loading...</p>
        ) : detail ? (
          <BillDetail sale={detail} />
        ) : null}
      </Modal>

      {editOpen && editSale && (
        <EditBillModal
          sale={editSale}
          onClose={() => { setEditOpen(false); setEditSale(null); }}
          onSaved={() => { setEditOpen(false); setEditSale(null); loadSales(); }}
        />
      )}
    </div>
  );
}

function BillDetail({ sale }) {
  return (
    <div className="text-sm space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500">Date</p>
          <p className="font-medium">{new Date(sale.sale_date).toLocaleString("en-IN")}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Payment</p>
          <p className="font-medium capitalize">{sale.payment_method}</p>
        </div>
      </div>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500">Customer</p>
          <p className="font-medium">{sale.customer?.name || "Walk-in"}</p>
          {sale.customer?.phone && <p className="text-xs text-gray-400">{sale.customer.phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-gray-500">Status</p>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${sale.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{sale.payment_status}</span>
        </div>
      </div>
      <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
        <p className="text-gray-500 mb-2">Items</p>
        <div className="space-y-2">
          {(sale.items ?? []).map((it) => (
            <div key={it.sale_item_id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2">
              <div>
                <p className="font-medium">{it.product?.name || `Product #${it.product_id}`}</p>
                <p className="text-xs text-gray-400">₹{(it.unit_price ?? 0).toFixed(2)} × {it.quantity}</p>
              </div>
              <p className="font-medium">₹{(it.total_price ?? 0).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{(sale.subtotal ?? 0).toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-₹{(sale.discount ?? 0).toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">GST</span><span>₹{(sale.gst_amount ?? 0).toFixed(2)}</span></div>
        <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100 dark:border-gray-700">
          <span>Grand Total</span><span className="text-primary-600">₹{(sale.grand_total ?? 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function EditBillModal({ sale, onClose, onSaved }) {
  const [items, setItems] = useState(
    (sale.items ?? []).map((it) => ({
      product_id: it.product_id,
      name: it.product?.name || `Product #${it.product_id}`,
      quantity: it.quantity,
      unit_price: it.unit_price,
    }))
  );
  const [discount, setDiscount] = useState(sale.discount ?? 0);
  const [gstPercent, setGstPercent] = useState(
    sale.subtotal > 0 ? Math.round((sale.gst_amount / (sale.subtotal - (sale.discount ?? 0))) * 100) : 5
  );
  const [paymentMethod, setPaymentMethod] = useState(sale.payment_method);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(sale.customer_id);
  const searchTimer = useRef(null);

  useEffect(() => {
    getCustomers().then((r) => setCustomers(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showProductPicker) return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await getProducts(productSearch ? { search: productSearch } : {});
        setProductResults(res.data ?? []);
      } catch { /* silent */ }
    }, 250);
    return () => clearTimeout(searchTimer.current);
  }, [productSearch, showProductPicker]);

  const addItem = (product) => {
    if ((product.stock_quantity ?? 0) <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    setItems((prev) => {
      const existing = prev.find((c) => c.product_id === product.product_id);
      if (existing) {
        return prev.map((c) => c.product_id === product.product_id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        product_id: product.product_id,
        name: product.name,
        quantity: 1,
        unit_price: product.selling_price ?? product.mrp ?? 0,
      }];
    });
    setShowProductPicker(false);
    setProductSearch("");
  };

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const subtotal = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
  const disc = Math.min(discount, subtotal);
  const taxable = subtotal - disc;
  const gstAmt = round(taxable * (gstPercent / 100));
  const grandTotal = round(taxable + gstAmt);

  function round(v) { return Math.round(v * 100) / 100; }

  const handleSave = async () => {
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    setSaving(true);
    try {
      await updateSale(sale.sale_id, {
        customer_id: customerId || null,
        discount: disc,
        payment_method: paymentMethod,
        gst_percent: gstPercent,
        items: items.map((it) => ({ product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price })),
      });
      toast.success(`Invoice #${sale.sale_id} updated`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update invoice");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold">Edit Invoice #{sale.sale_id}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
              <select className="input text-sm" value={customerId ?? ""} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Walk-in</option>
                {customers.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
              <select className="input text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="razorpay">Razorpay</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">Items ({items.length})</label>
              <button onClick={() => setShowProductPicker(!showProductPicker)} className="text-xs text-primary-600 hover:underline flex items-center gap-1"><Plus size={12} /> Add item</button>
            </div>
            {showProductPicker && (
              <div className="mb-3 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <input
                  className="input rounded-none border-0 border-b dark:border-gray-600 text-sm"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  autoFocus
                />
                <div className="max-h-40 overflow-y-auto bg-white dark:bg-gray-700">
                  {productResults.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400">No products found</p>
                  ) : (
                    productResults.slice(0, 8).map((p) => (
                      <button
                        key={p.product_id}
                        onClick={() => addItem(p)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm flex justify-between"
                      >
                        <span>{p.name}</span>
                        <span className="text-gray-400">₹{(p.selling_price ?? 0).toFixed(2)} | Stock: {p.stock_quantity ?? 0}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            {items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No items added yet</p>
            ) : (
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{it.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateItem(idx, "quantity", Math.max(0.1, +(it.quantity - 0.1).toFixed(1)))} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Minus size={12} /></button>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="input !w-16 text-center text-xs py-1"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, "quantity", Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                      />
                      <button onClick={() => updateItem(idx, "quantity", +(it.quantity + 0.1).toFixed(1))} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Plus size={12} /></button>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input !w-20 text-center text-xs py-1"
                      value={it.unit_price}
                      onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-xs font-medium w-20 text-right">₹{(it.unit_price * it.quantity).toFixed(2)}</span>
                    <button onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Discount (₹)</label>
              <input type="number" step="0.01" min="0" className="input text-sm" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">GST (%)</label>
              <input type="number" step="0.1" min="0" max="100" className="input text-sm" value={gstPercent} onChange={(e) => setGstPercent(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-₹{disc.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">GST ({gstPercent}%)</span><span>₹{gstAmt.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>Grand Total</span><span className="text-primary-600">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving || items.length === 0} className="btn-primary text-sm">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
