import { useEffect, useState } from "react";
import {
  MessageSquareReply, User, Mail, Package, Clock, CheckCircle,
  AlertCircle, Send, ChevronRight, Filter, Headphones, ArrowLeft
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getSupportTickets, replyToTicket, updateTicketStatus
} from "../api/endpoints";
import { useNotifications } from "../context/NotificationContext";
import Loader from "../components/Loader";

const STATUS_CONFIG = {
  open: { label: "Needs Reply", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", dot: "bg-red-500" },
  in_progress: { label: "Replied", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", dot: "bg-green-500" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400", dot: "bg-gray-400" },
};

const QUICK_REPLIES = [
  "We are looking into this issue and will update you shortly.",
  "We apologize for the inconvenience. Your issue has been escalated.",
  "Your concern has been noted. Our team will contact you within 24 hours.",
  "The issue has been resolved. Please let us know if you need further assistance.",
];

export default function CustomerComplaints() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const { latestNotification, addRefreshListener } = useNotifications();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSupportTickets(filter || undefined);
      setTickets(res.data ?? []);
    } catch {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    return addRefreshListener(() => load());
  }, [addRefreshListener]);

  useEffect(() => {
    if (latestNotification) load();
  }, [latestNotification]);

  const handleReply = async () => {
    if (!replyText.trim()) return toast.error("Please type a reply");
    setSending(true);
    try {
      await replyToTicket(selected.id, {
        admin_reply: replyText,
        status: "in_progress",
      });
      toast.success("Reply sent successfully!");
      setReplyText("");
      load();
      setSelected(null);
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  const handleResolve = async (id) => {
    try {
      await updateTicketStatus(id, "resolved");
      toast.success("Marked as resolved");
      load();
      setSelected(null);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleClose = async (id) => {
    try {
      await updateTicketStatus(id, "closed");
      toast.success("Ticket closed");
      load();
      setSelected(null);
    } catch {
      toast.error("Failed to close ticket");
    }
  };

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;

  if (loading && tickets.length === 0) return <Loader fullPage label="Loading complaints..." />;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
              <MessageSquareReply size={20} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Customer Complaints</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reply to customer queries and complaints</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {openCount} Pending
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
              {inProgressCount} Replied
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-3">
          <Filter size={14} className="text-gray-400" />
          {[
            { key: "open", label: "Needs Reply", badge: openCount },
            { key: "in_progress", label: "Replied", badge: inProgressCount },
            { key: "resolved", label: "Resolved" },
            { key: "closed", label: "Closed" },
            { key: "", label: "All" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setSelected(null); setReplyText(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                filter === f.key
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {f.label}
              {f.badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === f.key ? "bg-white/20" : "bg-gray-200 dark:bg-gray-700"
                }`}>
                  {f.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content: list + reply */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Complaints list */}
        <div className={`space-y-2 overflow-y-auto ${selected ? "lg:col-span-2" : "lg:col-span-5"}`}>
          {tickets.length === 0 ? (
            <div className="card p-10 text-center">
              <Headphones size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-400 font-medium">No complaints found</p>
              <p className="text-sm text-gray-400 mt-1">All caught up!</p>
            </div>
          ) : (
            tickets.map((t) => {
              const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
              const isActive = selected?.id === t.id;
              const needsReply = t.status === "open";

              return (
                <div
                  key={t.id}
                  onClick={() => { setSelected(isActive ? null : t); setReplyText(""); }}
                  className={`card p-4 cursor-pointer transition-all duration-200 ${
                    isActive
                      ? "ring-2 ring-primary-500 shadow-md"
                      : "hover:shadow-md dark:hover:shadow-emerald-900/10"
                  } ${needsReply ? "border-l-4 border-l-red-500" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
                          {(t.name || "U")[0].toUpperCase()}
                        </div>
                        {needsReply && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{t.name}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                          {t.subject || "No subject"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{t.message}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                          {t.email && <span className="flex items-center gap-1"><Mail size={10} />{t.email}</span>}
                          {t.order_id && <span className="flex items-center gap-1"><Package size={10} />#{t.order_id}</span>}
                          <span className="flex items-center gap-1"><Clock size={10} />{new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className={`shrink-0 mt-2 transition-transform ${isActive ? "rotate-90 text-primary-500" : "text-gray-300"}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reply panel */}
        {selected && (
          <div className="lg:col-span-3 flex flex-col overflow-hidden card">
            {/* Header */}
            <div className="shrink-0 p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setSelected(null); setReplyText(""); }}
                    className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Reply to {selected.name}
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${(STATUS_CONFIG[selected.status] || STATUS_CONFIG.open).color}`}>
                        {(STATUS_CONFIG[selected.status] || STATUS_CONFIG.open).label}
                      </span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Ticket #{selected.id} • {new Date(selected.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Customer info */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {(selected.name || "U")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{selected.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {selected.email && <span className="flex items-center gap-1"><Mail size={10} />{selected.email}</span>}
                    {selected.order_id && <span className="flex items-center gap-1"><Package size={10} />Order #{selected.order_id}</span>}
                  </div>
                </div>
              </div>

              {/* Customer's message */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Customer's Complaint</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                  {selected.subject && (
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Subject: {selected.subject}</p>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {selected.message}
                  </p>
                </div>
              </div>

              {/* Previous admin reply */}
              {selected.admin_reply && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary-600">Your Previous Reply</span>
                  </div>
                  <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {selected.admin_reply}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Reply area - fixed at bottom */}
            <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 p-5 space-y-3">
              {/* Quick replies */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] text-gray-400 shrink-0 uppercase font-medium">Quick:</span>
                {QUICK_REPLIES.map((qr, i) => (
                  <button
                    key={i}
                    onClick={() => setReplyText(qr)}
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-300 transition"
                  >
                    {qr.substring(0, 40)}...
                  </button>
                ))}
              </div>

              {/* Reply textarea */}
              <textarea
                className="input min-h-[80px] resize-y"
                placeholder="Type your reply to the customer..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleReply();
                  }
                }}
              />

              {/* Action buttons */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-400">
                  Press Ctrl+Enter to send
                </p>
                <div className="flex items-center gap-2">
                  {selected.status === "in_progress" && (
                    <button
                      onClick={() => handleResolve(selected.id)}
                      className="px-3 py-2 rounded-lg text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition flex items-center gap-1.5"
                    >
                      <CheckCircle size={14} />
                      Mark Resolved
                    </button>
                  )}
                  {(selected.status === "resolved" || selected.status === "in_progress") && (
                    <button
                      onClick={() => handleClose(selected.id)}
                      className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                      Close Ticket
                    </button>
                  )}
                  <button
                    onClick={handleReply}
                    disabled={sending || !replyText.trim()}
                    className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    {selected.admin_reply ? "Send Updated Reply" : "Send Reply"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
