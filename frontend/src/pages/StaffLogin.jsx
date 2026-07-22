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
      const destination = from || (userData.role === "admin" ? "/dashboard" : "/billing");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white mb-3">
            <Users size={28} />
          </div>
          <h1 className="text-xl font-bold">E-commerce</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Staff Login</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="label">Username</label>
            <input
              className="input"
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
                className="input pr-10"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            <LogIn size={16} />
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="flex items-center justify-between text-xs">
            <Link to="/forgot-password?type=staff" className="text-primary-600 hover:underline">
              Forgot password?
            </Link>
            <Link to="/staff/register" className="text-primary-600 hover:underline">
              Create staff account
            </Link>
          </div>

          <p className="text-xs text-center text-gray-400">
            Owner?{" "}
            <Link to="/login" className="hover:underline">
              Sign in here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
