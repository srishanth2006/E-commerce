/**
 * components/SupportTicketSidebar.jsx
 * -------------------------------------
 * A floating slide-out panel (right side) that lets staff reply to
 * support tickets without leaving their current page.
 * Triggered by the headphones button in the bottom-left corner.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Headphones, X, Send, Mail, Package, Clock, CheckCircle,
  AlertCircle, ChevronDown, ChevronUp, MessageCircle, Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getSupportTickets, replyToTicket, updateTicketStatus, deleteSupportTicket
} from "../api/endpoints";
import { useNotifications } from "../context/NotificationContext";

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
  in_progress: { label: "Replied", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400", icon: CheckCircle },
};

const QUICK_REPLIES = [
  "We are looking into this issue and will update you shortly.",
  "We apologize for the inconvenience. Your issue has been escalated.",
  "Your concern has been noted. Our team will contact you within 24 hours.",
  "The issue has been resolved. Please let us know if you need further assistance.",
];

export default function SupportTicketSidebar() {
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("open");
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const { latestNotification, addRefreshListener } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSupportTickets(filter || undefined);
      setTickets(res.data ?? []);
    } catch {
      // silent - panel is non-critical
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Load open count for badge even when panel is closed
  const loadOpenCount = useCallback(async () => {
    try {
      const res = await getSupportTickets("open");
      setTickets(res.data ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadOpenCount();
    const interval = setInterval(loadOpenCount, 30000);
    return () => clearInterval(interval);
  }, [loadOpenCount]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    return addRefreshListener(() => {
      loadOpenCount();
      if (open) load();
    });
  }, [addRefreshListener, open, load, loadOpenCount]);

  useEffect(() => {
    if (latestNotification) {
      loadOpenCount();
      if (open) load();
    }
  }, [latestNotification, open, load, loadOpenCount]);

  const handleReply = async (ticketId) => {
    if (!replyText.trim()) return toast.error("Please type a reply");
    setSending(true);
    try {
      await replyToTicket(ticketId, {
        admin_reply: replyText,
        status: "in_progress",
      });
      toast.success("Reply sent!");
      setReplyText("");
      setSelected(null);
      load();
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await updateTicketStatus(id, "resolved");
      toast.success("Marked as resolved");
      setSelected(null);
      load();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleClose = async (id) => {
    try {
      await updateTicketStatus(id, "closed");
      toast.success("Ticket closed");
      setSelected(null);
      load();
    } catch {
      toast.error("Failed to close");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSupportTicket(id);
      toast.success("Ticket deleted");
      if (selected?.id === id) setSelected(null);
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 sm:right-6 z-50 w-14 h-14 rounded-full bg-primary-600 text-white shadow-xl flex items-center justify-center hover:bg-primary-700 transition-colors"
        title="Support Tickets"
      >
        {open ? <X size={22} /> : <Headphones size={22} />}
        {!open && openCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {openCount > 9 ? "9+" : openCount}
          </span>
        )}
      </button>

      {/* Slide-out panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] z-50 bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-100 dark:border-gray-700 flex flex-col">
            {/* Header */}
            <div className="shrink-0 bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones size={18} />
                <span className="font-semibold text-sm">Support Tickets</span>
                {openCount > 0 && (
                  <span className="bg-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {openCount}
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition">
                <X size={18} />
              </button>
            </div>

            {/* Filters */}
            <div className="shrink-0 flex items-center gap-1.5 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
              {["open", "in_progress", "resolved", "closed", ""].map((f) => {
                const cfg = f ? STATUS_CONFIG[f] : null;
                return (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setSelected(null); setReplyText(""); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                      filter === f
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {cfg ? cfg.label : "All"}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading && tickets.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <Headphones size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No tickets found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {tickets.map((t) => {
                    const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
                    const Icon = st.icon;
                    const isActive = selected?.id === t.id;

                    return (
                      <div key={t.id}>
                        {/* Ticket row */}
                        <div
                          onClick={() => {
                            setSelected(isActive ? null : t);
                            setReplyText("");
                          }}
                          className={`px-4 py-3 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
                            isActive ? "bg-primary-50 dark:bg-primary-900/20" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${st.color}`}>
                              <Icon size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                  #{t.id} — {t.name}
                                </span>
                                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${st.color}`}>
                                  {st.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                                {t.subject || "No subject"}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{t.message}</p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                                {t.email && <span className="flex items-center gap-0.5"><Mail size={8} />{t.email}</span>}
                                {t.order_id && <span className="flex items-center gap-0.5"><Package size={8} />#{t.order_id}</span>}
                                <span className="flex items-center gap-0.5"><Clock size={8} />{new Date(t.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {isActive ? (
                              <ChevronUp size={14} className="text-gray-400 shrink-0 mt-1" />
                            ) : (
                              <ChevronDown size={14} className="text-gray-400 shrink-0 mt-1" />
                            )}
                          </div>
                        </div>

                        {/* Expanded reply panel */}
                        {isActive && (
                          <div className="px-4 pb-4 space-y-3 bg-gray-50 dark:bg-gray-700/20">
                            {/* Customer info */}
                            <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                {(t.name || "U")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 dark:text-white">{t.name}</p>
                                {t.email && <p className="text-[10px] text-gray-400">{t.email}</p>}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                                className="ml-auto p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition shrink-0"
                                title="Delete ticket"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            {/* Customer message */}
                            <div>
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Complaint</p>
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                                {t.subject && <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">Subject: {t.subject}</p>}
                                <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{t.message}</p>
                              </div>
                            </div>

                            {/* Previous admin reply */}
                            {t.admin_reply && (
                              <div>
                                <p className="text-[10px] font-medium text-primary-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                                  <MessageCircle size={10} /> Your Reply
                                </p>
                                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
                                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{t.admin_reply}</p>
                                </div>
                              </div>
                            )}

                            {/* Quick replies */}
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                              {QUICK_REPLIES.map((qr, i) => (
                                <button
                                  key={i}
                                  onClick={(e) => { e.stopPropagation(); setReplyText(qr); }}
                                  className="shrink-0 text-[10px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-300 transition"
                                >
                                  {qr.substring(0, 35)}...
                                </button>
                              ))}
                            </div>

                            {/* Reply textarea */}
                            <textarea
                              className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                              rows={3}
                              placeholder="Type your reply..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                  handleReply(t.id);
                                }
                              }}
                            />

                            {/* Action buttons */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {t.status !== "resolved" && t.status !== "closed" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleResolve(t.id); }}
                                    className="px-2 py-1.5 rounded-lg text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition flex items-center gap-1"
                                  >
                                    <CheckCircle size={10} /> Resolve
                                  </button>
                                )}
                                {t.status !== "closed" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleClose(t.id); }}
                                    className="px-2 py-1.5 rounded-lg text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                  >
                                    Close
                                  </button>
                                )}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReply(t.id); }}
                                disabled={sending || !replyText.trim()}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {sending ? (
                                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <Send size={12} />
                                )}
                                Reply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
