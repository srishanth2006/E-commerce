/**
 * components/StorefrontLayout.jsx
 * -----------------------------------
 * Shared shell for the customer-facing storefront (Module 3), separate
 * from the staff admin Layout. Simple top nav instead of a sidebar.
 */
import { Outlet, Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Heart, Package, User, LogOut, ShoppingCart, Sun, Moon, Gift } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ChatWidget from "./ChatWidget";

export default function StorefrontLayout() {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/customer/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/shop" className="flex items-center gap-2 font-bold">
            <div className="bg-amber-500 text-white rounded-lg p-1.5">
              <ShoppingBag size={18} />
            </div>
            E-commerce
          </Link>

          <nav className="flex items-center gap-1 sm:gap-4 text-sm">
            <Link to="/home" className="px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Home</Link>
            <Link to="/shop" className="px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Shop</Link>
            <Link to="/offers" className="px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Offers</Link>
            <Link to="/wishlist" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Wishlist">
              <Heart size={18} />
            </Link>
            <Link to="/cart" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Cart">
              <ShoppingCart size={18} />
            </Link>
            <Link to="/orders" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Orders">
              <Package size={18} />
            </Link>
            <Link to="/referrals" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Referrals">
              <Gift size={18} />
            </Link>
            <Link to="/profile" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Profile">
              <User size={18} />
            </Link>
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="hidden sm:inline text-gray-400">|</span>
            <span className="hidden sm:inline text-gray-500 dark:text-gray-400">Hi, {user?.name}</span>
            <button onClick={handleLogout} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" title="Logout">
              <LogOut size={18} />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <ChatWidget />
    </div>
  );
}
