/**
 * api/endpoints.js
 * -----------------
 * Thin wrapper functions around axios calls, grouped by resource.
 * Keeping these in one place means components never hard-code a URL string.
 */
import api from "./axios";

// ---------- Auth: Staff (admin / cashier) ----------
export const loginRequest = (username, password) => {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);
  return api.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
};
export const registerRequest = (data) => api.post("/auth/register", data);
export const staffLogoutRequest = () => api.post("/auth/logout");

// ---------- Staff Management (admin only) ----------
export const getStaffUsers = () => api.get("/auth/users");
export const getStaffUser = (id) => api.get(`/auth/users/${id}`);
export const createStaffUser = (data) => api.post("/auth/register", data);
export const updateStaffUser = (id, data) => api.put(`/auth/users/${id}`, data);
export const deleteStaffUser = (id) => api.delete(`/auth/users/${id}`);
export const toggleStaffUser = (id) => api.put(`/auth/users/${id}/toggle-active`);

// ---------- Auth: Customer (storefront) ----------
export const customerLoginRequest = (email, password) =>
  api.post("/auth/customer/login", { email, password });
export const customerRegisterRequest = (data) => api.post("/auth/customer/register", data);
export const customerGoogleLoginRequest = (credential) =>
  api.post("/auth/customer/google", { credential });
export const customerLogoutRequest = () => api.post("/auth/customer/logout");

// ---------- Auth: shared (forgot/reset password, email verification) ----------
// account_type is "staff" or "customer"
export const forgotPasswordRequest = (email, accountType = "customer") =>
  api.post("/auth/forgot-password", { email, account_type: accountType });
export const resetPasswordRequest = (token, newPassword, accountType = "customer") =>
  api.post("/auth/reset-password", { token, new_password: newPassword, account_type: accountType });
export const verifyEmailRequest = (token, accountType = "customer") =>
  api.post("/auth/verify-email", { token, account_type: accountType });
export const resendVerificationRequest = (email, accountType = "customer") =>
  api.post("/auth/resend-verification", { email, account_type: accountType });
export const getMe = () => api.get("/auth/me");

// ---------- Dashboard ----------
export const getDashboardSummary = () => api.get("/dashboard/summary");
export const getRecentSales = (limit = 10) => api.get(`/dashboard/recent-sales?limit=${limit}`);
export const getLowStock = () => api.get("/dashboard/low-stock");
export const getSalesTrend = (days = 14) => api.get(`/dashboard/sales-trend?days=${days}`);
export const getMonthlyRevenue = (months = 6) => api.get(`/dashboard/monthly-revenue?months=${months}`);
export const getBestSelling = (limit = 5) => api.get(`/dashboard/best-selling?limit=${limit}`);
export const getCategorySales = () => api.get("/dashboard/category-sales");

