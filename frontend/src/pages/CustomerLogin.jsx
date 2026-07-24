/**
 * pages/CustomerLogin.jsx
 * -------------------------
 * Storefront login for customers (separate from the staff/admin login).
 */
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ShoppingBag, Eye, EyeOff, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import GoogleLoginButton from "../components/GoogleLoginButton";

export default function CustomerLogin() {
  const { customerLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/shop";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await customerLogin(email, password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || "Login failed. Please check your credentials.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-amber-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/shop" className="flex items-center gap-2 font-bold text-sm">
          <div className="bg-amber-500 text-white rounded-lg p-1.5">
            <ShoppingBag size={16} />
          </div>
          E-commerce
        </Link>
        <Link to="/shop" className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
          Browse as Guest
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-white mb-4 shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
              <ShoppingBag size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your account</p>
          </div>

          {/* Form card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                className="input py-3 text-base"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input py-3 text-base pr-12"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <GoogleLoginButton onSuccess={() => navigate(from, { replace: true })} />

            <div className="flex items-center justify-between text-sm">
              <Link to="/customer/register" className="text-primary-600 hover:underline">
                Create account
              </Link>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 text-center space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Trouble signing in?{" "}
                <a href="https://wa.me/919999999999?text=Hi%20I%20need%20help%20with%20my%20account" target="_blank" rel="noopener noreferrer" className="text-primary-600 font-medium hover:underline">
                  Contact Owner
                </a>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <Link to="/help" className="text-primary-600 font-medium hover:underline">
                  Submit an Issue
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
