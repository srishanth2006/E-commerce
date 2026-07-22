/**
 * context/NotificationContext.jsx
 * ---------------------------------
 * WebSocket-powered real-time notification provider for staff users.
 * Connects to /ws/notifications, pushes toast popups for new alerts,
 * and provides a refresh signal for the Notifications page.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, ShoppingBag, FileText, Calendar, Info, Headphones } from "lucide-react";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const TYPE_ICONS = {
  low_stock: AlertTriangle,
  purchase_success: ShoppingBag,
  order_success: ShoppingBag,
  invoice_uploaded: FileText,
  expiry_alert: Calendar,
  system: Info,
  support_ticket: Headphones,
};

const TYPE_COLORS = {
  low_stock: "#ef4444",
  purchase_success: "#22c55e",
  order_success: "#10b981",
  invoice_uploaded: "#f59e0b",
  expiry_alert: "#f97316",
  system: "#6b7280",
  support_ticket: "#6366f1",
};

const TYPE_LABELS = {
  low_stock: "Low Stock",
  purchase_success: "Purchase",
  order_success: "Order",
  invoice_uploaded: "Invoice",
  expiry_alert: "Expiry",
  system: "System",
  support_ticket: "Support Ticket",
};

function getWsUrl() {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const wsBase = apiBase.replace(/^http/, "ws");
  return `${wsBase}/ws/notifications`;
}

export function NotificationProvider({ children }) {
  const { userType } = useAuth();
  const [connected, setConnected] = useState(false);
  const [latestNotification, setLatestNotification] = useState(null);
  const refreshListenersRef = useRef(new Set());
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const addRefreshListener = useCallback((fn) => {
    refreshListenersRef.current.add(fn);
    return () => refreshListenersRef.current.delete(fn);
  }, []);

  const notifyRefresh = useCallback(() => {
    refreshListenersRef.current.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    if (userType !== "staff") return;

    let alive = true;

    function connect() {
      if (!alive) return;

      try {
        const ws = new WebSocket(getWsUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "notification" && msg.data) {
              const n = msg.data;
              setLatestNotification(n);
              notifyRefresh();

              const NotifIcon = TYPE_ICONS[n.type] || Info;
              const color = TYPE_COLORS[n.type] || "#6b7280";
              const label = TYPE_LABELS[n.type] || "Notification";

              toast.custom(
                <div className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 max-w-sm animate-[slideIn_0.3s_ease-out]">
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <NotifIcon size={18} style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
                      {label}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 truncate">
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    )}
                  </div>
                </div>,
                { duration: 5000, position: "top-right" }
              );
            } else if (msg.type === "pong") {
              // heartbeat response
            }
          } catch {
            // ignore malformed messages
          }
        };

        ws.onclose = () => {
          setConnected(false);
          wsRef.current = null;
          if (alive) {
            reconnectTimerRef.current = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (alive) {
          reconnectTimerRef.current = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    // Heartbeat every 30s to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 30000);

    return () => {
      alive = false;
      clearInterval(pingInterval);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [userType, notifyRefresh]);

  return (
    <NotificationContext.Provider
      value={{ connected, latestNotification, addRefreshListener }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationProvider");
  return ctx;
}
