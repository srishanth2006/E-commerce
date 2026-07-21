/**
 * pages/Cart.jsx
 * -----------------
 * MODULE 3 - customer shopping cart.
 * Checkout itself happens at the physical store counter (the cashier's
 * Billing/POS page) - this cart is for browsing/planning a visit, or for
 * a future online-order flow. Payment methods (Module 16) are wired into
 * the staff Billing page since that's where actual transactions post.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Minus, Plus, ArrowRight, AlertTriangle, CheckCircle, X } from "lucide-react";
import toast from "react-hot-toast";
import { getMyCart, updateCartItem, removeCartItem, clearCart } from "../api/endpoints";
import ProductImage from "../components/ProductImage";

function deliveryMessage(subtotal) {
  if (subtotal >= 500) return { text: "Free delivery on this order!", color: "text-green-600 dark:text-green-400" };
  if (subtotal >= 200) return { text: `Add ₹${(500 - subtotal).toFixed(0)} more for free delivery. ₹20 delivery fee applies.`, color: "text-amber-600 dark:text-amber-400" };
  return { text: `Add ₹${(200 - subtotal).toFixed(0)} more for free delivery. ₹40 delivery fee applies.`, color: "text-amber-600 dark:text-amber-400" };
}

function deliveryFee(subtotal) {
  if (subtotal >= 500) return 0;
  if (subtotal >= 200) return 20;
  return 40;
}

export default function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState(new Set());
  const [clearConfirm, setClearConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMyCart();
      setItems(res.data ?? []);
    } catch {
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleQtyChange = async (itemId, qty) => {
    if (qty < 0.1) return;
    const item = items.find((it) => it.id === itemId);
    if (item?.product?.stock_quantity !== undefined && qty > item.product.stock_quantity) {
      toast.error(`Only ${Math.round(item.product.stock_quantity)} available in stock`);
      qty = item.product.stock_quantity;
    }
    try {
      await updateCartItem(itemId, qty);
      load();
    } catch { toast.error("Failed to update cart"); }
  };

  const handleRemove = async (itemId) => {
    setRemovingIds((prev) => new Set(prev).add(itemId));
    setTimeout(async () => {
      try {
        await removeCartItem(itemId);
        toast.success("Item removed");
        load();
      } catch { toast.error("Failed to remove item"); }
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 300);
  };

  const handleClear = async () => {
    setClearConfirm(false);
    try {
      await clearCart();
      toast.success("Cart cleared");
      load();
    } catch { toast.error("Failed to clear cart"); }
  };

  const total = items.reduce((sum, it) => sum + (it.product?.selling_price || 0) * it.quantity, 0);
  const fee = deliveryFee(total);
  const grandTotal = total + fee;
  const totalItems = items.reduce((sum, it) => sum + it.quantity, 0);
  const delivery = deliveryMessage(total);
  const hasOutOfStock = items.some((it) => it.product?.stock_quantity !== undefined && it.product.stock_quantity <= 0);
  const hasQtyExceedsStock = items.some((it) => it.product?.stock_quantity !== undefined && it.quantity > it.product.stock_quantity);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-32 lg:pb-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400">
            <ShoppingBag size={20} />
          </span>
          <span>
            Your Cart
            {items.length > 0 && (
              <span className="ml-2 text-sm font-medium text-gray-400 dark:text-gray-500">
                ({totalItems} {totalItems === 1 ? "item" : "items"})
              </span>
            )}
          </span>
        </h1>
        {items.length > 0 && (
          <button
            onClick={() => setClearConfirm(true)}
            className="group flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
          >
            <Trash2 size={14} className="group-hover:rotate-12 transition-transform duration-200" />
            Clear cart
          </button>
        )}
      </div>

      {/* Clear Confirmation Dialog */}
      {clearConfirm && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">Remove all items from your cart?</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setClearConfirm(false)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Yes, clear all
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
            <ShoppingBag size={40} className="text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Your cart is empty</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs">
            Looks like you haven't added anything yet. Browse our products and start shopping!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5"
          >
            <ShoppingBag size={18} />
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">
          {/* Items List */}
          <div className="space-y-3">
            {items.map((it) => {
              const lineTotal = (it.product?.selling_price || 0) * it.quantity;
              const isRemoving = removingIds.has(it.id);

              return (
                <div
                  key={it.id}
                  className={`
                    group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800
                    shadow-sm hover:shadow-md dark:shadow-none dark:hover:border-gray-700
                    p-4 flex items-center gap-4
                    transition-all duration-300
                    ${isRemoving ? "opacity-0 scale-95 translate-x-4" : "opacity-100 scale-100 translate-x-0"}
                  `}
                >
                  {/* Product Image */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0">
                    <ProductImage product={it.product} size="cart" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {it.product?.name}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      ₹{(it.product?.selling_price ?? 0).toFixed(2)} / {it.product?.unit ?? "unit"}
                    </p>
                    {it.product?.stock_quantity !== undefined && it.product.stock_quantity <= 0 && (
                      <p className="text-[11px] font-medium text-red-500 dark:text-red-400 mt-1">Out of stock</p>
                    )}
                    {it.product?.stock_quantity !== undefined && it.product.stock_quantity > 0 && it.product.stock_quantity <= (it.product?.reorder_level ?? 10) && (
                      <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1">Only {Math.round(it.product.stock_quantity)} left</p>
                    )}
                    {it.product?.stock_quantity !== undefined && it.product.stock_quantity > 0 && it.quantity > it.product.stock_quantity && (
                      <p className="text-[11px] font-medium text-red-500 dark:text-red-400 mt-1">Only {Math.round(it.product.stock_quantity)} available - qty adjusted</p>
                    )}
                    <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mt-1 lg:hidden">
                      ₹{lineTotal.toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                    <button
                      onClick={() => handleQtyChange(it.id, it.quantity - (it.quantity > 1 ? 0.5 : 0.1))}
                      disabled={it.quantity <= (it.quantity > 1 ? 0.5 : 0.1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 active:scale-90"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-12 text-center text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                      {it.quantity}
                    </span>
                    <button
                      onClick={() => handleQtyChange(it.id, it.quantity + (it.quantity >= 1 ? 0.5 : 0.1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-150 active:scale-90"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Line Total (desktop) */}
                  <div className="hidden lg:block text-right min-w-[80px]">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      ₹{lineTotal.toFixed(2)}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(it.id)}
                    className="remove-btn relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 transition-all duration-200 shrink-0 overflow-hidden group/remove"
                    title="Remove item"
                  >
                    <Trash2 size={16} className="transition-transform duration-200 group-hover/remove:scale-110 group-hover/remove:rotate-12" />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white opacity-0 group-hover/remove:opacity-100 transition-opacity duration-200 pointer-events-none">
                      ✕
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Delivery</span>
                  <span className={`font-medium ${fee === 0 ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}`}>
                    {fee === 0 ? "Free" : `₹${fee}`}
                  </span>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900 dark:text-white">Grand Total</span>
                  <span className="text-xl font-extrabold text-primary-600 dark:text-primary-400">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <p className={`text-xs font-medium ${delivery.color}`}>
                {delivery.text}
              </p>

              {hasOutOfStock && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <span className="text-red-500 text-sm mt-0.5">!</span>
                  <p className="text-xs text-red-600 dark:text-red-400">Some items in your cart are out of stock and cannot be ordered. Remove them to proceed.</p>
                </div>
              )}
              {!hasOutOfStock && hasQtyExceedsStock && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <span className="text-amber-500 text-sm mt-0.5">!</span>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Some items have quantity exceeding available stock. Quantities will be adjusted at checkout.</p>
                </div>
              )}

              <Link
                to="/checkout"
                className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 font-semibold rounded-xl shadow-lg transition-all duration-200 ${
                  hasOutOfStock
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none pointer-events-none"
                    : "bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5 active:translate-y-0"
                }`}
              >
                Proceed to Checkout
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Mobile Sticky Bottom Bar */}
          <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40">
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {totalItems} items ·
                  <span className={`ml-1 font-medium ${fee === 0 ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}`}>
                    {fee === 0 ? "Free delivery" : `+₹${fee} delivery`}
                  </span>
                </span>
                <span className="text-lg font-extrabold text-primary-600 dark:text-primary-400">₹{grandTotal.toFixed(2)}</span>
              </div>
              <p className={`text-xs font-medium ${delivery.color}`}>{delivery.text}</p>
              <Link
                to="/checkout"
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold rounded-xl shadow-lg shadow-primary-600/25 active:scale-[0.98] transition-all duration-150"
              >
                Proceed to Checkout
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
