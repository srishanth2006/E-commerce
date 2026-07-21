/**
 * pages/Home.jsx
 * ---------------
 * Landing page for the customer storefront with hero, categories,
 * offers, featured products, services, reviews, and footer.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart, Heart, Truck, Shield, Headphones, Clock,
  Star, Phone, Mail, MapPin, ShoppingBag, ArrowRight, Tag,
  Facebook, Twitter, Instagram, Youtube, Send
} from "lucide-react";
import toast from "react-hot-toast";
import { getCategories, getProducts, addToCart, addToWishlist } from "../api/endpoints";
import ProductImage from "../components/ProductImage";

const categoryGradients = [
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-rose-500",
  "from-violet-400 to-purple-500",
  "from-sky-400 to-blue-500",
  "from-amber-400 to-orange-500",
  "from-pink-400 to-red-500",
  "from-cyan-400 to-teal-500",
  "from-lime-400 to-green-500",
];

const reviews = [
  { name: "Priya S.", text: "Excellent store! Fresh vegetables and fast delivery every time.", stars: 5 },
  { name: "Rahul M.", text: "Great prices and the app is super easy to use. Highly recommended!", stars: 5 },
  { name: "Anjali K.", text: "Love the variety. My go-to store for all household needs.", stars: 4 },
  { name: "Vikram D.", text: "Quick delivery and the customer support is very responsive.", stars: 5 },
];

function useFadeIn() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function FadeIn({ children, className = "", delay = 0 }) {
  const [ref, visible] = useFadeIn();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function SkeletonPulse({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700/60 ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800 p-3">
      <SkeletonPulse className="aspect-square rounded-xl mb-3" />
      <SkeletonPulse className="h-4 w-3/4 mb-2" />
      <SkeletonPulse className="h-3 w-1/2 mb-2" />
      <SkeletonPulse className="h-6 w-1/3 mb-3" />
      <div className="flex gap-2">
        <SkeletonPulse className="h-8 flex-1 rounded-lg" />
        <SkeletonPulse className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

function SkeletonCategory() {
  return (
    <div className="flex flex-col items-center gap-2 min-w-[80px]">
      <SkeletonPulse className="w-16 h-16 rounded-full" />
      <SkeletonPulse className="h-3 w-14 rounded" />
    </div>
  );
}

function SkeletonReview() {
  return (
    <div className="min-w-[280px] rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800 p-5 flex-shrink-0">
      <SkeletonPulse className="h-4 w-24 mb-3" />
      <SkeletonPulse className="h-3 w-full mb-2" />
      <SkeletonPulse className="h-3 w-4/5 mb-4" />
      <SkeletonPulse className="h-3 w-20" />
    </div>
  );
}

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [catRes, featRes, offerRes] = await Promise.all([
          getCategories(),
          getProducts({ is_active: true, limit: 8 }),
          getProducts({ is_active: true, discount_min: 1 }),
        ]);
        setCategories(catRes.data ?? []);
        setFeatured(featRes.data ?? []);
        setOffers(offerRes.data ?? []);
      } catch {
        toast.error("Failed to load page data");
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

  const offersScrollRef = useRef(null);
  const reviewsScrollRef = useRef(null);

  const scroll = useCallback((ref, dir) => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir * 300, behavior: "smooth" });
  }, []);

  return (
    <div className="space-y-0">

      {/* ─── Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-amber-500 text-white px-6 py-20 sm:py-28 text-center rounded-b-[3rem] md:rounded-b-[4rem]">
        {/* Animated floating shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-white/10 animate-bounce" style={{ animationDuration: "4s" }} />
          <div className="absolute top-1/3 -right-16 w-48 h-48 rounded-full bg-amber-300/20 animate-bounce" style={{ animationDuration: "5s", animationDelay: "1s" }} />
          <div className="absolute -bottom-10 left-1/4 w-56 h-56 rounded-full bg-white/10 animate-pulse" style={{ animationDuration: "3s" }} />
          <div className="absolute top-10 left-1/2 w-32 h-32 rounded-full bg-amber-200/15 animate-pulse" style={{ animationDuration: "4.5s" }} />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 rounded-full bg-white/10 animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "2s" }} />
          <div className="absolute top-2/3 left-[10%] w-20 h-20 rounded-full bg-amber-400/10 animate-pulse" style={{ animationDuration: "6s" }} />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
            Sri Provision
            <span className="block text-amber-200 text-3xl sm:text-4xl lg:text-5xl font-bold mt-2">Store</span>
          </h1>
          <p className="text-lg sm:text-xl opacity-90 mb-10 max-w-xl mx-auto leading-relaxed">
            Your one-stop shop for fresh groceries, daily essentials, and household needs &mdash; delivered to your doorstep.
          </p>
          <Link
            to="/shop"
            className="group inline-flex items-center gap-2 bg-white text-primary-700 font-bold rounded-xl px-10 py-4 text-lg hover:shadow-[0_0_40px_rgba(255,255,255,0.35)] transition-all duration-300 hover:scale-105"
          >
            <ShoppingCart size={22} className="transition-transform group-hover:-rotate-12" />
            Shop Now
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ─── Categories ───────────────────────────────── */}
      <FadeIn>
        <section className="px-4 sm:px-6 pt-16">
          <h2 className="text-2xl font-bold mb-8 dark:text-white">Popular Categories</h2>
          {loading ? (
            <div className="flex gap-6 overflow-hidden pb-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCategory key={i} />)}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No categories yet.</p>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
              {categories.slice(0, 8).map((cat, i) => (
                <Link
                  key={cat.category_id}
                  to="/shop"
                  className="group flex flex-col items-center gap-3 min-w-[90px] snap-center"
                >
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${categoryGradients[i % categoryGradients.length]} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                    <Tag size={26} className="text-white" />
                  </div>
                  <span className="text-sm font-medium truncate max-w-[90px] text-center dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </FadeIn>

      {/* ─── Today's Offers ───────────────────────────── */}
      {offers.length > 0 && (
        <FadeIn>
          <section className="py-16 bg-gray-50/80 dark:bg-gray-900/50 rounded-3xl mx-2 sm:mx-4 my-4">
            <div className="px-4 sm:px-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold dark:text-white flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40">
                    <Tag size={22} className="text-red-500" />
                  </span>
                  Today&apos;s Offers
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => scroll(offersScrollRef, -1)} className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400">
                    <ArrowRight size={16} className="rotate-180" />
                  </button>
                  <button onClick={() => scroll(offersScrollRef, 1)} className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400">
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <div ref={offersScrollRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {offers.slice(0, 10).map((p) => (
                  <ProductCard key={p.product_id} product={p} onAddToCart={handleAddToCart} onAddToWishlist={handleAddToWishlist} />
                ))}
              </div>
            </div>
          </section>
        </FadeIn>
      )}

      {/* ─── Featured Products ────────────────────────── */}
      <FadeIn>
        <section className="px-4 sm:px-6 py-16">
          <h2 className="text-2xl font-bold mb-8 dark:text-white">Featured Products</h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.slice(0, 8).map((p, i) => (
                <FadeIn key={p.product_id} delay={i * 60}>
                  <ProductCard product={p} onAddToCart={handleAddToCart} onAddToWishlist={handleAddToWishlist} />
                </FadeIn>
              ))}
            </div>
          )}
        </section>
      </FadeIn>

      {/* ─── Why Shop With Us ─────────────────────────── */}
      <FadeIn>
        <section className="py-16 bg-gradient-to-b from-primary-50/80 to-transparent dark:from-primary-950/30 dark:to-transparent rounded-3xl mx-2 sm:mx-4 my-4">
          <div className="px-4 sm:px-6">
            <h2 className="text-2xl font-bold mb-10 dark:text-white text-center">Why Shop With Us?</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { icon: Truck, title: "Free Delivery", desc: "On orders above ₹500", color: "from-emerald-400 to-teal-500" },
                { icon: ShoppingBag, title: "Fresh Products", desc: "Quality guaranteed", color: "from-amber-400 to-orange-500" },
                { icon: Shield, title: "Easy Returns", desc: "7-day return policy", color: "from-violet-400 to-purple-500" },
                { icon: Headphones, title: "24/7 Support", desc: "We're always here for you", color: "from-rose-400 to-pink-500" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="group flex flex-col items-center text-center gap-4 p-6 sm:p-8 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    <s.icon size={26} className="text-white" />
                  </div>
                  <h3 className="font-bold text-base dark:text-white">{s.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ─── Reviews ──────────────────────────────────── */}
      <FadeIn>
        <section className="py-16">
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold dark:text-white">What Our Customers Say</h2>
              <div className="flex gap-2">
                <button onClick={() => scroll(reviewsScrollRef, -1)} className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400">
                  <ArrowRight size={16} className="rotate-180" />
                </button>
                <button onClick={() => scroll(reviewsScrollRef, 1)} className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400">
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
          <div ref={reviewsScrollRef} className="flex gap-5 overflow-x-auto px-4 sm:px-6 pb-4 scrollbar-hide snap-x snap-mandatory">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonReview key={i} />)
              : reviews.map((r, i) => (
                  <div
                    key={i}
                    className="relative min-w-[280px] sm:min-w-[320px] flex-shrink-0 bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow duration-300 snap-center"
                  >
                    <span className="absolute top-4 right-5 text-6xl font-serif text-primary-200 dark:text-primary-800/50 leading-none select-none pointer-events-none">&ldquo;</span>
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} size={16} className={j < r.stars ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"} />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-5 leading-relaxed pr-4 relative z-10">{r.text}</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {r.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold dark:text-gray-200">{r.name}</span>
                    </div>
                  </div>
                ))}
          </div>
        </section>
      </FadeIn>

      {/* ─── Footer ───────────────────────────────────── */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-300 rounded-t-[3rem] mt-8 pt-14 pb-8">
        <div className="px-6 sm:px-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div>
              <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                <ShoppingBag size={22} className="text-amber-400" />
                Sri Provision Store
              </h3>
              <p className="text-sm leading-relaxed mb-6">
                Your trusted neighbourhood provision store, now online. Fresh products, great prices, delivered to your door.
              </p>
              <div className="flex gap-3">
                {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors duration-200">
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2.5 text-sm">
                {[["Shop", "/shop"], ["My Orders", "/orders"], ["Wishlist", "/wishlist"], ["My Account", "/profile"]].map(([label, to]) => (
                  <li key={to}>
                    <Link to={to} className="hover:text-white hover:pl-1 transition-all">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2"><Phone size={14} className="text-amber-400 flex-shrink-0" /> +91 98765 43210</li>
                <li className="flex items-center gap-2"><Mail size={14} className="text-amber-400 flex-shrink-0" /> support@sriprovision.in</li>
                <li className="flex items-center gap-2"><MapPin size={14} className="text-amber-400 flex-shrink-0" /> 123 Main Road, Chennai</li>
              </ul>
            </div>
            {/* Newsletter */}
            <div>
              <h4 className="text-white font-semibold mb-4">Stay Updated</h4>
              <p className="text-sm mb-4">Subscribe for deals, new arrivals, and more.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button className="bg-primary-600 hover:bg-primary-500 text-white rounded-lg px-4 py-2.5 transition-colors flex items-center justify-center">
                  <Send size={16} />
                </button>
              </div>
              <div className="mt-4">
                <h4 className="text-white font-semibold mb-2 text-sm">Store Hours</h4>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li className="flex items-center gap-2"><Clock size={12} /> Mon-Sat: 8 AM - 10 PM</li>
                  <li className="flex items-center gap-2"><Clock size={12} /> Sunday: 9 AM - 9 PM</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Sri Provision Store. All rights reserved.</p>
            <p className="flex items-center gap-1">Made with <Heart size={14} className="text-red-500 fill-red-500" /> for your neighbourhood</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Product Card (shared by Offers & Featured) ─── */
function ProductCard({ product: p, onAddToCart, onAddToWishlist }) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 snap-center min-w-[200px] flex-shrink-0">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <ProductImage product={p} size="lg" />
        {/* Discount badge */}
        {p.discount > 0 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg">
            -{p.discount}%
          </span>
        )}
        {/* Wishlist */}
        <button
          onClick={(e) => { e.stopPropagation(); onAddToWishlist(p.product_id); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white dark:hover:bg-gray-700 hover:scale-110 shadow-sm"
        >
          <Heart size={14} className="text-gray-500 hover:text-red-500 transition-colors" />
        </button>
        {/* Slide-up Add to Cart */}
        <div className="absolute bottom-0 inset-x-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(p.product_id); }}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 flex items-center justify-center gap-2 transition-colors"
          >
            <ShoppingCart size={16} />
            Add to Cart
          </button>
        </div>
      </div>
      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-sm font-semibold truncate dark:text-white">{p.name}</p>
        {p.category?.name && (
          <p className="text-xs text-gray-400 mt-0.5">{p.category.name}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="font-bold text-primary-600 dark:text-primary-400 text-base">
            ₹{(p.selling_price ?? 0).toFixed(0)}
          </span>
          {p.mrp > (p.selling_price ?? 0) && (
            <span className="text-xs text-gray-400 line-through">₹{p.mrp.toFixed(0)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
