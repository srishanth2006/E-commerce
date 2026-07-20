/**
 * pages/Dashboard.jsx
 * ----------------------
 * Overview screen: KPI cards, sales trend chart, category pie chart,
 * recent transactions table, and low stock alerts.
 */
import { useEffect, useState } from "react";
import {
  Package, AlertTriangle, IndianRupee, TrendingUp, Users, Receipt, Calendar, TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import toast from "react-hot-toast";

import StatCard from "../components/StatCard";
import Loader from "../components/Loader";
import StockBadge from "../components/StockBadge";
import {
  getDashboardSummary, getRecentSales, getLowStock, getSalesTrend, getCategorySales, getExpiryStatus,
} from "../api/endpoints";

const COLORS = ["#16a34a", "#f97316", "#3b82f6", "#a855f7", "#ef4444", "#eab308", "#06b6d4", "#84cc16"];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [trend, setTrend] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [expiry, setExpiry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getDashboardSummary(),
        getRecentSales(6),
        getLowStock(),
        getSalesTrend(14),
        getCategorySales(),
        getExpiryStatus(),
      ]);
      const [s, r, l, t, c, e] = results;
      if (s.status === "fulfilled") setSummary(s.value.data);
      if (r.status === "fulfilled") setRecentSales(r.value.data);
      if (l.status === "fulfilled") setLowStock(l.value.data);
      if (t.status === "fulfilled") setTrend(t.value.data);
      if (c.status === "fulfilled") setCategorySales(c.value.data);
      if (e.status === "fulfilled") setExpiry(e.value.data);
    } catch (err) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullPage label="Loading dashboard..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Welcome back! Here's what's happening in your store.</p>
      </div>

      {/* KPI Cards */}
      {summary && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard title="Total Products" value={summary.total_products ?? 0} icon={Package} color="primary" />
        <StatCard title="Low Stock Items" value={summary.low_stock_items ?? 0} icon={AlertTriangle} color="red" />
        <StatCard title="Out of Stock" value={summary.out_of_stock_items ?? 0} icon={TrendingDown} color="red" />
        <StatCard title="Today's Sales" value={`₹${(summary.todays_sales ?? 0).toFixed(2)}`} icon={IndianRupee} color="blue" />
        <StatCard title="Monthly Revenue" value={`₹${(summary.monthly_revenue ?? 0).toFixed(2)}`} icon={TrendingUp} color="purple" />
        <StatCard title="Profit This Month" value={`₹${(summary.profit_this_month ?? 0).toFixed(2)}`} icon={TrendingUp} color="primary" />
        <StatCard title="Total Customers" value={summary.total_customers ?? 0} icon={Users} color="orange" />
        <StatCard title="Total Orders" value={summary.total_orders ?? 0} icon={Receipt} color="blue" />
      </div>
      )}
      {!summary && (
        <div className="card text-center text-gray-500 py-10">Could not load summary data. Please try again later.</div>
      )}

      {/* MODULE 9: Expiry widget */}
      {expiry && (expiry.expired?.length > 0 || expiry.expiring_within_15_days?.length > 0 || expiry.expiring_within_30_days?.length > 0) && (
        <div className="card">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Calendar size={18} className="text-orange-500" /> Expiry Watch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="font-semibold text-red-600">{expiry.expired?.length ?? 0} Expired</p>
              <p className="text-xs text-gray-500 truncate">{(expiry.expired ?? []).slice(0, 3).map((p) => p.name).join(", ") || "None"}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
              <p className="font-semibold text-orange-600">{expiry.expiring_within_15_days?.length ?? 0} Expiring in 15 days</p>
              <p className="text-xs text-gray-500 truncate">{(expiry.expiring_within_15_days ?? []).slice(0, 3).map((p) => p.name).join(", ") || "None"}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <p className="font-semibold text-amber-600">{expiry.expiring_within_30_days?.length ?? 0} Expiring in 30 days</p>
              <p className="text-xs text-gray-500 truncate">{(expiry.expiring_within_30_days ?? []).slice(0, 3).map((p) => p.name).join(", ") || "None"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales trend chart */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-4">Sales Trend (Last 14 Days)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${(v ?? 0).toFixed(2)}`} />
              <Area type="monotone" dataKey="total" stroke="#16a34a" fill="url(#colorTotal)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category-wise sales pie */}
        <div className="card">
          <h2 className="font-semibold mb-4">Category-wise Sales</h2>
          {categorySales.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No sales data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categorySales} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                  {categorySales.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent transactions */}
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Receipt size={18}/> Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-gray-400 py-6">No sales yet</td></tr>
                )}
                {recentSales.map((s) => (
                  <tr key={s.sale_id}>
                    <td>#{s.sale_id}</td>
                    <td>{s.customer?.name || "Walk-in"}</td>
                    <td>₹{(s.grand_total ?? 0).toFixed(2)}</td>
                    <td className="capitalize">{s.payment_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low stock alerts */}
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-red-500"/> Low Stock Alerts</h2>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-gray-400 py-6">All stocked up 🎉</td></tr>
                )}
                {lowStock.slice(0, 6).map((p) => (
                  <tr key={p.product_id}>
                    <td>{p.name}</td>
                    <td><StockBadge stock={p.stock_quantity} reorderLevel={p.reorder_level} /></td>
                    <td>{p.reorder_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
