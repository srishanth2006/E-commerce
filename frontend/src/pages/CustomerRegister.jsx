/**
 * pages/CustomerRegister.jsx
 * ----------------------------
 * Storefront self-registration. Creates an unverified customer account
 * and sends a verification email (or prints it to the backend console
 * if SMTP isn't configured - see backend/.env DEV_EXPOSE_TOKENS).
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Eye, EyeOff, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { customerRegisterRequest } from "../api/endpoints";
import GoogleLoginButton from "../components/GoogleLoginButton";

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", address: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("Name, email, and password are required.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await customerRegisterRequest(form);
      toast.success("Account created! Check your email (or the backend console) to verify it.");
      navigate("/customer/login");
    } catch (err) {
      const msg = err.response?.data?.detail || "Registration failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 text-white mb-3">
            <ShoppingBag size={28} />
          </div>
          <h1 className="text-xl font-bold">Create your account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">E-commerce</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.name} onChange={update("name")} placeholder="Your name" autoFocus />
          </div>

          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" />
          </div>

          <div>
            <label className="label">Phone (optional)</label>
            <input className="input" value={form.phone} onChange={update("phone")} placeholder="9876543210" />
          </div>

          <div>
            <label className="label">Address (optional)</label>
            <textarea className="input" value={form.address} onChange={update("address")} placeholder="Your address" rows={2} />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder="At least 6 characters"
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
            <UserPlus size={16} />
            {loading ? "Creating account..." : "Create account"}
          </button>

          <GoogleLoginButton onSuccess={() => navigate("/shop")} text="signup_with" />

          <p className="text-xs text-center text-gray-400">
            Already have an account?{" "}
            <Link to="/customer/login" className="text-primary-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
