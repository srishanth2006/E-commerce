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
import ProductImage from "../components/ProductImage";

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

function isLooseUnit(unit) {
  const u = (unit || "").toLowerCase().trim();
  return ["kg", "g", "gm", "gms", "l", "ltr", "ltrs", "litre", "litres", "liter", "liters", "ml", "ltr"].includes(u);
}

function looseStep(unit) {
  const u = (unit || "").toLowerCase().trim();
  if (u === "kg" || u === "g" || u === "gm" || u === "gms") return 0.25;
  if (u === "l" || u === "ltr" || u === "ltrs" || u === "litre" || u === "litres" || u === "liter" || u === "liters" || u === "ml") return 0.25;
  return 1;
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
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);

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
      setIsWishlisted(true);
      toast.success("Added to wishlist");
    } catch {
      toast.error("Failed to add to wishlist");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin" />
        <p className="text-gray-400 dark:text-gray-500 text-sm animate-pulse">Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Package size={48} className="text-gray-300 dark:text-gray-600" />
        <p className="text-gray-400 dark:text-gray-500">Product not found.</p>
        <Link to="/shop" className="text-sm text-primary-600 hover:underline">Back to Shop</Link>
      </div>
    );
  }

  const discountPct = product.mrp && product.mrp > (product.selling_price ?? 0)
    ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100)
    : 0;

  const inStock = product.stock_quantity === undefined || product.stock_quantity > 0;
  const isActive = product.is_active !== false;
  const presets = parsePresets(product.preset_quantities);
  const activeQty = isCustom ? (parseFloat(customQty) || 0) : quantity;
  const lineTotal = (product.selling_price ?? 0) * activeQty;
  const savings = product.mrp && product.mrp > (product.selling_price ?? 0)
    ? (product.mrp - product.selling_price) * activeQty
    : 0;

  const images = product.images?.length > 0
    ? product.images
    : product.image_url
      ? [product.image_url]
      : [];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 flex-wrap">
          <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Home</Link>
          <ChevronLeft size={12} className="rotate-180" />
          <Link to="/shop" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            {product.category?.name || "Shop"}
          </Link>
          <ChevronLeft size={12} className="rotate-180" />
          <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* Back to shop */}
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all group"
        >
          <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          </span>
          Back to Shop
        </Link>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">

          {/* Image Section */}
          <div className="space-y-4">
            {/* Main Image */}
            <div
              className="relative aspect-square rounded-3xl overflow-hidden cursor-zoom-in group"
              onMouseEnter={() => setImageZoomed(true)}
              onMouseLeave={() => setImageZoomed(false)}
            >
              {images.length > 0 ? (
                <img
                  src={`${API_BASE}${images[selectedImage]}`}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-transform duration-500 ease-out ${imageZoomed ? "scale-150" : "scale-100"}`}
                />
              ) : (
                <ProductImage product={product} size="lg" className="rounded-3xl" />
              )}

              {/* Discount badge on image */}
              {discountPct > 0 && (
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                  {discountPct}% OFF
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      selectedImage === idx
                        ? "border-primary-500 dark:border-primary-400 ring-2 ring-primary-200 dark:ring-primary-800 scale-105"
                        : "border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <img
                      src={`${API_BASE}${img}`}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="space-y-6">

            {/* Name & Brand */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
                {product.name}
              </h1>
              {product.brand?.name && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                  {product.brand.name}
                </span>
              )}
            </div>

            {/* Rating */}
            {product.rating != null && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      size={18}
                      className={j < Math.round(product.rating) ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700"}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  ({product.rating?.toFixed(1)})
                </span>
              </div>
            )}

            {/* Price Section */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-4xl font-extrabold text-primary-600 dark:text-primary-400 tabular-nums">
                  ₹{lineTotal.toFixed(2)}
                </span>
                {activeQty > 1 && (
                  <span className="text-sm text-gray-400 dark:text-gray-500">
                    (₹{(product.selling_price ?? 0).toFixed(2)}/{product.unit || "pc"})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {product.mrp > (product.selling_price ?? 0) && (
                  <>
                    <span className="text-base text-gray-400 dark:text-gray-500 line-through">
                      ₹{(product.mrp * activeQty).toFixed(2)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                      Save ₹{savings.toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Stock Indicator */}
            <div className="flex items-center gap-2">
              <span className={`relative flex h-3 w-3 ${inStock && isActive ? "" : ""}`}>
                {inStock && isActive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${!isActive ? "bg-orange-500" : inStock ? "bg-green-500" : "bg-red-500"}`} />
              </span>
              <span className={`text-sm font-semibold ${!isActive ? "text-orange-500 dark:text-orange-400" : inStock ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                {!isActive
                  ? "Currently Unavailable"
                  : inStock
                    ? product.stock_quantity != null && product.stock_quantity <= (product.reorder_level ?? 10)
                      ? `Low Stock - Only ${product.stock_quantity} left`
                      : product.stock_quantity != null ? `In Stock (${product.stock_quantity} available)` : "In Stock"
                    : "Out of Stock"}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Select Quantity
              </p>

              {presets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {presets.map((pv) => (
                    <button
                      key={pv}
                      onClick={() => { setQuantity(pv); setIsCustom(false); }}
                      className={`relative px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 transform ${
                        quantity === pv && !isCustom
                          ? "bg-primary-600 dark:bg-primary-500 text-white shadow-lg shadow-primary-200 dark:shadow-primary-900/30 scale-105"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105"
                      }`}
                    >
                      {formatQty(pv, product.unit)}
                      {quantity === pv && !isCustom && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary-400 rounded-full" />
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsCustom(true)}
                    className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 transform ${
                      isCustom
                        ? "bg-primary-600 dark:bg-primary-500 text-white shadow-lg shadow-primary-200 dark:shadow-primary-900/30 scale-105"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105"
                    }`}
                  >
                    Custom
                  </button>
                </div>
              )}

              {/* Custom Input or Stepper + Add to Cart */}
              {(isCustom || presets.length === 0) ? (
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-[180px]">
                    <input
                      type="number"
                      step={isLooseUnit(product.unit) ? "0.01" : "1"}
                      min={isLooseUnit(product.unit) ? "0.01" : "1"}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900/30 outline-none transition-all duration-200"
                      placeholder="Enter qty"
                      value={customQty}
                      onChange={(e) => setCustomQty(e.target.value)}
                      autoFocus={isCustom}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                      {product.unit || "pcs"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                    <button
                      onClick={() => setQuantity((q) => {
                        const step = isLooseUnit(product.unit) ? looseStep(product.unit) : 1;
                        const next = q - step;
                        return Math.max(isLooseUnit(product.unit) ? 0.01 : 1, next < (isLooseUnit(product.unit) ? 0.01 : 1) ? (isLooseUnit(product.unit) ? 0.01 : 1) : Math.round(next / step) * step);
                      })}
                      className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-90"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-20 text-center font-bold text-sm text-gray-900 dark:text-white tabular-nums">
                      {formatQty(quantity, product.unit)}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => {
                        const step = isLooseUnit(product.unit) ? looseStep(product.unit) : 1;
                        return Math.round((q + step) / step) * step;
                      })}
                      className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-90"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={!inStock || !isActive}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-base font-bold transition-all duration-200 ${
                  inStock && isActive
                    ? "bg-gradient-to-r from-primary-600 to-primary-500 dark:from-primary-500 dark:to-primary-400 text-white shadow-lg shadow-primary-200 dark:shadow-primary-900/30 hover:shadow-xl hover:shadow-primary-300 dark:hover:shadow-primary-900/40 hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                }`}
              >
                <ShoppingCart size={20} />
                {!isActive ? "Currently Unavailable" : inStock ? "Add to Cart" : "Out of Stock"}
              </button>

              <button
                onClick={handleAddToWishlist}
                disabled={isWishlisted}
                className={`w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-2xl border-2 transition-all duration-300 ${
                  isWishlisted
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
                }`}
                title="Add to Wishlist"
              >
                <Heart
                  size={22}
                  className={`transition-all duration-300 ${
                    isWishlisted
                      ? "fill-red-500 text-red-500 scale-110"
                      : "text-gray-400 dark:text-gray-500 hover:text-red-400"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <section className="border-t border-gray-100 dark:border-gray-800 pt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Customer Reviews
            </h2>
            {reviews.length > 0 && (
              <span className="text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </span>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-2xl">
              <Star size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                No reviews yet. Be the first to review this product!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => {
                const reviewerName = r.customer_name || "Anonymous";
                const initial = reviewerName.charAt(0).toUpperCase();
                const avatarColors = [
                  "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300",
                  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
                  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
                ];
                const colorClass = avatarColors[hashCode(reviewerName) % avatarColors.length];

                return (
                  <div
                    key={r.review_id}
                    className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${colorClass}`}>
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {reviewerName}
                          </span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <Star
                                key={j}
                                size={13}
                                className={j < (r.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700"}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {r.comment || r.review_text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
