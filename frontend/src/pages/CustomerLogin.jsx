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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 text-white mb-3">
            <ShoppingBag size={28} />
          </div>
          <h1 className="text-xl font-bold">E-commerce</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Customer Account</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input
              className="input"
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
                className="input pr-10"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          <GoogleLoginButton onSuccess={() => navigate(from, { replace: true })} />

          <div className="flex items-center justify-between text-xs">
            <Link to="/forgot-password?type=customer" className="text-primary-600 hover:underline">
              Forgot password?
            </Link>
            <Link to="/customer/register" className="text-primary-600 hover:underline">
              Create an account
            </Link>
          </div>

          <p className="text-xs text-center text-gray-400">
            Store staff?{" "}
            <Link to="/staff/login" className="hover:underline">
              Sign in here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
