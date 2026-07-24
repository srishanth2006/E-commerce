/**
 * pages/StaffLogin.jsx
 * ----------------------
 * Staff login page (separate from owner login).
 */
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Users, Eye, EyeOff, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function StaffLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/billing";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const userData = await login(username, password);
      toast.success("Welcome back!");
      const destination = from || (userData.role === "admin" ? "/" : "/billing");
      navigate(destination, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || "Login failed. Please check your credentials.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-blue-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/shop" className="flex items-center gap-2 font-bold text-sm">
          <div className="bg-blue-600 text-white rounded-lg p-1.5">
            <Users size={16} />
          </div>
          E-commerce
        </Link>
        <Link to="/customer/login" className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
          Customer Login
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
              <Users size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Portal</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your staff account</p>
          </div>

          {/* Form card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="label">Username</label>
              <input
                className="input py-3 text-base"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
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

            <div className="flex items-center justify-between text-sm">
              <Link to="/staff/register" className="text-primary-600 hover:underline">
                Create staff account
              </Link>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Trouble signing in?{" "}
                <Link to="/login" className="text-primary-600 font-medium hover:underline">
                  Contact Owner
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
