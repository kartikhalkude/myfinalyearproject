import React, { useState, useEffect, useRef } from "react";
import apiClient from "../services/apiClient";
import websocketService from "../services/websocket";
import { useAuth } from "../contexts/AuthContext";
import { Send, X, MessageSquare, Loader } from "lucide-react";

export default function Chat({ appointmentId, receiverId, receiverName, onClose, onRead }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!appointmentId) return;
    setLoading(true);
    apiClient.get(`/messages?appointmentId=${appointmentId}`)
      .then(res => setMessages(res.data))
      .catch(err => console.error("Failed to load messages", err))
      .finally(() => setLoading(false));

    // Mark as read when opened
    apiClient.post("/messages/read", { appointmentId })
      .then(() => {
        if (onRead) onRead();
      })
      .catch(console.error);
  }, [appointmentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleMessage = (msg) => {
      const myId = user.id || user._id;
      if (msg.appointmentId === appointmentId) {
        setMessages(prev => [...prev, msg]);
        if (msg.sender === receiverId) {
          apiClient.post("/messages/read", { appointmentId })
            .then(() => { if (onRead) onRead(); })
            .catch(console.error);
        }
      }
    };
    const handleCleared = (data) => {
      // Check if the cleared chat is with the current receiver
      const otherStr = data.otherId?.toString();
      const recStr = receiverId?.toString();
      if (otherStr === recStr) {
        if (onClose) onClose();
      }
    };
    websocketService.onChatMessage(handleMessage);
    websocketService.onChatCleared(handleCleared);
    return () => {
      websocketService.offChatMessage(handleMessage);
      websocketService.offChatCleared(handleCleared);
    };
  }, [receiverId, user]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      const res = await apiClient.post("/messages", { appointmentId, receiverId, content: input.trim() });
      setMessages(prev => [...prev, res.data]);
      setInput("");
    } catch (err) {
      console.error("Failed to send message", err);
      alert(err.response?.data?.error || "Failed to send message");
    }
  };

  const isDark = document.body.classList.contains("dm");
  const myId = user.id || user._id;

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, 
      width: "calc(100vw - 40px)", maxWidth: 350, 
      height: "calc(100vh - 100px)", maxHeight: 450,
      background: isDark ? "#111827" : "#fff", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
      borderRadius: 16, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", zIndex: 1000,
      overflow: "hidden"
    }}>
      <div style={{
        padding: "12px 16px", background: "#10b981", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquare size={18} />
          <span style={{ fontWeight: 600 }}>{receiverName}</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8, background: isDark ? "#0f172a" : "#f8fafc" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: isDark ? "#94a3b8" : "#64748b" }}>
            <Loader size={20} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", color: isDark ? "#94a3b8" : "#64748b", marginTop: "auto", marginBottom: "auto", fontSize: 13 }}>
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.sender === myId;
            return (
              <div key={m._id || i} style={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                background: isMe ? "#10b981" : (isDark ? "#1e293b" : "#e2e8f0"),
                color: isMe ? "#fff" : (isDark ? "#f1f5f9" : "#0f172a"),
                padding: "8px 12px", borderRadius: 12, maxWidth: "80%", fontSize: 14, wordBreak: "break-word"
              }}>
                {m.content}
                <div style={{ fontSize: 10, marginTop: 4, textAlign: "right", opacity: 0.7 }}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: "flex", padding: 12, borderTop: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, background: isDark ? "#111827" : "#fff", gap: 8 }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 20, border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, 
            background: isDark ? "#0f172a" : "#f8fafc", color: isDark ? "#f1f5f9" : "#0f172a", outline: "none"
          }}
        />
        <button type="submit" disabled={!input.trim()} style={{
          background: "#10b981", color: "#fff", border: "none", borderRadius: "50%", width: 36, height: 36, 
          display: "flex", justifyContent: "center", alignItems: "center", cursor: input.trim() ? "pointer" : "not-allowed", opacity: input.trim() ? 1 : 0.6
        }}>
          <Send size={16} style={{ marginLeft: 2 }} />
        </button>
      </form>
    </div>
  );
}
