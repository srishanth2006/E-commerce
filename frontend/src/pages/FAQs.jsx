/**
 * pages/FAQs.jsx
 * ---------------
 * Frequently asked questions with accordion expand/collapse.
 */
import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const faqData = [
  {
    q: "How do I place an order?",
    a: "Browse products in the Shop page, add items to your cart, and proceed to Checkout. You can choose delivery or takeaway and pay via Cash on Delivery or UPI.",
  },
  {
    q: "What are the delivery charges?",
    a: "Delivery is free on orders above ₹500. For smaller orders, a flat delivery fee of ₹40 applies.",
  },
  {
    q: "How long does delivery take?",
    a: "Orders are typically delivered within 2-4 hours for in-stock items. You can track your order status from the My Orders page.",
  },
  {
    q: "What is your return policy?",
    a: "We offer a 7-day return policy on most items. If you receive a damaged or incorrect product, contact our support team and we'll arrange a replacement or refund.",
  },
  {
    q: "How can I pay for my order?",
    a: "We accept Cash on Delivery (COD), UPI payments (Google Pay, PhonePe, etc.), and online payments via Razorpay.",
  },
  {
    q: "Can I modify or cancel my order?",
    a: "You can cancel an order before it is dispatched. Once dispatched, modification is not possible. Please contact support for assistance.",
  },
  {
    q: "How do I use a coupon code?",
    a: "At checkout, enter your coupon code in the 'Coupon Code' section and click 'Validate'. The discount will be applied to your order total.",
  },
  {
    q: "Is my personal information secure?",
    a: "Yes, we take your privacy seriously. All data is encrypted and stored securely. We never share your information with third parties without your consent.",
  },
  {
    q: "Do you offer bulk or wholesale orders?",
    a: "Yes! For bulk orders, please contact us directly via the Contact page or call us at +91 98765 43210. We offer special pricing for large orders.",
  },
  {
    q: "How do I track my order?",
    a: "After placing an order, go to the My Orders page to view the status of your order in real-time.",
  },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
      >
        <span className="font-medium dark:text-white pr-4">{item.q}</span>
        <ChevronDown
          size={18}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t dark:border-gray-700 pt-3">
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function FAQs() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <section className="text-center py-6">
        <h1 className="text-3xl font-extrabold dark:text-white mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-500 dark:text-gray-400">Find quick answers to common questions about our store.</p>
      </section>

      <div className="space-y-3">
        {faqData.map((item, i) => (
          <FaqItem key={i} item={item} />
        ))}
      </div>

      <section className="card text-center space-y-3">
        <MessageCircle size={32} className="mx-auto text-primary-600" />
        <h2 className="font-bold dark:text-white">Still have questions?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Our support team is happy to help.
        </p>
        <Link to="/contact" className="btn-primary inline-flex">
          Contact Support
        </Link>
      </section>
    </div>
  );
}
