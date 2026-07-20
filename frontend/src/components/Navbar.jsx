/**
 * components/Navbar.jsx
 * ------------------------
 * Top bar: hamburger (mobile), breadcrumb, notification bell (Module 19,
 * with a Module 8 sound alert on low stock), dark-mode toggle, user menu/logout.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Menu, Moon, Sun, LogOut, User as UserIcon, ChevronDown, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Breadcrumb from "./Breadcrumb";
import { getNotifications, markAllNotificationsRead } from "../api/endpoints";

// Short, unobtrusive "alert" beep, generated on the fly with the Web Audio
// API - no external mp3 file needed (Module 8: sound alert on low stock).
function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Some browsers block audio until a user gesture - fail silently.
  }
}

export default function Navbar({ onMenuClick }) {
  const { user, userType, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const lastUnreadCount = useRef(0);

  const loadNotifications = useCallback(async () => {
    if (userType !== "staff") return;
    try {
      const res = await getNotifications(false);
      setNotifications(res.data ?? []);
      const unread = res.data.filter((n) => !n.is_read);
      // Module 8: play a sound only when a NEW low-stock alert appears
      // (not on every poll), so it doesn't nag repeatedly.
      const hasNewLowStock = unread.some((n) => n.type === "low_stock");
      if (unread.length > lastUnreadCount.current && hasNewLowStock) {
        playAlertBeep();
      }
      lastUnreadCount.current = unread.length;
    } catch {
      // Notifications are a nice-to-have; a failed poll shouldn't break the UI.
    }
  }, [userType]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleOpenNotifications = async () => {
    setNotifOpen((v) => !v);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      loadNotifications();
    } catch { /* silent */ }
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="lg:hidden text-gray-500 dark:text-gray-300"
          onClick={onMenuClick}
        >
          <Menu size={22} />
        </button>
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-2">
        {userType === "staff" && (
          <div className="relative">
            <button
              onClick={handleOpenNotifications}
              className="relative p-2 rounded-lg text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-primary-600 hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-2.5 border-b border-gray-50 dark:border-gray-700/60 text-sm ${
                        !n.is_read ? "bg-primary-50/50 dark:bg-primary-900/10" : ""
                      }`}
                    >
                      <p className="font-medium">{n.title}</p>
                      {n.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>}
                    </div>
                  ))
                )}
                <Link
                  to="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="block text-center text-xs text-primary-600 py-2 hover:underline"
                >
                  View all
                </Link>
              </div>
            )}
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Toggle dark mode"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-semibold">
              {(user?.username || user?.name)?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="hidden sm:block text-sm font-medium">{user?.username || user?.name}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1">
              <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1">
                  <UserIcon size={12}/>
                  {user?.role === "admin" ? "Owner" : user?.role === "cashier" ? "Staff" : user?.role || "customer"}
                </div>
                <p className="truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
