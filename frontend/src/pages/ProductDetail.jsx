/**
 * pages/ProductDetail.jsx
 * -----------------------
 * Product detail page with image, info, add to cart/wishlist,
 * quantity selector (presets + custom), and reviews.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShoppingCart, Heart, Star, ChevronLeft, Package, Minus, Plus
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getProduct, addToCart, addToWishlist, getProductReviews
} from "../api/endpoints";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function formatQty(val, unit) {
  if (!unit) return String(val);
  const u = unit.toLowerCase();
  if ((u === "kg" || u === "g") && val < 1 && u === "kg") {
    return `${Math.round(val * 1000)} g`;
  }
  if ((u === "litre" || u === "l" || u === "ml") && val < 1 && (u === "litre" || u === "l")) {
    return `${Math.round(val * 1000)} ml`;
  }
  return `${val} ${unit}`;
}

function parsePresets(raw) {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean).map(Number).filter((n) => !isNaN(n) && n > 0);
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [customQty, setCustomQty] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [prodRes, revRes] = await Promise.all([
          getProduct(id),
          getProductReviews(id),
        ]);
        setProduct(prodRes.data);
        setReviews(revRes.data ?? []);
      } catch {
        toast.error("Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleAddToCart = async () => {
    const qty = isCustom ? parseFloat(customQty) || 0 : quantity;
    if (!qty || qty <= 0) {
      toast.error("Please select a valid quantity");
      return;
    }
    try {
      await addToCart(Number(id), qty);
      toast.success(`Added ${formatQty(qty, product.unit)} to cart`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add to cart");
    }
  };

  const handleAddToWishlist = async () => {
    try {
      await addToWishlist(Number(id));
      toast.success("Added to wishlist");
    } catch {
      toast.error("Failed to add to wishlist");
    }
  };

  if (loading) {
    return <p className="text-center text-gray-400 py-10">Loading product...</p>;
  }

  if (!product) {
    return <p className="text-center text-gray-400 py-10">Product not found.</p>;
  }

  const discountPct = product.mrp && product.mrp > (product.selling_price ?? 0)
    ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100)
    : 0;

  const inStock = product.stock_quantity === undefined || product.stock_quantity > 0;
  const presets = parsePresets(product.preset_quantities);
  const activeQty = isCustom ? (parseFloat(customQty) || 0) : quantity;
  const lineTotal = (product.selling_price ?? 0) * activeQty;

  return (
    <div className="space-y-8">
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
        <ChevronLeft size={16} /> Back to Shop
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img src={`${API_BASE}${product.image_url}`} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package size={64} className="text-gray-300 dark:text-gray-500" />
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-primary-600 font-medium">{product.category?.name || "Category"}</p>
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">{product.name}</h1>
            {product.brand?.name && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Brand: {product.brand.name}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold text-primary-600">₹{lineTotal.toFixed(2)}</span>
            <span className="text-sm text-gray-400">₹{(product.selling_price ?? 0).toFixed(0)}/{product.unit || "pc"}</span>
            {product.mrp > (product.selling_price ?? 0) && (
              <span className="text-sm bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 rounded px-2 py-0.5 font-medium">
                {discountPct}% OFF
              </span>
            )}
          </div>

          <p className={`text-sm font-medium ${inStock ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
            {inStock ? "In Stock" : "Out of Stock"}
          </p>

          {product.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{product.description}</p>
          )}

          {/* Preset quantity buttons */}
          {presets.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Select quantity:</p>
              <div className="flex flex-wrap gap-2">
                {presets.map((pv) => (
                  <button
                    key={pv}
                    onClick={() => { setQuantity(pv); setIsCustom(false); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition ${
                      quantity === pv && !isCustom
                        ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                        : "border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {formatQty(pv, product.unit)}
                  </button>
                ))}
                <button
                  onClick={() => setIsCustom(true)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition ${
                    isCustom
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                      : "border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          {isCustom || presets.length === 0 ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input w-24"
                  placeholder={`Qty`}
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  autoFocus={isCustom}
                />
                <span className="text-sm text-gray-400">{product.unit || "pcs"}</span>
              </div>
              <button onClick={handleAddToCart} disabled={!inStock} className="btn-primary flex-1">
                <ShoppingCart size={16} /> Add to Cart
              </button>
              <button onClick={handleAddToWishlist} className="btn-secondary p-2.5" title="Add to Wishlist">
                <Heart size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg dark:border-gray-600">
                <button
                  onClick={() => setQuantity((q) => Math.max(0.01, q - (q > 1 ? 0.5 : 0.1)))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg"
                >
                  <Minus size={16} />
                </button>
                <span className="w-16 text-center font-medium dark:text-white text-sm">{formatQty(quantity, product.unit)}</span>
                <button
                  onClick={() => setQuantity((q) => q + (q >= 1 ? 0.5 : 0.1))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button onClick={handleAddToCart} disabled={!inStock} className="btn-primary flex-1">
                <ShoppingCart size={16} /> Add to Cart
              </button>
              <button onClick={handleAddToWishlist} className="btn-secondary p-2.5" title="Add to Wishlist">
                <Heart size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="text-xl font-bold dark:text-white mb-4">Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-400 text-sm">No reviews yet. Be the first to review this product!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.review_id} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        size={14}
                        className={j < (r.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium dark:text-white">{r.customer_name || "Anonymous"}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{r.comment || r.review_text}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
