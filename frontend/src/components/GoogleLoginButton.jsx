import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { customerGoogleLoginRequest } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleLoginButton({ onSuccess, text = "continue_with" }) {
  const buttonDiv = useRef(null);
  const { googleCustomerLogin } = useAuth();

  const handleCredentialResponse = async (response) => {
    try {
      const res = await customerGoogleLoginRequest(response.credential);
      const { access_token, user } = res.data;
      googleCustomerLogin(access_token, user);
      toast.success("Signed in with Google!");
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Google sign-in failed");
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonDiv.current) return;

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(buttonDiv.current, {
        theme: "outline",
        size: "large",
        width: "100%",
        text,
        shape: "rectangular",
      });
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          initializeGoogle();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white dark:bg-gray-800 px-2 text-gray-400">or</span>
        </div>
      </div>
      <div ref={buttonDiv} className="w-full flex justify-center" />
    </div>
  );
}
