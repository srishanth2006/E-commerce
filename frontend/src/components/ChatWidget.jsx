/**
 * components/ChatWidget.jsx
 * ----------------------------
 * MODULE 13 - AI CHATBOT
 * A small floating chat bubble available on every page. Uses rule-based
 * DB-backed answers on the backend (with optional Ollama passthrough for
 * anything unrecognized - see backend/app/routers/chatbot.py).
 */
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { sendChatMessage } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

function makeSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatWidget() {
  const { userType } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionId] = useState(makeSessionId);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        userType === "staff"
          ? "Hi! Ask me things like \"Today's sales\", \"Low stock products\", or \"Best selling products\"."
          : "Hi! Ask me things like \"Where is Rice?\", \"Do you have Milk?\", or \"Show products below \u20b9100\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);

    try {
      const res = await sendChatMessage(sessionId, text, userType === "staff" ? "staff" : "customer");
      setMessages((m) => [...m, { role: "assistant", text: res.data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, I couldn't process that right now." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[28rem] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">
          <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={18} />
              <span className="font-semibold text-sm">Store Assistant</span>
            </div>
            <button onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary-600 text-white rounded-br-sm"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <input
              className="input flex-1 py-2"
              placeholder="Ask something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button onClick={handleSend} disabled={sending} className="btn-primary px-3 py-2">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 rounded-full bg-primary-600 text-white shadow-xl flex items-center justify-center hover:bg-primary-700 transition-colors"
        title="Chat with the store assistant"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
