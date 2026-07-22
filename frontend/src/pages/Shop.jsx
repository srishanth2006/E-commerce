/**
 * pages/Shop.jsx
 * -----------------
 * Customer product browsing, search, filters, add to
 * cart / wishlist. Supports preset quantities and custom input.
 */
import { useEffect, useState } from "react";
import { Search, Heart, ShoppingCart, Mic, Minus, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { getProducts, getCategories, addToCart, addToWishlist } from "../api/endpoints";
import ProductImage from "../components/ProductImage";

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

function GroceryPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-yellow-900/30">
      <svg viewBox="0 0 80 80" className="w-16 h-16 text-amber-400 dark:text-amber-500/60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 28h40l-4 28H24L20 28z" />
        <path d="M16 28h48" />
        <path d="M28 28V18a12 12 0 0 1 24 0v10" />
        <circle cx="32" cy="50" r="2" fill="currentColor" stroke="none" />
        <circle cx="40" cy="54" r="2" fill="currentColor" stroke="none" />
        <circle cx="48" cy="50" r="2" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        <div className="flex gap-2 mt-2">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-12" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-14" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-10" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <div className="h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mx-auto" />
          <div className="h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl flex-1" />
          <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [qtyMap, setQtyMap] = useState({});
  const [customMap, setCustomMap] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const params = { is_active: true };
      if (search) params.search = search;
      if (categoryId) params.category_id = categoryId;
      if (maxPrice) params.max_price = maxPrice;
      const res = await getProducts(params);
      setProducts(res.data ?? []);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCategories().then((r) => setCategories(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, categoryId, maxPrice]);

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice search isn't supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.onresult = (e) => setSearch(e.results[0][0].transcript);
    recognition.onerror = () => toast.error("Couldn't hear that - try again.");
    recognition.start();
  };

  const getQty = (productId) => {
    return qtyMap[productId] ?? 1;
  };

  const setQty = (productId, val) => {
    setQtyMap((prev) => ({ ...prev, [productId]: Math.max(0.01, val) }));
  };

  const handleAddToCart = async (product) => {
    const qty = getQty(product.product_id, product.unit);
    try {
      await addToCart(product.product_id, qty);
      toast.success(`Added ${formatQty(qty, product.unit)} to cart`);
      setQtyMap((prev) => ({ ...prev, [product.product_id]: 1 }));
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

  const getDiscount = (p) => {
    if (!p.mrp || !p.selling_price || p.mrp <= p.selling_price) return 0;
    return Math.round(((p.mrp - p.selling_price) / p.mrp) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Fresh Picks
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Browse our curated collection of quality products
          </p>
        </div>

        {/* Search + Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
              </div>
              <input
                className="w-full pl-11 pr-12 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:focus:ring-emerald-400/10 transition-all duration-200 text-sm"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={handleVoiceSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200"
                title="Voice search"
              >
                <Mic size={16} />
              </button>
            </div>
            <input
              type="number"
              className="w-full sm:w-40 px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:focus:ring-emerald-400/10 transition-all duration-200 text-sm"
              placeholder="Max price ₹"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            <button
              onClick={() => setCategoryId("")}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border-2 transition-all duration-200 ${
                categoryId === ""
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.category_id}
                onClick={() => setCategoryId(String(c.category_id))}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border-2 transition-all duration-200 whitespace-nowrap ${
                  String(c.category_id) === String(categoryId)
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg viewBox="0 0 80 80" className="w-14 h-14 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="34" cy="34" r="20" />
                <path d="M48 48l14 14" />
                <path d="M28 30h12" />
                <path d="M28 36h8" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                No products found
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Try adjusting your search or filter to find what you need
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {products.map((p) => {
              const presets = parsePresets(p.preset_quantities);
              const qty = getQty(p.product_id, p.unit);
              const lineTotal = (p.selling_price ?? 0) * qty;
              const isCustom = customMap[p.product_id] === true;
              const discount = getDiscount(p);
              const stock = p.stock_quantity ?? 0;
              const outOfStock = stock <= 0;
              const unavailable = p.is_active === false;
              const lowStock = stock > 0 && stock <= (p.reorder_level ?? 10);

              return (
                <div
                  key={p.product_id}
                  className={`group relative rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-emerald-900/10 border border-gray-100 dark:border-gray-700/50 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${outOfStock || unavailable ? "opacity-75" : ""}`}
                >
                  {/* Image area */}
                  <div className="relative aspect-square overflow-hidden">
                    <ProductImage product={p} size="lg" showBadge={false} />

                    {/* Hover overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Discount badge */}
                    {discount > 0 && !outOfStock && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-rose-500 text-white text-[10px] font-bold shadow-lg shadow-rose-500/30 z-10">
                        {discount}% OFF
                      </div>
                    )}

                    {/* Out of Stock badge */}
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                        <span className="px-4 py-2 bg-gray-900/80 text-white text-xs font-bold rounded-xl backdrop-blur-sm">Out of Stock</span>
                      </div>
                    )}

                    {/* Currently Unavailable badge */}
                    {unavailable && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                        <span className="px-4 py-2 bg-red-900/80 text-white text-xs font-bold rounded-xl backdrop-blur-sm">Currently Unavailable</span>
                      </div>
                    )}

                    {/* Low Stock badge */}
                    {!outOfStock && lowStock && (
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[10px] font-bold shadow-lg z-10">
                        Only {Math.round(stock)} left
                      </div>
                    )}

                    {/* Wishlist button */}
                    <button
                      onClick={() => handleAddToWishlist(p.product_id)}
                      className="absolute top-3 left-3 p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-500 hover:text-rose-500 hover:bg-white dark:hover:bg-gray-700 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                      title="Add to wishlist"
                    >
                      <Heart size={14} />
                    </button>

                    {/* Quick-add overlay button */}
                    {!outOfStock && !unavailable && (
                    <button
                      onClick={() => handleAddToCart(p)}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 z-10 whitespace-nowrap"
                    >
                      <span className="flex items-center gap-1.5">
                        <ShoppingCart size={13} />
                        Quick Add
                      </span>
                    </button>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-2.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {p.category?.name || "Uncategorized"}
                      </p>
                    </div>

                    {/* Price display */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{lineTotal.toFixed(2)}
                      </span>
                      {p.mrp && p.mrp > (p.selling_price ?? 0) && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 line-through">
                          ₹{(p.mrp * qty).toFixed(2)}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        ₹{(p.selling_price ?? 0).toFixed(0)}/{p.unit || "pc"}
                      </span>
                    </div>

                    {/* Preset quantity buttons */}
                    {presets.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {presets.map((pv) => (
                          <button
                            key={pv}
                            onClick={() => {
                              setQty(p.product_id, pv);
                              setCustomMap((m) => ({ ...m, [p.product_id]: false }));
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all duration-200 ${
                              qty === pv && !isCustom
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10"
                                : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600"
                            }`}
                          >
                            {formatQty(pv, p.unit)}
                          </button>
                        ))}
                        <button
                          onClick={() => setCustomMap((m) => ({ ...m, [p.product_id]: true }))}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all duration-200 ${
                            isCustom
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10"
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600"
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                    )}

                    {/* Quantity controls */}
                    {presets.length > 0 && !isCustom ? (
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => setQty(p.product_id, Math.max(0.01, qty - (qty > 1 ? 0.5 : 0.1)))}
                          className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 transition-all duration-200"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-bold min-w-[3.5rem] text-center text-gray-900 dark:text-white">
                          {formatQty(qty, p.unit)}
                        </span>
                        <button
                          onClick={() => setQty(p.product_id, qty + (qty >= 1 ? 0.5 : 0.1))}
                          className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 transition-all duration-200"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            className="w-full px-3 py-2 rounded-xl text-xs border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-200"
                            placeholder={`Qty in ${p.unit || "pcs"}`}
                            value={qty === 1 && presets.length > 0 ? "" : qty}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v > 0) setQty(p.product_id, v);
                            }}
                            onFocus={() => setCustomMap((m) => ({ ...m, [p.product_id]: true }))}
                          />
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            {p.unit || "pcs"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Add to Cart + Wishlist buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleAddToCart(p)}
                        disabled={outOfStock || unavailable}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                          outOfStock || unavailable
                            ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                            : "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30"
                        }`}
                      >
                        <ShoppingCart size={13} />
                        {unavailable ? "Unavailable" : outOfStock ? "Out of Stock" : "Add to Cart"}
                      </button>
                      <button
                        onClick={() => handleAddToWishlist(p.product_id)}
                        className="p-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-200"
                        title="Add to wishlist"
                      >
                        <Heart size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
