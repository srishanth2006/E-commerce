import { useState } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle, MessageCircle, Phone, Mail, ChevronDown, ChevronUp,
  Package, Truck, CreditCard, RotateCcw, Search, Send, Clock,
  MapPin, Headphones, ArrowRight, CheckCircle, Hash, MessageSquare
} from "lucide-react";
import toast from "react-hot-toast";
import { createSupportTicket, trackSupportTicket } from "../api/endpoints";

const FAQ_DATA = [
  {
    cat: "Orders",
    icon: <Package size={18} />,
    items: [
      { q: "How do I track my order?", a: "Go to My Orders page to see real-time status updates. You'll see whether your order is placed, confirmed, packed, out for delivery, or delivered." },
      { q: "Can I cancel my order?", a: "Yes, you can cancel orders within 30 minutes of placing them. Go to My Orders, click on the order, and use the Cancel button. For UPI orders, refund details will be collected." },
      { q: "What if I receive a wrong item?", a: "Contact our help desk immediately. We'll arrange a replacement or refund within 24 hours." },
    ],
  },
  {
    cat: "Delivery",
    icon: <Truck size={18} />,
    items: [
      { q: "What are the delivery charges?", a: "Orders above ₹500 get free delivery. Orders ₹200–₹499 have a ₹20 delivery fee. Orders below ₹200 have a ₹40 delivery fee." },
      { q: "How long does delivery take?", a: "Standard delivery takes 30–90 minutes depending on order size and current demand. You'll see an estimated time when you place your order." },
      { q: "Do you deliver to my area?", a: "We currently deliver within 10 km of our store. Enter your pincode at checkout to check availability." },
    ],
  },
  {
    cat: "Payments",
    icon: <CreditCard size={18} />,
    items: [
      { q: "What payment methods do you accept?", a: "We accept Cash on Delivery (COD), UPI payments, and online payments via Razorpay." },
      { q: "How do I pay via UPI?", a: "Select UPI at checkout. You'll see a QR code and our UPI ID. Scan and pay, then enter the UTR number to confirm. Your order is confirmed instantly." },
      { q: "What if my UPI payment fails?", a: "If payment fails, your order won't be placed. Try again or use a different payment method. No money will be deducted." },
    ],
  },
  {
    cat: "Returns & Refunds",
    icon: <RotateCcw size={18} />,
    items: [
      { q: "What is your return policy?", a: "You can cancel orders within 30 minutes. For delivered orders with issues, contact support within 24 hours for resolution." },
      { q: "How long does a refund take?", a: "UPI refunds are processed within 24–48 hours after admin confirmation. COD orders don't involve online payments." },
      { q: "Can I get a partial refund?", a: "Yes, if only some items in your order have issues, we'll process a partial refund for those items." },
    ],
  },
];

const CONTACT_OPTIONS = [
  { icon: <Phone size={20} />, label: "Call Us", value: "+91 98765 43210", href: "tel:+919876543210", color: "bg-green-500" },
  { icon: <MessageCircle size={20} />, label: "WhatsApp", value: "Chat on WhatsApp", href: "https://wa.me/919876543210", color: "bg-emerald-500" },
  { icon: <Mail size={20} />, label: "Email", value: "support@ecommerce.in", href: "mailto:support@ecommerce.in", color: "bg-blue-500" },
];

