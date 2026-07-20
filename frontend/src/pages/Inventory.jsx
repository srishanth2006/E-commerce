/**
 * pages/Inventory.jsx
 * -----------------------
 * Stock levels overview + manual stock adjustment form + inventory history log.
 */
import { useEffect, useState } from "react";
import { Boxes, PlusCircle, History, Search } from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../components/Modal";
import Loader from "../components/Loader";
import StockBadge from "../components/StockBadge";
import { getStockLevels, adjustStock, getInventoryLogs } from "../api/endpoints";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ quantity_change: "", change_type: "restock", note: "" });
  const [saving, setSaving] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getStockLevels();
      setProducts(res.data ?? []);
    } catch { toast.error("Failed to load inventory"); }
    finally { setLoading(false); }
  };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const openAdjust = (product) => {
    setTarget(product);
    setForm({ quantity_change: "", change_type: "restock", note: "" });
    setAdjustOpen(true);
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    const qty = Number(form.quantity_change);
    if (!qty) { toast.error("Enter a non-zero quantity"); return; }
    setSaving(true);
    try {
      await adjustStock(target.product_id, {
        quantity_change: qty,
        change_type: form.change_type,
        note: form.note || null,
      });
      toast.success("Stock updated");
      setAdjustOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update stock");
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (product = null) => {
    setHistoryOpen(true);
    setLogsLoading(true);
    try {
      const res = await getInventoryLogs(product?.product_id);
      setLogs(res.data ?? []);
    } catch { toast.error("Failed to load history"); }
    finally { setLogsLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes size={22}/> Inventory</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Track stock levels and manage restocks.</p>
        </div>
        <button className="btn-secondary" onClick={() => openHistory()}><History size={16}/> View Full History</button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <Loader label="Loading inventory..." /> : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No products found</td></tr>
                )}
                {filtered.map((p) => (
                  <tr key={p.product_id}>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.stock_quantity} {p.unit}</td>
                    <td>{p.reorder_level}</td>
                    <td><StockBadge stock={p.stock_quantity} reorderLevel={p.reorder_level} /></td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openAdjust(p)} className="text-xs btn-primary !py-1.5">
                          <PlusCircle size={14}/> Update Stock
                        </button>
                        <button onClick={() => openHistory(p)} className="text-xs btn-secondary !py-1.5">
                          <History size={14}/> History
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

      {/* Adjust stock modal */}
      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title={`Update Stock — ${target?.name || ""}`} size="sm">
        <form onSubmit={handleAdjust} className="space-y-4">
          <p className="text-sm text-gray-500">
            Current stock: <span className="font-semibold">{target?.stock_quantity} {target?.unit}</span>
          </p>
          <div>
            <label className="label">Change Type</label>
            <select className="input" value={form.change_type} onChange={(e) => setForm({ ...form, change_type: e.target.value })}>
              <option value="restock">Restock (add stock)</option>
              <option value="adjustment">Adjustment (correction)</option>
            </select>
          </div>
          <div>
            <label className="label">Quantity Change *</label>
            <input
              type="number"
              className="input"
              placeholder="e.g. 50 to add, -5 to remove"
              value={form.quantity_change}
              onChange={(e) => setForm({ ...form, quantity_change: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">Use a positive number to add stock, negative to remove.</p>
          </div>
          <div>
            <label className="label">Note</label>
            <input className="input" placeholder="e.g. Received from supplier" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAdjustOpen(false)}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Update Stock"}</button>
          </div>
        </form>
      </Modal>

      {/* History modal */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Inventory History" size="lg">
        {logsLoading ? <Loader label="Loading history..." /> : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Change</th>
                  <th>Stock After</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">No history yet</td></tr>
                )}
                {(logs ?? []).map((log) => (
                  <tr key={log.log_id}>
                    <td className="whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td>{log.product?.name}</td>
                    <td className="capitalize">{log.change_type}</td>
                    <td className={(log.quantity_change ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
                      {(log.quantity_change ?? 0) >= 0 ? "+" : ""}{log.quantity_change}
                    </td>
                    <td>{log.stock_after}</td>
                    <td className="text-gray-500">{log.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
