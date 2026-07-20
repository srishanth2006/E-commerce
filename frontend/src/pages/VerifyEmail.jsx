/**
 * pages/VerifyEmail.jsx
 * ------------------------
 * Consumes the ?token=...&type=staff|customer link sent on registration
 * and marks the account as verified.
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MailCheck, XCircle, Loader2 } from "lucide-react";
import { verifyEmailRequest } from "../api/endpoints";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const accountType = params.get("type") === "staff" ? "staff" : "customer";

  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This link is missing its verification token.");
      return;
    }
    verifyEmailRequest(token, accountType)
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.detail || "This link is invalid or has expired.");
      });
  }, [token, accountType]);

  const loginPath = accountType === "staff" ? "/login" : "/customer/login";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="card space-y-4 py-8">
          {status === "verifying" && (
            <>
              <Loader2 className="mx-auto animate-spin text-primary-600" size={40} />
              <p className="text-sm text-gray-500">Verifying your email...</p>
            </>
          )}
          {status === "success" && (
            <>
              <MailCheck className="mx-auto text-green-500" size={40} />
              <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
              <Link to={loginPath} className="btn-primary w-full inline-flex justify-center">
                Go to login
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="mx-auto text-red-500" size={40} />
              <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
              <Link to={loginPath} className="text-primary-600 text-xs hover:underline">
                &larr; Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
