/**
 * pages/Forecasting.jsx
 * -------------------------
 * MODULE 12 - AI SALES FORECASTING
 * Shows every product's average daily sales, predicted next-7-days demand,
 * and a reorder recommendation, sorted by most urgent first.
 */
import { useEffect, useState } from "react";
import { TrendingUp, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import toast from "react-hot-toast";
import { getReorderRecommendations } from "../api/endpoints";
import Loader from "../components/Loader";

export default function Forecasting() {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getReorderRecommendations(30)
      .then((res) => {
        setForecasts(res.data ?? []);
        if (res.data?.length) setSelected(res.data[0]);
      })
      .catch(() => toast.error("Failed to load forecasts"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader fullPage label="Crunching sales history..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp size={20} /> AI Sales Forecasting
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Based on a 30-day moving average with trend adjustment. Sorted by most urgent reorder first.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 card p-0 divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
          {forecasts.length === 0 ? (
            <p className="text-center text-gray-400 py-10 px-4">
              No sales history yet - forecasts will appear once you've recorded some sales.
            </p>
          ) : (
            forecasts.map((f) => (
              <button
                key={f.product_id}
                onClick={() => setSelected(f)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  selected?.product_id === f.product_id ? "bg-primary-50 dark:bg-primary-900/20" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{f.product_name}</p>
                  {f.days_until_stockout !== null && f.days_until_stockout <= 3 && (
                    <AlertCircle size={14} className="text-red-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {f.avg_daily_sales}/day avg &middot; {f.current_stock} in stock
                </p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected && (
            <>
              <div className="card">
                <h2 className="font-semibold mb-1">{selected.product_name}</h2>
                <p className={`text-sm mb-4 ${selected.days_until_stockout !== null && selected.days_until_stockout <= 3 ? "text-red-600" : "text-gray-500 dark:text-gray-400"}`}>
                  {selected.reorder_recommendation}
                </p>
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                    <p className="text-2xl font-bold">{selected.avg_daily_sales}</p>
                    <p className="text-xs text-gray-400">Avg units/day</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{selected.current_stock}</p>
                    <p className="text-xs text-gray-400">Current stock</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {selected.days_until_stockout !== null ? selected.days_until_stockout : "—"}
                    </p>
                    <p className="text-xs text-gray-400">Days until stockout</p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={selected.next_7_days}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="predicted_units" stroke="#16a34a" strokeWidth={2} name="Predicted units" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
