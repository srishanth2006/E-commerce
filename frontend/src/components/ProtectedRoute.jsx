/**
 * components/ProtectedRoute.jsx
 * --------------------------------
 * Wraps routes that require a logged-in user. Redirects to /login
 * if there's no authenticated user, preserving the attempted URL.
 *
 * Module 1 RBAC support:
 *   <ProtectedRoute requiredType="staff">    -> staff-only area (admin dashboard)
 *   <ProtectedRoute requiredType="customer"> -> customer-only area (storefront account)
 *   <ProtectedRoute requiredRole="admin">    -> admin role only (e.g. user management)
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

export default function ProtectedRoute({ children, requiredType, requiredRole }) {
  const { isAuthenticated, loading, userType, role } = useAuth();
  const location = useLocation();

  if (loading) return <Loader fullPage label="Checking session..." />;

  if (!isAuthenticated) {
    const isStorefront = location.pathname.startsWith("/home") ||
      location.pathname.startsWith("/shop") ||
      location.pathname.startsWith("/cart") ||
      location.pathname.startsWith("/checkout") ||
      location.pathname.startsWith("/wishlist") ||
      location.pathname.startsWith("/orders") ||
      location.pathname.startsWith("/profile") ||
      location.pathname.startsWith("/referrals");
    const loginPath = isStorefront ? "/customer/login" : "/staff/login";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (requiredType && userType !== requiredType) {
    return <Navigate to={userType === "customer" ? "/customer/login" : "/staff/login"} state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/billing" replace />;
  }

  return children;
}
