/**
 * pages/NotFound.jsx
 * ---------------------
 */
import { Link } from "react-router-dom";
import { PackageSearch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-gray-50 dark:bg-gray-900">
      <PackageSearch size={64} className="text-primary-500 mb-4" />
      <h1 className="text-5xl font-bold mb-2">404</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        We couldn't find the shelf you're looking for.
      </p>
      <Link to="/shop" className="btn-primary">Go to Store</Link>
    </div>
  );
}
