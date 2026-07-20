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
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { getMyCart, updateCartItem, removeCartItem, clearCart } from "../api/endpoints";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
    if (qty < 1) return;
    try {
      await updateCartItem(itemId, qty);
      load();
    } catch { toast.error("Failed to update cart"); }
  };

  const handleRemove = async (itemId) => {
    try {
      await removeCartItem(itemId);
      load();
    } catch { toast.error("Failed to remove item"); }
  };

  const handleClear = async () => {
    try {
      await clearCart();
      load();
    } catch { toast.error("Failed to clear cart"); }
  };

  const total = items.reduce((sum, it) => sum + (it.product?.selling_price || 0) * it.quantity, 0);

  if (loading) return <p className="text-center text-gray-400 py-10">Loading cart...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><ShoppingBag size={20} /> Your Cart</h1>
        {items.length > 0 && (
          <button onClick={handleClear} className="text-xs text-red-500 hover:underline">Clear cart</button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-center text-gray-400 py-10">Your cart is empty. Go add some products!</p>
      ) : (
        <>
          <div className="card divide-y divide-gray-100 dark:divide-gray-700 p-0">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 p-4">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{it.product?.name}</p>
                  <p className="text-xs text-gray-400">₹{(it.product?.selling_price ?? 0).toFixed(0)} / {it.product?.unit ?? ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleQtyChange(it.id, Math.max(0.01, it.quantity - (it.quantity > 1 ? 0.5 : 0.1)))} className="p-1 rounded bg-gray-100 dark:bg-gray-700">
                    <Minus size={12} />
                  </button>
                  <span className="text-sm w-10 text-center">{it.quantity}</span>
                  <button onClick={() => handleQtyChange(it.id, it.quantity + (it.quantity >= 1 ? 0.5 : 0.1))} className="p-1 rounded bg-gray-100 dark:bg-gray-700">
                    <Plus size={12} />
                  </button>
                </div>
                <button onClick={() => handleRemove(it.id)} className="text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="card flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Estimated total</span>
            <span className="text-xl font-bold text-primary-600">₹{total.toFixed(2)}</span>
          </div>
          <Link to="/checkout" className="btn-primary w-full flex items-center justify-center gap-2">
            Proceed to Checkout <ArrowRight size={16} />
          </Link>
        </>
      )}
    </div>
  );
}
