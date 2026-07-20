/**
 * pages/Reports.jsx
 * ---------------------
 * Charts: daily sales, monthly revenue, best-selling products,
 * category-wise sales, inventory status.
 */
import { useEffect, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import toast from "react-hot-toast";

import Loader from "../components/Loader";
import {
  getSalesTrend, getMonthlyRevenue, getBestSelling, getCategorySales, getStockLevels,
  getLeastSelling, getProfitLoss, downloadReport,
} from "../api/endpoints";

const COLORS = ["#16a34a", "#f97316", "#3b82f6", "#a855f7", "#ef4444", "#eab308", "#06b6d4", "#84cc16"];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [dailySales, setDailySales] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [bestSelling, setBestSelling] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [inventoryStatus, setInventoryStatus] = useState([]);
  const [leastSelling, setLeastSelling] = useState([]);
  const [profitLoss, setProfitLoss] = useState([]);
  const [exporting, setExporting] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getSalesTrend(30),
        getMonthlyRevenue(6),
        getBestSelling(8),
        getCategorySales(),
        getStockLevels(),
        getLeastSelling(8),
        getProfitLoss(30),
      ]);
      const [d, m, b, c, s, ls, pl] = results;
      if (d.status === "fulfilled") setDailySales(d.value.data ?? []);
      if (m.status === "fulfilled") setMonthlyRevenue(m.value.data ?? []);
      if (b.status === "fulfilled") setBestSelling(b.value.data ?? []);
      if (c.status === "fulfilled") setCategorySales(c.value.data ?? []);
      if (ls.status === "fulfilled") setLeastSelling(ls.value.data ?? []);
      if (pl.status === "fulfilled") setProfitLoss(pl.value.data ?? []);

      if (s.status === "fulfilled") {
        const stock = s.value.data ?? [];
        const healthy = stock.filter((p) => p.stock_quantity > p.reorder_level * 1.5).length;
        const gettingLow = stock.filter((p) => p.stock_quantity > p.reorder_level && p.stock_quantity <= p.reorder_level * 1.5).length;
        const low = stock.filter((p) => p.stock_quantity <= p.reorder_level).length;
        setInventoryStatus([
          { name: "In Stock", value: healthy },
          { name: "Getting Low", value: gettingLow },
          { name: "Low Stock", value: low },
        ]);
      }
    } catch { toast.error("Failed to load reports"); }
    finally { setLoading(false); }
  };

  if (loading) return <Loader fullPage label="Loading reports..." />;

  const handleExport = async (type, format) => {
    setExporting(`${type}-${format}`);
    try {
      await downloadReport(type, format);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 size={22}/> Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Insights into your store's sales and stock performance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["sales", "purchases", "inventory", "suppliers", "customers"].map((type) => (
            <div key={type} className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => handleExport(type, "csv")}
                disabled={exporting === `${type}-csv`}
                className="px-2.5 py-1.5 text-xs capitalize hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"
              >
                <Download size={12} /> {type} CSV
              </button>
              <button
                onClick={() => handleExport(type, "excel")}
                disabled={exporting === `${type}-excel`}
                className="px-2.5 py-1.5 text-xs border-l border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Excel
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Daily Sales (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${(v ?? 0).toFixed(2)}`} />
              <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Monthly Revenue</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${(v ?? 0).toFixed(2)}`} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Best-Selling Products</h2>
          {bestSelling.length === 0 ? <p className="text-center text-gray-400 py-16 text-sm">No sales data yet</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bestSelling} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qty_sold" fill="#a855f7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Category-wise Sales</h2>
          {categorySales.length === 0 ? <p className="text-center text-gray-400 py-16 text-sm">No sales data yet</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categorySales} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                  {categorySales.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Least-Selling Products</h2>
          {leastSelling.length === 0 ? <p className="text-center text-gray-400 py-16 text-sm">No sales data yet</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={leastSelling} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qty_sold" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Profit vs Revenue (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={profitLoss}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${(v ?? 0).toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2} dot={false} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-4">Inventory Status Overview</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={inventoryStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: ${e.value}`}>
                <Cell fill="#16a34a" />
                <Cell fill="#f97316" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