const STATUS_LABELS = {
  open: { text: "Open", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  in_progress: { text: "In Progress", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  resolved: { text: "Resolved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  closed: { text: "Closed", color: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
};

export default function HelpDesk() {
  const [openFaq, setOpenFaq] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [issueForm, setIssueForm] = useState({ name: "", email: "", subject: "", message: "", orderId: "" });
  const [sending, setSending] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  const [trackId, setTrackId] = useState("");
  const [trackEmail, setTrackEmail] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackedTicket, setTrackedTicket] = useState(null);

  const filteredFaqs = FAQ_DATA.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        !searchTerm ||
        item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.a.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.name || !issueForm.message) {
      toast.error("Please fill in your name and message");
      return;
    }
    setSending(true);
    try {
      const res = await createSupportTicket({
        name: issueForm.name,
        email: issueForm.email || undefined,
        order_id: issueForm.orderId || undefined,
        subject: issueForm.subject || undefined,
        message: issueForm.message,
      });
      setSubmittedTicket(res.data);
      toast.success("Issue submitted! Our team will respond within 24 hours.");
      setIssueForm({ name: "", email: "", subject: "", message: "", orderId: "" });
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackId) return toast.error("Please enter your ticket ID");
    setTracking(true);
    try {
      const res = await trackSupportTicket(trackId, trackEmail);
      setTrackedTicket(res.data);
    } catch {
      toast.error("Ticket not found. Check your ticket ID and email.");
      setTrackedTicket(null);
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30">
          <Headphones size={32} className="text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">Help Desk</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
          Have a question or issue? We're here to help. Browse FAQs or contact us directly.
        </p>
      </section>

      {/* Quick Contact */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CONTACT_OPTIONS.map((opt) => (
            <a
              key={opt.label}
              href={opt.href}
              target={opt.href.startsWith("http") ? "_blank" : undefined}
              rel={opt.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="card flex items-center gap-4 p-5 hover:shadow-lg dark:hover:shadow-emerald-900/10 transition-all duration-200 group"
            >
              <div className={`${opt.color} text-white p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                {opt.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{opt.value}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Track My Ticket */}
      <section className="card p-6 sm:p-8 border-2 border-dashed border-primary-200 dark:border-primary-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <Hash size={20} className="text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Track My Ticket</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Check the status and reply to your support query</p>
          </div>
        </div>

        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ticket ID</label>
            <input
              className="input"
              placeholder="e.g. 5"
              type="number"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email (optional)</label>
            <input
              className="input"
              placeholder="your@email.com"
              type="email"
              value={trackEmail}
              onChange={(e) => setTrackEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={tracking}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {tracking ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search size={14} />
            )}
            Track
          </button>
        </form>

        {/* Tracked ticket result */}
        {trackedTicket && (
          <div className="mt-6 space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white">Ticket #{trackedTicket.id}</span>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${(STATUS_LABELS[trackedTicket.status] || STATUS_LABELS.open).color}`}>
                    {(STATUS_LABELS[trackedTicket.status] || STATUS_LABELS.open).text}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{new Date(trackedTicket.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject: {trackedTicket.subject || "No subject"}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{trackedTicket.message}</p>
            </div>

            {/* Admin Reply */}
            {trackedTicket.admin_reply ? (
              <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={16} className="text-primary-600" />
                  <span className="text-sm font-semibold text-primary-700 dark:text-primary-400">Admin Reply</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {trackedTicket.admin_reply}
                </p>
                {trackedTicket.updated_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    Replied on {new Date(trackedTicket.updated_at).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
                <Clock size={18} className="text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  No reply yet. Our team typically responds within 24 hours.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Submit success card */}
      {submittedTicket && (
        <section className="card p-6 sm:p-8 bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-800 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30 shrink-0">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-800 dark:text-green-300">Issue Submitted Successfully!</h3>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                Your ticket ID is <span className="font-bold text-green-900 dark:text-green-200">#{submittedTicket.id}</span>.
                Save this ID to track your query later.
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                Our team will respond within 24 hours. You can track the status using the "Track My Ticket" section above.
              </p>
              <button
                onClick={() => { setTrackId(String(submittedTicket.id)); setTrackEmail(submittedTicket.email || ""); setTrackedTicket(submittedTicket); setSubmittedTicket(null); }}
                className="mt-3 text-sm font-medium text-green-700 dark:text-green-300 hover:underline flex items-center gap-1"
              >
                View your ticket <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Store Hours */}
      <section className="card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex items-center gap-3 text-primary-600">
          <Clock size={24} />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Store Hours</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Mon–Sat: 8 AM – 10 PM | Sun: 9 AM – 9 PM</p>
          </div>
        </div>
        <div className="hidden sm:block w-px h-10 bg-gray-200 dark:bg-gray-700" />
        <div className="flex items-center gap-3 text-primary-600">
          <MapPin size={24} />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Visit Us</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">123 Main Road, Chennai</p>
          </div>
        </div>
      </section>

      {/* FAQ Search */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h2>
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-6">
          {filteredFaqs.map((cat) => (
            <div key={cat.cat}>
              <div className="flex items-center gap-2 mb-3 text-primary-600">
                {cat.icon}
                <h3 className="font-semibold text-gray-900 dark:text-white">{cat.cat}</h3>
              </div>
              <div className="space-y-2">
                {cat.items.map((item, i) => {
                  const isOpen = openFaq === `${cat.cat}-${i}`;
                  return (
                    <div key={i} className="card overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : `${cat.cat}-${i}`)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <span className="font-medium text-sm text-gray-900 dark:text-white pr-4">{item.q}</span>
                        {isOpen ? (
                          <ChevronUp size={16} className="text-gray-400 shrink-0" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-3">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredFaqs.length === 0 && (
            <p className="text-center text-gray-400 py-8">No matching questions found. Try a different search term.</p>
          )}
        </div>
      </section>

      {/* Submit Issue Form */}
      <section className="card p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Report an Issue</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Fill out the form below and our team will get back to you within 24 hours.
        </p>
        <form onSubmit={handleSubmitIssue} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Your Name *</label>
              <input
                className="input"
                placeholder="Enter your name"
                value={issueForm.name}
                onChange={(e) => setIssueForm({ ...issueForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={issueForm.email}
                onChange={(e) => setIssueForm({ ...issueForm, email: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Order ID (if applicable)</label>
              <input
                className="input"
                placeholder="e.g. #1234"
                value={issueForm.orderId}
                onChange={(e) => setIssueForm({ ...issueForm, orderId: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subject</label>
              <select
                className="input"
                value={issueForm.subject}
                onChange={(e) => setIssueForm({ ...issueForm, subject: e.target.value })}
              >
                <option value="">Select a topic</option>
                <option value="order">Order Issue</option>
                <option value="delivery">Delivery Problem</option>
                <option value="payment">Payment Issue</option>
                <option value="product">Product Quality</option>
                <option value="refund">Refund Request</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Message *</label>
            <textarea
              className="input min-h-[120px] resize-y"
              placeholder="Describe your issue in detail..."
              value={issueForm.message}
              onChange={(e) => setIssueForm({ ...issueForm, message: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending}
              className="btn-primary flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Submit Issue
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Quick Links */}
      <section className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Looking for something else?</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/orders" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <Package size={14} /> My Orders
          </Link>
          <Link to="/faqs" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <HelpCircle size={14} /> All FAQs
          </Link>
          <Link to="/contact" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <Mail size={14} /> Contact Page
          </Link>
        </div>
      </section>
    </div>
  );
}
