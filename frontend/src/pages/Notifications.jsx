/**
 * pages/Notifications.jsx
 * --------------------------
 * MODULE 19 - full notification history (the Navbar bell shows a preview
 * of this same data).
 */
import { useEffect, useState } from "react";
import { Bell, Check, AlertTriangle, ShoppingBag, FileText, Calendar, Info } from "lucide-react";
import toast from "react-hot-toast";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../api/endpoints";
import Loader from "../components/Loader";

const ICONS = {
  low_stock: AlertTriangle,
  purchase_success: ShoppingBag,
  order_success: ShoppingBag,
  invoice_uploaded: FileText,
  expiry_alert: Calendar,
  system: Info,
};

const COLORS = {
  low_stock: "text-red-500 bg-red-50 dark:bg-red-900/30",
  purchase_success: "text-green-500 bg-green-50 dark:bg-green-900/30",
  order_success: "text-primary-500 bg-primary-50 dark:bg-primary-900/30",
  invoice_uploaded: "text-amber-500 bg-amber-50 dark:bg-amber-900/30",
  expiry_alert: "text-orange-500 bg-orange-50 dark:bg-orange-900/30",
  system: "text-gray-500 bg-gray-100 dark:bg-gray-700",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getNotifications(false);
      setNotifications(res.data ?? []);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      load();
    } catch { /* silent */ }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      load();
      toast.success("All marked as read");
    } catch { /* silent */ }
  };

  if (loading) return <Loader fullPage label="Loading notifications..." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell size={20} /> Notifications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Low stock alerts, purchase confirmations, orders, and invoice scans.
          </p>
        </div>
        <button onClick={handleMarkAll} className="btn-secondary">
          <Check size={16} /> Mark all read
        </button>
      </div>

      <div className="card divide-y divide-gray-100 dark:divide-gray-700 p-0">
        {notifications.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No notifications yet.</p>
        ) : (
          notifications.map((n) => {
            const Icon = ICONS[n.type] || Info;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-4 ${!n.is_read ? "bg-primary-50/40 dark:bg-primary-900/10" : ""}`}
              >
                <div className={`p-2 rounded-lg ${COLORS[n.type] || COLORS.system}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs text-primary-600 hover:underline whitespace-nowrap"
                  >
                    Mark read
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
