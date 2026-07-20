/**
 * components/Breadcrumb.jsx
 * ---------------------------
 * Auto-generates a breadcrumb trail from the current URL path.
 */
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const labels = {
  products: "Products",
  categories: "Categories",
  inventory: "Inventory",
  billing: "Billing / POS",
  customers: "Customers",
  suppliers: "Suppliers",
  reports: "Reports",
};

export default function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 min-w-0">
      <Link to="/" className="flex items-center gap-1 hover:text-primary-600">
        <Home size={14} />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5 truncate">
          <ChevronRight size={14} />
          <span className="font-medium text-gray-700 dark:text-gray-200 truncate">
            {labels[seg] || seg}
          </span>
        </span>
      ))}
    </nav>
  );
}
