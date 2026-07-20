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

  const getQty = (productId, unit) => {
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 pr-9"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={handleVoiceSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600" title="Voice search">
            <Mic size={16} />
          </button>
        </div>
        <select className="input sm:w-48" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>{c.name}</option>
          ))}
        </select>
        <input
          type="number"
          className="input sm:w-36"
          placeholder="Max price ₹"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-10">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => {
            const presets = parsePresets(p.preset_quantities);
            const qty = getQty(p.product_id, p.unit);
            const lineTotal = (p.selling_price ?? 0) * qty;
            const isCustom = customMap[p.product_id] === true;

            return (
              <div key={p.product_id} className="card p-3 flex flex-col">
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  {p.image_url ? (
                    <img src={`${API_BASE}${p.image_url}`} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingCart size={28} className="text-gray-300" />
                  )}
                </div>
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-gray-400">{p.category?.name || "—"}</p>

                <div className="flex items-center justify-between mt-1 mb-1">
                  <span className="font-bold text-primary-600 text-sm">₹{lineTotal.toFixed(2)}</span>
                  <span className="text-[10px] text-gray-400">₹{(p.selling_price ?? 0).toFixed(0)}/{p.unit || "pc"}</span>
                </div>

                {/* Preset quantity buttons */}
                {presets.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {presets.map((pv) => (
                      <button
                        key={pv}
                        onClick={() => { setQty(p.product_id, pv); setCustomMap((m) => ({ ...m, [p.product_id]: false })); }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition ${
                          qty === pv && !isCustom
                            ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700"
                            : "border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {formatQty(pv, p.unit)}
                      </button>
                    ))}
                    <button
                      onClick={() => { setCustomMap((m) => ({ ...m, [p.product_id]: true })); }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition ${
                        isCustom
                          ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700"
                          : "border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                )}

                {/* Quantity controls */}
                {presets.length > 0 && !isCustom ? (
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setQty(p.product_id, Math.max(0.01, qty - (qty > 1 ? 0.5 : 0.1)))}
                      className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-xs font-bold min-w-[3rem] text-center">{formatQty(qty, p.unit)}</span>
                    <button
                      onClick={() => setQty(p.product_id, qty + (qty >= 1 ? 0.5 : 0.1))}
                      className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="mb-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="input text-xs py-1 px-2 flex-1"
                        placeholder={`Qty in ${p.unit || "pcs"}`}
                        value={qty === 1 && presets.length > 0 ? "" : qty}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v > 0) setQty(p.product_id, v);
                        }}
                        onFocus={() => setCustomMap((m) => ({ ...m, [p.product_id]: true }))}
                      />
                      <span className="text-[10px] text-gray-400">{p.unit || "pcs"}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  <button onClick={() => handleAddToCart(p)} className="btn-primary flex-1 text-xs py-1.5">
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
