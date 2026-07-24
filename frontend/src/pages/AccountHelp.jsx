import { useState } from "react";
import { Link } from "react-router-dom";
import {
  UserX, Send, Search, Hash, Clock, MessageSquare,
  HelpCircle, ChevronDown, ChevronUp, ArrowRight, CheckCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { createSupportTicket, trackSupportTicket } from "../api/endpoints";

const LOGIN_FAQS = [
  { q: "I forgot my password", a: "Click the \"Report an Issue\" form below and describe your problem. Our team will help you reset your account access within 24 hours." },
  { q: "My account is locked", a: "Too many failed login attempts can temporarily lock your account. Submit a support ticket and we'll unlock it for you." },
  { q: "I can't remember my email", a: "Submit a support ticket with your name and phone number. Our team will look up your account and help you regain access." },
  { q: "I never received a verification email", a: "Check your spam folder first. If it's not there, submit a ticket and we'll resend the verification link." },
];

const STATUS_LABELS = {
  open: { text: "Open", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  in_progress: { text: "In Progress", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  resolved: { text: "Resolved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  closed: { text: "Closed", color: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
};

export default function AccountHelp() {
  const [openFaq, setOpenFaq] = useState(null);

  const [issueForm, setIssueForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  const [trackId, setTrackId] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackedTicket, setTrackedTicket] = useState(null);

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.name || !issueForm.phone || !issueForm.message) {
      toast.error("Please fill in your name, phone number, and message");
      return;
    }
    setSending(true);
    try {
      const res = await createSupportTicket({
        name: issueForm.name,
        email: issueForm.email || undefined,
        phone: issueForm.phone || undefined,
        subject: "account_access",
        message: issueForm.message,
      });
      setSubmittedTicket(res.data);
      toast.success("Issue submitted! Our team will respond within 24 hours.");
      setIssueForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackId) return toast.error("Please enter your ticket number");
    setTracking(true);
    try {
      const res = await trackSupportTicket(trackId, "", trackPhone);
      setTrackedTicket(res.data);
    } catch {
      toast.error("Ticket not found. Check your ticket number and phone.");
      setTrackedTicket(null);
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30">
            <UserX size={32} className="text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">Account Help</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Trouble signing in? We'll help you get back into your account.
          </p>
        </div>

        {/* Login FAQs */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HelpCircle size={18} /> Common Login Issues
          </h2>
          {LOGIN_FAQS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} className="card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span className="font-medium text-sm text-gray-900 dark:text-white pr-4">{item.q}</span>
                  {isOpen ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
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

        {/* Track Ticket */}
        <div className="card p-5 border-2 border-dashed border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-2 mb-3">
            <Hash size={18} className="text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Track Your Ticket</h2>
          </div>
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ticket Number</label>
              <input className="input" placeholder="e.g. 5" type="number" value={trackId} onChange={(e) => setTrackId(e.target.value)} />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone Number</label>
              <input className="input" placeholder="Your phone number" type="tel" value={trackPhone} onChange={(e) => setTrackPhone(e.target.value)} />
            </div>
            <button type="submit" disabled={tracking} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              {tracking ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={14} />}
              Track
            </button>
          </form>

          {trackedTicket && (
            <div className="mt-5 space-y-3 animate-[fadeIn_0.3s_ease-out]">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">Ticket #{trackedTicket.id}</span>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${(STATUS_LABELS[trackedTicket.status] || STATUS_LABELS.open).color}`}>
                      {(STATUS_LABELS[trackedTicket.status] || STATUS_LABELS.open).text}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(trackedTicket.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{trackedTicket.message}</p>
              </div>
              {trackedTicket.admin_reply ? (
                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={14} className="text-primary-600" />
                    <span className="text-sm font-semibold text-primary-700 dark:text-primary-400">Admin Reply</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{trackedTicket.admin_reply}</p>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
                  <Clock size={16} className="text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">No reply yet. Our team typically responds within 24 hours.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Success */}
        {submittedTicket && (
          <div className="card p-6 bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-800 animate-[fadeIn_0.3s_ease-out]">
            <div className="text-center space-y-3">
              <CheckCircle size={40} className="text-green-600 mx-auto" />
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300">Issue Submitted!</h3>
              <p className="text-sm text-green-700 dark:text-green-400">
                Your ticket number is:
              </p>
              <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/40 rounded-xl px-5 py-3">
                <Hash size={20} className="text-green-700 dark:text-green-300" />
                <span className="text-2xl font-extrabold text-green-800 dark:text-green-200">#{submittedTicket.id}</span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-500">
                Save this ticket number to track your issue later.
                Our team will respond within 24 hours.
              </p>
              <button
                onClick={() => { setTrackId(String(submittedTicket.id)); setTrackPhone(submittedTicket.phone || ""); setTrackedTicket(submittedTicket); setSubmittedTicket(null); }}
                className="text-sm font-medium text-green-700 dark:text-green-300 hover:underline flex items-center gap-1 mx-auto"
              >
                View your ticket <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Report Issue Form */}
        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Report an Issue</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Describe your login problem and we'll help you regain access.
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
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="Your phone number"
                  value={issueForm.phone}
                  onChange={(e) => setIssueForm({ ...issueForm, phone: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email (optional)</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={issueForm.email}
                onChange={(e) => setIssueForm({ ...issueForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Describe your issue *</label>
              <textarea
                className="input min-h-[120px] resize-y"
                placeholder="e.g. I can't log in because I forgot my password and the email associated with my account is..."
                value={issueForm.message}
                onChange={(e) => setIssueForm({ ...issueForm, message: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={sending} className="btn-primary flex items-center gap-2">
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
        </div>

        {/* Back to login */}
        <div className="text-center">
          <Link to="/customer/login" className="text-sm text-primary-600 hover:underline font-medium">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
