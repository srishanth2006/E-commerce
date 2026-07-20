/**
 * pages/Home.jsx
 * ---------------
 * Landing page for the customer storefront with hero, categories,
 * offers, featured products, services, reviews, and footer.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart, Heart, Truck, Shield, Headphones, Clock,
  Star, Phone, Mail, MapPin, ShoppingBag, ArrowRight, Tag
} from "lucide-react";
import toast from "react-hot-toast";
import { getCategories, getProducts, addToCart, addToWishlist } from "../api/endpoints";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const reviews = [
  { name: "Priya S.", text: "Excellent store! Fresh vegetables and fast delivery every time.", stars: 5 },
  { name: "Rahul M.", text: "Great prices and the app is super easy to use. Highly recommended!", stars: 5 },
  { name: "Anjali K.", text: "Love the variety. My go-to store for all household needs.", stars: 4 },
  { name: "Vikram D.", text: "Quick delivery and the customer support is very responsive.", stars: 5 },
];

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

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-amber-500 text-white px-6 py-16 sm:py-24 text-center">
        <div className="absolute inset-0 opacity-10">
          <ShoppingBag size={300} className="absolute -top-10 -right-10" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold mb-4 relative z-10">E-commerce</h1>
        <p className="text-lg sm:text-xl opacity-90 mb-8 max-w-xl mx-auto relative z-10">
          Your one-stop shop for fresh groceries, daily essentials, and household needs &mdash; delivered to your doorstep.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold rounded-lg px-8 py-3 hover:bg-gray-100 transition relative z-10"
        >
          <ShoppingCart size={20} />
          Shop Now
          <ArrowRight size={18} />
        </Link>
      </section>

      {/* Popular Categories */}
      <section>
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Popular Categories</h2>
        {loading ? (
          <p className="text-gray-400 text-center py-8">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No categories yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat.category_id}
                to="/shop"
                className="card flex flex-col items-center gap-2 p-4 hover:shadow-md transition text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                  <Tag size={22} className="text-primary-600" />
                </div>
                <span className="text-sm font-medium truncate w-full">{cat.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Today's Offers */}
      {offers.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6 dark:text-white flex items-center gap-2">
            <Tag size={24} className="text-red-500" /> Today&apos;s Offers
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {offers.slice(0, 8).map((p) => (
              <div key={p.product_id} className="card p-3 flex flex-col">
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  {p.image_url ? (
                    <img src={`${API_BASE}${p.image_url}`} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingCart size={28} className="text-gray-300" />
                  )}
                </div>
                <p className="text-sm font-medium truncate">{p.name}</p>
                <div className="flex items-center gap-2 mt-1 mb-2">
                  <span className="font-bold text-primary-600">₹{(p.selling_price ?? 0).toFixed(0)}</span>
                  {p.mrp > (p.selling_price ?? 0) && (
                    <span className="text-xs text-gray-400 line-through">₹{p.mrp.toFixed(0)}</span>
                  )}
                  {p.discount > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 rounded px-1.5 py-0.5 font-medium">
                      -{p.discount}%
                    </span>
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
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section>
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Featured Products</h2>
        {loading ? (
          <p className="text-gray-400 text-center py-8">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.slice(0, 8).map((p) => (
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
            ))}
          </div>
        )}
      </section>

      {/* Services */}
      <section>
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Why Shop With Us?</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Truck size={28} />, title: "Free Delivery", desc: "On orders above ₹500" },
            { icon: <ShoppingBag size={28} />, title: "Fresh Products", desc: "Quality guaranteed" },
            { icon: <Shield size={28} />, title: "Easy Returns", desc: "7-day return policy" },
            { icon: <Headphones size={28} />, title: "24/7 Support", desc: "We're always here for you" },
          ].map((s, i) => (
            <div key={i} className="card flex flex-col items-center text-center gap-3 p-6">
              <div className="text-primary-600">{s.icon}</div>
              <h3 className="font-semibold dark:text-white">{s.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section>
        <h2 className="text-2xl font-bold mb-6 dark:text-white">What Our Customers Say</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map((r, i) => (
            <div key={i} className="card p-5">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} size={16} className={j < r.stars ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"} />
                ))}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">&ldquo;{r.text}&rdquo;</p>
              <p className="text-sm font-semibold">{r.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 rounded-2xl p-8 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <ShoppingBag size={20} className="text-amber-400" />
              E-commerce
            </h3>
            <p className="text-sm leading-relaxed">
              Your trusted neighbourhood provision store, now online. Fresh products, great prices, delivered to your door.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/shop" className="hover:text-white transition">Shop</Link></li>
              <li><Link to="/orders" className="hover:text-white transition">My Orders</Link></li>
              <li><Link to="/wishlist" className="hover:text-white transition">Wishlist</Link></li>
              <li><Link to="/profile" className="hover:text-white transition">My Account</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Contact Us</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Phone size={14} /> +91 98765 43210</li>
              <li className="flex items-center gap-2"><Mail size={14} /> support@sriprovision.in</li>
              <li className="flex items-center gap-2"><MapPin size={14} /> 123 Main Road, Chennai</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Store Hours</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Clock size={14} /> Mon-Sat: 8 AM - 10 PM</li>
              <li className="flex items-center gap-2"><Clock size={14} /> Sunday: 9 AM - 9 PM</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} E-commerce. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
