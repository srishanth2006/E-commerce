/**
 * pages/Offers.jsx
 * -----------------
 * Deals/offers page showing all products with a discount.
 */
import { useEffect, useState } from "react";
import { ShoppingCart, Heart, Tag } from "lucide-react";
import toast from "react-hot-toast";
import { getProducts, addToCart, addToWishlist } from "../api/endpoints";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Offers() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getProducts({ is_active: true, discount_min: 1 });
        setProducts(res.data ?? []);
      } catch {
        toast.error("Failed to load offers");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAddToCart = async (productId) => {
    try {
      await addToCart(productId, 1);
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add to cart");
    }
  };

  const handleAddToWishlist = async (productId) => {
    try {
      await addToWishlist(productId);
      toast.success("Added to wishlist");
    } catch {
      toast.error("Failed to add to wishlist");
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-3 py-2">
        <Tag size={28} className="text-red-500" />
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Today&apos;s Best Deals</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Save big on products you love!</p>
        </div>
      </section>

      {loading ? (
        <p className="text-center text-gray-400 py-10">Loading offers...</p>
      ) : products.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No offers available right now. Check back soon!</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => {
            const discountPct = p.discount ?? (p.mrp && p.mrp > (p.selling_price ?? 0)
              ? Math.round(((p.mrp - p.selling_price) / p.mrp) * 100)
              : 0);

            return (
              <div key={p.product_id} className="card p-3 flex flex-col relative">
                {discountPct > 0 && (
                  <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold rounded px-2 py-0.5">
                    -{discountPct}%
                  </span>
                )}
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  {p.image_url ? (
                    <img src={`${API_BASE}${p.image_url}`} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingCart size={28} className="text-gray-300" />
                  )}
                </div>
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-gray-400">{p.category?.name || "—"}</p>
                <div className="flex items-center gap-2 mt-1 mb-2">
                  <span className="font-bold text-primary-600">₹{(p.selling_price ?? 0).toFixed(0)}</span>
                  {p.mrp > (p.selling_price ?? 0) && (
                    <span className="text-xs text-gray-400 line-through">₹{p.mrp.toFixed(0)}</span>
                  )}
                </div>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => handleAddToCart(p.product_id)} className="btn-primary flex-1 text-xs py-1.5">
                    <ShoppingCart size={13} /> Add
                  </button>
                  <button onClick={() => handleAddToWishlist(p.product_id)} className="btn-secondary px-2.5 py-1.5">
                    <Heart size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
