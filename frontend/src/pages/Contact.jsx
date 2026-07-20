/**
 * pages/Contact.jsx
 * ------------------
 * Contact page with form, store details, and map placeholder.
 */
import { useState } from "react";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import toast from "react-hot-toast";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="text-center py-6">
        <h1 className="text-3xl font-extrabold dark:text-white mb-2">Contact Us</h1>
        <p className="text-gray-500 dark:text-gray-400">We&apos;d love to hear from you. Reach out anytime!</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="card">
          <h2 className="text-lg font-bold dark:text-white mb-4">Send a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" name="name" value={form.name} onChange={handleChange} placeholder="Your name" required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="label">Message *</label>
              <textarea className="input min-h-[120px]" name="message" value={form.message} onChange={handleChange} placeholder="How can we help you?" required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              <Send size={16} />
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-bold dark:text-white mb-4">Store Information</h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-primary-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium dark:text-white">Address</p>
                  <p className="text-gray-500 dark:text-gray-400">123 Main Road, T. Nagar, Chennai, Tamil Nadu &ndash; 600017</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={18} className="text-primary-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium dark:text-white">Phone</p>
                  <p className="text-gray-500 dark:text-gray-400">+91 98765 43210</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-primary-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium dark:text-white">Email</p>
                  <p className="text-gray-500 dark:text-gray-400">support@sriprovision.in</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-primary-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium dark:text-white">Business Hours</p>
                  <p className="text-gray-500 dark:text-gray-400">Mon-Sat: 8 AM &ndash; 10 PM</p>
                  <p className="text-gray-500 dark:text-gray-400">Sunday: 9 AM &ndash; 9 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="card">
            <h2 className="text-lg font-bold dark:text-white mb-4">Find Us</h2>
            <div className="rounded-lg bg-gray-200 dark:bg-gray-700 h-56 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MapPin size={40} className="mx-auto mb-2" />
                <p>Map coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
