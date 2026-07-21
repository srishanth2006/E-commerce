import { useState, useMemo } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CATEGORY_KEYWORDS = {
  "dairy": "milk", "bakery": "bread", "beverages": "coffee", "snacks": "chips",
  "grains": "rice", "spices": "spice", "fruits": "fruit", "vegetables": "vegetable",
  "meat": "chicken", "frozen": "ice cream", "cleaning": "detergent",
  "personal care": "shampoo", "household": "kitchen", "soft drinks": "soda",
  "juices": "juice", "oils": "oil", "condiments": "sauce", "confectionery": "chocolate",
  "pet": "pet food", "baby": "baby",
};

function getProductKeyword(product) {
  const catName = (product?.category?.name || "").toLowerCase().trim();
  for (const [key, val] of Object.entries(CATEGORY_KEYWORDS)) {
    if (catName.includes(key)) return val;
  }
  const words = (product?.name || "").toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (words.length > 0) return words[0];
  if (product?.brand?.name) return product.brand.name.toLowerCase();
  return "grocery";
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const GRADIENTS = [
  "from-emerald-400 to-teal-500", "from-orange-400 to-rose-500",
  "from-blue-400 to-indigo-500", "from-amber-400 to-orange-500",
  "from-pink-400 to-purple-500", "from-cyan-400 to-blue-500",
  "from-lime-400 to-green-500", "from-rose-400 to-pink-500",
  "from-violet-400 to-indigo-500", "from-teal-400 to-cyan-500",
];

const EMOJIS = {
  "dairy": "🥛", "bakery": "🍞", "beverages": "🥤", "snacks": "🍿",
  "grains": "🌾", "spices": "🌶️", "fruits": "🍎", "vegetables": "🥬",
  "meat": "🍗", "frozen": "🧊", "cleaning": "🧹", "personal care": "🧴",
  "household": "🏠", "soft drinks": "🥤", "juices": "🧃", "oils": "🫒",
  "condiments": "🍯", "confectionery": "🍫", "pet": "🐾", "baby": "👶",
};

export default function ProductImage({ product, className = "", size = "md", showBadge = false }) {
  const [phase, setPhase] = useState("init");

  const gradientIdx = useMemo(() => {
    if (!product) return 0;
    return hashCode(String(product.product_id || product.name || "")) % GRADIENTS.length;
  }, [product]);

  const emoji = useMemo(() => {
    const cat = (product?.category?.name || "").toLowerCase();
    for (const [k, v] of Object.entries(EMOJIS)) { if (cat.includes(k)) return v; }
    return "🛒";
  }, [product]);

  const keyword = useMemo(() => getProductKeyword(product), [product]);

  const sources = useMemo(() => {
    const list = [];
    if (product?.image_url) list.push(`${API_BASE}${product.image_url}`);
    const seed = (product?.name || "item").replace(/\s+/g, "-").toLowerCase();
    list.push(`https://placehold.co/400x400/${encodeURIComponent(hashCode(seed).toString(16).slice(0, 6))}/ffffff?text=${encodeURIComponent((product?.name || "P").slice(0, 12))}`);
    return list;
  }, [product]);

  const srcIdx = Math.max(0, sources.indexOf(
    sources.find((s) => {
      if (phase === "init") return true;
      if (phase === "tried0") return sources.length > 1;
      return false;
    })
  ));

  const currentSrc = phase === "fallback" ? null : sources[phase === "init" ? 0 : phase === "tried0" ? 1 : 0];

  const handleError = () => {
    if (phase === "init") setPhase("tried0");
    else setPhase("fallback");
  };

  const discount = product?.mrp && product?.selling_price && product.mrp > product.selling_price
    ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) : 0;

  const sizeClass = { sm: "w-14 h-14", md: "w-full aspect-square", lg: "w-full aspect-square", cart: "w-16 h-16" }[size];
  const emojiSize = { sm: "text-2xl", md: "text-4xl", lg: "text-5xl", cart: "text-3xl" }[size];

  return (
    <div className={`relative overflow-hidden ${sizeClass} ${className}`}>
      {currentSrc ? (
        <img
          key={currentSrc}
          src={currentSrc}
          alt={product?.name || "Product"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={handleError}
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${GRADIENTS[gradientIdx]} flex flex-col items-center justify-center`}>
          <span className={`${emojiSize} mb-1 drop-shadow-sm`}>{emoji}</span>
          {size !== "sm" && size !== "cart" && (
            <p className="text-white/80 text-[10px] font-medium text-center px-2 leading-tight max-w-[80%] truncate">
              {product?.name || "Product"}
            </p>
          )}
        </div>
      )}
      {showBadge && discount > 0 && phase !== "fallback" && (
        <div className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-10">
          -{discount}%
        </div>
      )}
    </div>
  );
}
