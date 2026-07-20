/**
 * api/axios.js
 * -------------
 * Central axios instance used by the whole app.
 *  - baseURL comes from the VITE_API_BASE_URL env var
 *  - every request automatically gets the JWT token attached (if we have one)
 *  - a 401 response automatically logs the user out and redirects to /login
 */
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const wasStaff = localStorage.getItem("user_type") !== "customer";
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("user_type");
      const loginPath = wasStaff ? "/login" : "/customer/login";
      if (window.location.pathname !== "/login" && window.location.pathname !== "/customer/login") {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
