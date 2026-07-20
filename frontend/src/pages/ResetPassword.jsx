/**
 * pages/ResetPassword.jsx
 * -------------------------
 * Consumes the ?token=...&type=staff|customer link from the forgot
 * password email (or the dev-mode link shown on ForgotPassword.jsx)
 * and lets the user set a new password.
 */
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { resetPasswordRequest } from "../api/endpoints";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const accountType = params.get("type") === "staff" ? "staff" : "customer";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This link is missing its reset token. Please request a new one.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordRequest(token, password, accountType);
      setDone(true);
      toast.success("Password reset successfully!");
    } catch (err) {
      const msg = err.response?.data?.detail || "This link is invalid or has expired.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loginPath = accountType === "staff" ? "/login" : "/customer/login";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 text-white mb-3">
            <Lock size={28} />
          </div>
          <h1 className="text-xl font-bold">Set a new password</h1>
        </div>

        <div className="card space-y-4">
          {done ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="mx-auto text-green-500" size={40} />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Your password has been reset. You can now log in with your new password.
              </p>
              <Link to={loginPath} className="btn-primary w-full inline-flex justify-center">
                Go to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div>
                <label className="label">New password</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input
                  className="input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
