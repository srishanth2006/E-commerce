/**
 * context/AuthContext.jsx
 * -------------------------
 * Holds the logged-in user + JWT token in React state, backed by
 * localStorage so the session survives a page refresh.
 *
 * Supports TWO kinds of sessions (Module 1: RBAC):
 *   - "staff"    -> admin / cashier, uses the dashboard/admin UI
 *   - "customer" -> storefront shopper, uses the customer-facing pages
 *
 * `role` is only meaningful for staff users ("admin" | "cashier") and is
 * used by <ProtectedRoute requiredRole="admin"> to gate admin-only pages.
 */
import { createContext, useContext, useState, useEffect } from "react";
import {
  loginRequest,
  customerLoginRequest,
  staffLogoutRequest,
  customerLogoutRequest,
} from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null); // "staff" | "customer"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedType = localStorage.getItem("user_type");
    const token = localStorage.getItem("token");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      setUserType(storedType || "staff");
    }
    setLoading(false);
  }, []);

  const persistSession = (access_token, user_type, userData) => {
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("user_type", user_type);
    setUser(userData);
    setUserType(user_type);
  };

  /** Admin / cashier login */
  const login = async (username, password) => {
    const res = await loginRequest(username, password);
    const { access_token, user_type, user: userData } = res.data;
    persistSession(access_token, user_type, userData);
    return userData;
  };

  /** Customer (storefront) login */
  const customerLogin = async (email, password) => {
    const res = await customerLoginRequest(email, password);
    const { access_token, user_type, user: userData } = res.data;
    persistSession(access_token, user_type, userData);
    return userData;
  };

  /** Customer login via Google OAuth */
  const googleCustomerLogin = (access_token, userData) => {
    persistSession(access_token, "customer", userData);
  };

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_type");
    setUser(null);
    setUserType(null);
  };

  const logout = async () => {
    try {
      // Best-effort server-side revoke (blacklists the JWT's jti).
      // We still clear local state even if this call fails (e.g. offline).
      if (userType === "customer") {
        await customerLogoutRequest();
      } else {
        await staffLogoutRequest();
      }
    } catch (err) {
      // Not fatal - the token will simply expire naturally client-side.
      console.warn("Server-side logout failed, clearing local session anyway:", err);
    } finally {
      clearSession();
    }
  };

  const role = userType === "staff" ? user?.role : "customer";

  return (
    <AuthContext.Provider
      value={{
        user,
        userType,
        role,
        login,
        customerLogin,
        googleCustomerLogin,
        logout,
        loading,
        isAuthenticated: !!user,
        isAdmin: userType === "staff" && user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
