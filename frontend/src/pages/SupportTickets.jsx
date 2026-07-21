import { useEffect, useState } from "react";
import {
  Headphones, Clock, CheckCircle, MessageCircle, Send, Trash2,
  Filter, User, Mail, Package, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getSupportTickets, replyToTicket, updateTicketStatus, deleteSupportTicket
} from "../api/endpoints";
import { useNotifications } from "../context/NotificationContext";
import Loader from "../components/Loader";

const STATUS_MAP = {
  open: { label: "Open", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400", icon: CheckCircle },
};

export default function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const { latestNotification, addRefreshListener } = useNotifications();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSupportTickets(filter || undefined);
      setTickets(res.data ?? []);
    } catch {
      toast.error("Failed to load tickets");
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

  const handleReply = async (ticketId) => {
    if (!reply.trim()) return toast.error("Please write a reply");
    setReplying(true);
    try {
      await replyToTicket(ticketId, { admin_reply: reply, status: "in_progress" });
      toast.success("Reply sent");
      setReply("");
      setSelected(null);
      load();
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await updateTicketStatus(ticketId, newStatus);
      toast.success(`Ticket marked as ${newStatus}`);
      load();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (ticketId) => {
    if (!window.confirm("Delete this ticket?")) return;
    try {
      await deleteSupportTicket(ticketId);
      toast.success("Ticket deleted");
      if (selected?.id === ticketId) setSelected(null);
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;

  if (loading && tickets.length === 0) return <Loader fullPage label="Loading tickets..." />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Headphones size={20} /> Support Tickets
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Customer queries from Help Desk
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
            {openCount} Open
          </span>
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
            {inProgressCount} In Progress
          </span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-gray-400" />
        {["", "open", "in_progress", "resolved", "closed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === f
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {f === "" ? "All" : STATUS_MAP[f]?.label}
          </button>
        ))}
      </div>

      {/* Tickets list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* List */}
        <div className={`space-y-2 ${selected ? "lg:col-span-2" : "lg:col-span-5"}`}>
          {tickets.length === 0 ? (
            <div className="card p-10 text-center">
              <Headphones size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-400">No tickets found.</p>
            </div>
          ) : (
            tickets.map((t) => {
              const st = STATUS_MAP[t.status] || STATUS_MAP.open;
              const Icon = st.icon;
              const isActive = selected?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => { setSelected(isActive ? null : t); setReply(""); }}
                  className={`card p-4 cursor-pointer transition-all duration-200 ${
                    isActive
                      ? "ring-2 ring-primary-500 shadow-md"
                      : "hover:shadow-md dark:hover:shadow-emerald-900/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${st.color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">
                            #{t.id} — {t.name}
                          </span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                          {t.subject || "No subject"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{t.message}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          {t.email && <span className="flex items-center gap-1"><Mail size={10} />{t.email}</span>}
                          {t.order_id && <span className="flex items-center gap-1"><Package size={10} />#{t.order_id}</span>}
                          <span>{new Date(t.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    {isActive ? <ChevronUp size={16} className="text-gray-400 shrink-0 mt-1" /> : <ChevronDown size={16} className="text-gray-400 shrink-0 mt-1" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="lg:col-span-3 card p-5 space-y-4 sticky top-20 self-start">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Ticket #{selected.id}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${(STATUS_MAP[selected.status] || STATUS_MAP.open).color}`}>
                    {(STATUS_MAP[selected.status] || STATUS_MAP.open).label}
                  </span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Submitted {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(selected.id)}
                className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                title="Delete ticket"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Customer info */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">{selected.name}</span>
              </div>
              {selected.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{selected.email}</span>
                </div>
              )}
              {selected.order_id && (
                <div className="flex items-center gap-2 text-sm">
                  <Package size={14} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Order #{selected.order_id}</span>
                </div>
              )}
            </div>

            {/* Subject + message */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Subject</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selected.subject || "No subject"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Message</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                {selected.message}
              </p>
            </div>

            {/* Admin reply (if any) */}
            {selected.admin_reply && (
              <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
                <p className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-1 flex items-center gap-1">
                  <MessageCircle size={12} /> Admin Reply
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selected.admin_reply}</p>
              </div>
            )}

            {/* Status buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Set status:</span>
              {Object.entries(STATUS_MAP).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(selected.id, key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    selected.status === key
                      ? `${val.color} ring-1 ring-current`
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>

            {/* Reply form */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Reply to customer</label>
              <textarea
                className="input min-h-[80px] resize-y mb-2"
                placeholder="Type your reply..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  onClick={() => handleReply(selected.id)}
                  disabled={replying || !reply.trim()}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  {replying ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
