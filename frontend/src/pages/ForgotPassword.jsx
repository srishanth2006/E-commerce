/**
 * pages/ForgotPassword.jsx
 * --------------------------
 * Shared forgot-password page for BOTH staff and customer accounts.
 * Which one is decided by the ?type=staff|customer query param
 * (defaults to "customer"). Always shows a generic success message,
 * regardless of whether the email actually exists (prevents account
 * enumeration - see backend routers/auth.py for the same rule).
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KeyRound, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { forgotPasswordRequest } from "../api/endpoints";

export default function ForgotPassword() {
  const [params] = useSearchParams();
  const accountType = params.get("type") === "staff" ? "staff" : "customer";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await forgotPasswordRequest(email, accountType);
      setSubmitted(true);
      // dev_token is only ever present when DEV_EXPOSE_TOKENS=True on the
      // backend - a convenience for testing without a real mailbox.
      if (res.data?.dev_token) setDevToken(res.data.dev_token);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 text-white mb-3">
            <KeyRound size={28} />
          </div>
          <h1 className="text-xl font-bold">Reset your password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {accountType === "staff" ? "Staff account" : "Customer account"}
          </p>
        </div>

        <div className="card space-y-4">
          {submitted ? (
            <div className="space-y-3 text-sm">
              <p className="text-gray-600 dark:text-gray-300">
                If an account with that email exists, we've sent a password reset link to{" "}
                <strong>{email}</strong>. It expires in 30 minutes.
              </p>
              {devToken && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-3 text-xs">
                  <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">
                    Dev mode (SMTP not configured):
                  </p>
                  <Link
                    to={`/reset-password?token=${devToken}&type=${accountType}`}
                    className="text-primary-600 underline break-all"
                  >
                    Click here to reset your password
                  </Link>
                </div>
              )}
              <Link to={accountType === "staff" ? "/login" : "/customer/login"} className="text-primary-600 text-xs hover:underline">
                &larr; Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <button type="submit" disabled={loading} className="btn-primary w-full">
                <Mail size={16} />
                {loading ? "Sending..." : "Send reset link"}
              </button>
              <Link to={accountType === "staff" ? "/login" : "/customer/login"} className="block text-center text-primary-600 text-xs hover:underline">
                &larr; Back to login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
