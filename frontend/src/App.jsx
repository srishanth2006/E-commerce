/**
 * App.jsx
 * ---------
 * Top-level router with lazy-loaded routes for fast initial load.
 */
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import StorefrontLayout from "./components/StorefrontLayout";

const Login = lazy(() => import("./pages/Login"));
const StaffLogin = lazy(() => import("./pages/StaffLogin"));
const StaffRegister = lazy(() => import("./pages/StaffRegister"));
const CustomerLogin = lazy(() => import("./pages/CustomerLogin"));
const CustomerRegister = lazy(() => import("./pages/CustomerRegister"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Categories = lazy(() => import("./pages/Categories"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Billing = lazy(() => import("./pages/Billing"));
const Customers = lazy(() => import("./pages/Customers"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Reports = lazy(() => import("./pages/Reports"));
const PurchaseScanner = lazy(() => import("./pages/PurchaseScanner"));
const Forecasting = lazy(() => import("./pages/Forecasting"));
const Notifications = lazy(() => import("./pages/Notifications"));
const BillHistory = lazy(() => import("./pages/BillHistory"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminCoupons = lazy(() => import("./pages/AdminCoupons"));
const Staff = lazy(() => import("./pages/Staff"));
const NotFound = lazy(() => import("./pages/NotFound"));

const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQs = lazy(() => import("./pages/FAQs"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Offers = lazy(() => import("./pages/Offers"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Cart = lazy(() => import("./pages/Cart"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Orders = lazy(() => import("./pages/Orders"));
const ReferralPage = lazy(() => import("./pages/ReferralPage"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));

function Loader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <ErrorBoundary>
        <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff/register" element={<ProtectedRoute requiredRole="admin"><StaffRegister /></ProtectedRoute>} />
          <Route path="/customer/login" element={<CustomerLogin />} />
          <Route path="/customer/register" element={<CustomerRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* ---- Staff / admin area ---- */}
          <Route
            path="/"
            element={
              <ProtectedRoute requiredType="staff">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={
              <ProtectedRoute requiredRole="admin"><Dashboard /></ProtectedRoute>
            } />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={
              <ProtectedRoute requiredRole="admin"><Categories /></ProtectedRoute>
            } />
            <Route path="inventory" element={
              <ProtectedRoute requiredRole="admin"><Inventory /></ProtectedRoute>
            } />
            <Route path="billing" element={<Billing />} />
            <Route path="purchases" element={
              <ProtectedRoute requiredRole="admin"><PurchaseScanner /></ProtectedRoute>
            } />
            <Route path="forecast" element={
              <ProtectedRoute requiredRole="admin"><Forecasting /></ProtectedRoute>
            } />
            <Route path="customers" element={<Customers />} />
            <Route path="suppliers" element={
              <ProtectedRoute requiredRole="admin"><Suppliers /></ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute>
            } />
            <Route path="notifications" element={<Notifications />} />
            <Route path="bills" element={<BillHistory />} />
            <Route path="admin/orders" element={
              <ProtectedRoute requiredRole="admin"><AdminOrders /></ProtectedRoute>
            } />
            <Route path="admin/coupons" element={
              <ProtectedRoute requiredRole="admin"><AdminCoupons /></ProtectedRoute>
            } />
            <Route path="admin/staff" element={
              <ProtectedRoute requiredRole="admin"><Staff /></ProtectedRoute>
            } />
          </Route>

          {/* ---- Customer storefront area ---- */}
          <Route element={<StorefrontLayout />}>
            <Route path="home" element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="shop/product/:id" element={<ProductDetail />} />
            <Route path="product/:id" element={<ProductDetail />} />
            <Route path="offers" element={<Offers />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="faqs" element={<FAQs />} />
            <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />
            <Route path="referrals" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}
