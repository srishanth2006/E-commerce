/**
 * pages/Wishlist.jsx
 * ---------------------
 * MODULE 3 - customer wishlist.
 */
import { useEffect, useState } from "react";
import { Heart, ShoppingCart, X } from "lucide-react";
import toast from "react-hot-toast";
import { getMyWishlist, removeFromWishlist, addToCart } from "../api/endpoints";

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMyWishlist();
      setItems(res.data ?? []);
    } catch {
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRemove = async (productId) => {
    try {
      await removeFromWishlist(productId);
      load();
    } catch { toast.error("Failed to remove from wishlist"); }
  };

  const handleAddToCart = async (productId) => {
    try {
      await addToCart(productId, 1);
      toast.success("Added to cart");
    } catch { toast.error("Failed to add to cart"); }
  };

  if (loading) return <p className="text-center text-gray-400 py-10">Loading wishlist...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><Heart size={20} /> Your Wishlist</h1>

      {items.length === 0 ? (
        <p className="text-center text-gray-400 py-10">Nothing saved yet. Tap the heart icon on any product!</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it) => (
            <div key={it.id} className="card p-3 relative">
              <button onClick={() => handleRemove(it.product_id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                <X size={14} />
              </button>
              <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-2" />
              <p className="text-sm font-medium truncate">{it.product?.name}</p>
              <p className="font-bold text-primary-600 mb-2">₹{(it.product?.selling_price ?? 0).toFixed(0)}</p>
              <button onClick={() => handleAddToCart(it.product_id)} className="btn-primary w-full text-xs py-1.5">
                <ShoppingCart size={13} /> Add to cart
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