// ---------- Categories ----------
export const getCategories = () => api.get("/categories");
export const createCategory = (data) => api.post("/categories", data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// ---------- Products ----------
export const getProducts = (params = {}) => api.get("/products", { params });
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post("/products", data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const uploadProductImage = (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`/products/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ---------- Inventory ----------
export const getStockLevels = () => api.get("/inventory");
export const getInventoryLogs = (productId) =>
  api.get("/inventory/logs", { params: productId ? { product_id: productId } : {} });
export const adjustStock = (productId, data) => api.post(`/inventory/${productId}/adjust`, data);

// ---------- Customers ----------
export const getCustomers = (search = "") => api.get("/customers", { params: search ? { search } : {} });
export const createCustomer = (data) => api.post("/customers", data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

// ---------- Suppliers ----------
export const getSuppliers = (search = "") => api.get("/suppliers", { params: search ? { search } : {} });
export const createSupplier = (data) => api.post("/suppliers", data);
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data);
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`);

// ---------- Sales / POS ----------
export const getSales = (params = {}) => api.get("/sales", { params });
export const getSale = (id) => api.get(`/sales/${id}`);
export const createSale = (data) => api.post("/sales", data);
export const updateSale = (id, data) => api.put(`/sales/${id}`, data);
export const deleteSale = (id) => api.delete(`/sales/${id}`);

// ---------- Brands (Module 2) ----------
export const getBrands = () => api.get("/brands");
export const createBrand = (data) => api.post("/brands", data);
export const deleteBrand = (id) => api.delete(`/brands/${id}`);

// ---------- Product extras (Module 2 / 15) ----------
export const uploadProductImages = (id, files) => {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  return api.post(`/products/${id}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const deleteProductImage = (imageId) => api.delete(`/products/images/${imageId}`);
export const getProductByBarcode = (barcode) => api.get(`/products/barcode/${barcode}`);
export const barcodeImageUrl = (id) => `${api.defaults.baseURL}/products/${id}/barcode-image`;
export const qrCodeImageUrl = (id) => `${api.defaults.baseURL}/products/${id}/qrcode-image`;

// ---------- Purchases / AI Invoice Scanner (Module 5 & 6) ----------
export const scanInvoice = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/purchases/scan-invoice", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const commitPurchaseBill = (data) => api.post("/purchases", data);
export const getPurchaseBills = () => api.get("/purchases");
export const getPurchaseBill = (id) => api.get(`/purchases/${id}`);
export const getSupplierPurchaseHistory = (supplierId) =>
  api.get(`/suppliers/${supplierId}/purchase-history`);

// ---------- AI Sales Forecasting (Module 12) ----------
export const getProductForecast = (productId) => api.get(`/forecast/product/${productId}`);
export const getReorderRecommendations = (limit = 20) =>
  api.get("/forecast/reorder-recommendations", { params: { limit } });

// ---------- AI Chatbot (Module 13) ----------
export const sendChatMessage = (sessionId, message, roleContext = "customer") =>
  api.post("/chatbot", { session_id: sessionId, message, role_context: roleContext });

// ---------- Search (Module 14) ----------
export const globalSearch = (q) => api.get("/search/global", { params: { q } });
export const adminSearch = (q) => api.get("/search/admin", { params: { q } });

// ---------- Payments / Razorpay (Module 16) ----------
export const getPaymentConfig = () => api.get("/payments/config");
export const createRazorpayOrder = (amount) => api.post("/payments/razorpay/create-order", { amount });
export const verifyRazorpayPayment = (data) => api.post("/payments/razorpay/verify", null, { params: data });

// ---------- Reports export (Module 17) ----------
// Report endpoints require staff auth, so a plain <a href> won't carry the
// JWT - we fetch as a blob via axios (which does attach the auth header)
// and trigger the download client-side instead.
export const downloadReport = async (type, format = "csv", params = {}) => {
  const res = await api.get(`/reports/${type}`, { params: { format, ...params }, responseType: "blob" });
  const ext = format === "excel" ? "xlsx" : "csv";
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${type}_report.${ext}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ---------- Dashboard extras (Module 9 / 11 / 18) ----------
export const getExpiryStatus = () => api.get("/dashboard/expiry-status");
export const getSalesByPeriod = (period = "daily") => api.get("/dashboard/sales-by-period", { params: { period } });
export const getLeastSelling = (limit = 5) => api.get(`/dashboard/least-selling?limit=${limit}`);
export const getProfitLoss = (days = 30) => api.get(`/dashboard/profit-loss?days=${days}`);
export const getInventoryStatus = () => api.get("/dashboard/inventory-status");

// ---------- Notifications (Module 19) ----------
export const getNotifications = (unreadOnly = false) =>
  api.get("/notifications", { params: { unread_only: unreadOnly } });
export const markNotificationRead = (id) => api.post(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.post("/notifications/read-all");

// ---------- Storefront (Module 3, customer-only) ----------
export const getMyProfile = () => api.get("/storefront/profile");
export const updateMyProfile = (data) => api.put("/storefront/profile", data);
export const getMyAddresses = () => api.get("/storefront/addresses");
export const addMyAddress = (data) => api.post("/storefront/addresses", data);
export const deleteMyAddress = (id) => api.delete(`/storefront/addresses/${id}`);
export const getMyWishlist = () => api.get("/storefront/wishlist");
export const addToWishlist = (productId) => api.post(`/storefront/wishlist/${productId}`);
export const removeFromWishlist = (productId) => api.delete(`/storefront/wishlist/${productId}`);
export const getMyCart = () => api.get("/storefront/cart");
export const addToCart = (productId, quantity = 1) =>
  api.post("/storefront/cart", { product_id: productId, quantity });
export const updateCartItem = (itemId, quantity) => api.put(`/storefront/cart/${itemId}`, { quantity });
export const removeCartItem = (itemId) => api.delete(`/storefront/cart/${itemId}`);
export const clearCart = () => api.delete("/storefront/cart");
export const getMyOrders = () => api.get("/storefront/orders");
export const addProductReview = (data) => api.post("/storefront/reviews", data);
export const getProductReviews = (productId) => api.get(`/storefront/reviews/${productId}`);

// --- Orders ---
export const placeOrder = (data) => api.post("/orders", data);
export const getAllOrders = (status) => api.get("/orders/all", { params: status ? { status } : {} });
export const updateOrderStatus = (orderId, status) => api.put(`/orders/${orderId}/status`, { status });
export const getOrder = (orderId) => api.get(`/orders/${orderId}`);
export const cancelOrder = (orderId) => api.post(`/orders/${orderId}/cancel`);
export const confirmPayment = (orderId, utrNumber) => api.post(`/orders/${orderId}/confirm-payment`, null, { params: { utr_number: utrNumber } });
export const adminConfirmPayment = (orderId) => api.post(`/orders/${orderId}/admin-confirm-payment`);
export const confirmRefund = (orderId, refundUtr) => api.post(`/orders/${orderId}/confirm-refund`, null, { params: { refund_utr: refundUtr } });
export const getUpiQr = (amount) => api.get(`/payments/upi-qr`, { params: { amount } });

// --- Coupons ---
export const getCoupons = () => api.get("/coupons");
export const createCoupon = (data) => api.post("/coupons", data);
export const deleteCoupon = (id) => api.delete(`/coupons/${id}`);
export const validateCoupon = (code, cartTotal) => api.post("/coupons/validate", { code, cart_total: cartTotal });

// --- Referrals ---
export const generateReferral = () => api.post("/referrals/generate");
export const applyReferral = (code) => api.post(`/referrals/apply/${code}`);
export const getMyReferral = () => api.get("/referrals/my-code");
