/**
 * components/Sidebar.jsx
 * ------------------------
 * Responsive left navigation. Collapses to an off-canvas drawer on
 * mobile (controlled by `open` / `setOpen` from the parent Layout).
 */
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Package, Tags, Boxes, ShoppingCart,
  Users, Truck, BarChart3, X, Store, ScanLine, TrendingUp, Bell, Receipt, Tag, UserCog, Headphones, MessageSquareReply,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const allNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, adminOnly: true },
  { to: "/products", label: "Products", icon: Package },
  { to: "/categories", label: "Categories", icon: Tags, adminOnly: true },
  { to: "/inventory", label: "Inventory", icon: Boxes, adminOnly: true },
  { to: "/billing", label: "Billing / POS", icon: ShoppingCart },
  { to: "/bills", label: "Bill History", icon: Receipt },
  { to: "/purchases", label: "AI Invoice Scanner", icon: ScanLine, adminOnly: true },
  { to: "/forecast", label: "AI Forecasting", icon: TrendingUp, adminOnly: true },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/suppliers", label: "Suppliers", icon: Truck, adminOnly: true },
  { to: "/admin/orders", label: "Orders", icon: Package, adminOnly: true },
  { to: "/admin/coupons", label: "Coupons", icon: Tag, adminOnly: true },
  { to: "/admin/staff", label: "Staff", icon: UserCog, adminOnly: true },
  { to: "/admin/support", label: "Support Tickets", icon: Headphones, adminOnly: true },
  { to: "/admin/complaints", label: "Reply to Complaints", icon: MessageSquareReply },
  { to: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { to: "/notifications", label: "Notifications", icon: Bell, adminOnly: true },
];

export default function Sidebar({ open, setOpen }) {
  const { isAdmin } = useAuth();
  const navItems = isAdmin
    ? allNavItems
    : allNavItems.filter((item) => !item.adminOnly);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static z-40 top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 transform transition-transform duration-200 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 text-white rounded-lg p-1.5">
              <Store size={20} />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">E-commerce</p>
              <p className="text-xs text-gray-400 leading-tight">
                {isAdmin ? "Owner Portal" : "Staff Portal"}
              </p>
            </div>
          </div>
          <button className="lg:hidden text-gray-400" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-4rem)]" style={{ scrollbarWidth: "thin" }}>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
