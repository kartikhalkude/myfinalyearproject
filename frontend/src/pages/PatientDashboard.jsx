import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import websocketService from "../services/websocket";
import VideoCall from "../components/VideoCall";
import apiClient from "../services/apiClient";
import DiabetesPrediction from "../components/DiabetesPrediction";
import HeartDiseasePrediction from "../components/HeartDiseasePrediction";
import PneumoniaPrediction from "../components/PneumoniaPrediction";
import AppointmentBooking from "../components/AppointmentBooking";
import Prescriptions from "../components/Prescriptions";
import HealthRecords from "../components/HealthRecords";
import BrainTumorPrediction from "../components/BrainTumorPrediction";
import Chat from "../components/Chat";
import { Sidebar, StatCard, EmptyState, SectionCard, Badge, Loader, MobileHeader, ConfirmModal, Btn, useDarkMode } from "../components/UI";
import { 
  Home, Brain, HeartPulse, Stethoscope, CalendarPlus, Calendar, 
  ClipboardList, Pill, Smile, Phone, CheckCircle, XCircle, Info, X, Check, Clock,
  Droplet, Footprints, Moon, Salad, MessageSquare, Trash2
} from "lucide-react";

// ─── Helper Functions ─────────────────────────────────────────────────────────

const parseAppointmentDateTime = (dateStr, timeStr) => {
  const d = new Date(dateStr);
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return d;
  let hours = parseInt(match[1]);
  const mins = parseInt(match[2]);
  const isPM = match[3].toUpperCase() === "PM";
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  d.setHours(hours, mins, 0, 0);
  return d;
};

// ─── Nav items ────────────────────────────────────────────────────────────────

function getNavItems(apptCount, healthUnread, prescUnread) {
  return [
    { section: "Overview" },
    { id: "overview",  label: "Dashboard",        icon: <Home size={18} /> },
    { section: "AI Screening" },
    { id: "diabetes",  label: "Diabetes Check",   icon: <Brain size={18} />,  tag: "AI" },
    { id: "heart",     label: "Heart Check",      icon: <HeartPulse size={18} />, tag: "AI" },
    { id: "pneumonia", label: "Pneumonia Check",  icon: <Stethoscope size={18} />, tag: "AI" },
    { id: "tumor",     label: "Brain Tumor",      icon: <Brain size={18} />,      tag: "AI" },
    { section: "Appointments" },
    { id: "book",      label: "Book Appointment", icon: <CalendarPlus size={18} /> },
    { id: "history",   label: "My Appointments",  icon: <Calendar size={18} />, badge: apptCount },
    { section: "Medical" },
    { id: "health",    label: "Health Records",   icon: <ClipboardList size={18} />, badge: healthUnread },
    { id: "prescriptions", label: "Prescriptions", icon: <Pill size={18} />, badge: prescUnread },
  ];
}

// ─── Toast notification ───────────────────────────────────────────────────────

function ToastStack({ toasts, onDismiss, onAction }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 200, display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 }}>
      {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={onDismiss} onAction={onAction} />)}
    </div>
  );
}

function Toast({ toast, onDismiss, onAction }) {
  const [exit, setExit] = useState(false);
  const dismiss = () => { setExit(true); setTimeout(() => onDismiss(toast.id), 250); };
  
  const getIcon = () => {
    switch(toast.type) {
      case 'call': return <Phone size={16} color="#16a34a" />;
      case 'appointment': return <Calendar size={16} color="#2563eb" />;
      case 'success': return <CheckCircle size={16} color="#16a34a" />;
      case 'error': return <XCircle size={16} color="#dc2626" />;
      case 'prescription': return <Pill size={16} color="#7c3aed" />;
      case 'record': return <ClipboardList size={16} color="#0891b2" />;
      case 'chat': return <MessageSquare size={16} color="#3b82f6" />;
      default: return <Info size={16} color="#64748b" />;
    }
  };

  const typeColor = { call: "#16a34a", appointment: "#2563eb", success: "#16a34a", error: "#dc2626", prescription: "#7c3aed", record: "#0891b2", chat: "#3b82f6", info: "#64748b" };
  
  return (
    <div className="dm-toast" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 16px", boxShadow: "0 8px 24px rgba(15,23,42,0.12)", transition: "all 0.25s", opacity: exit ? 0 : 1, transform: exit ? "translateX(24px)" : "translateX(0)", animation: "slideRight 0.25s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 30, height: 30, background: typeColor[toast.type] + "18", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {getIcon()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="dm-toast-title" style={{ fontSize: 13.5, fontWeight: 500, color: "#0f172a" }}>{toast.title}</div>
          {toast.message && <div className="dm-toast-message" style={{ fontSize: 12.5, color: "#64748b", marginTop: 2, lineHeight: 1.45 }}>{toast.message}</div>}
          {toast.actions?.length > 0 && (
            <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
              {toast.actions.map((a, i) => (
                <button key={i} onClick={() => { onAction(toast.id, a.type, a.data); dismiss(); }}
                  className={a.primary ? "" : "dm-toast-secondary"}
                  style={{ padding: "5px 12px", fontSize: 12.5, fontWeight: 500, background: a.primary ? "#1db585" : "#f8fafc", color: a.primary ? "#fff" : "#475569", border: a.primary ? "none" : "1.5px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>{a.label}</button>
              ))}
            </div>
          )}
        </div>
        <button onClick={dismiss} style={{ width: 24, height: 24, background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>
      {toast.autoClose && <div style={{ height: 2, background: "#f1f5f9", borderRadius: 999, overflow: "hidden", marginTop: 10 }}><div style={{ height: "100%", background: typeColor[toast.type] || "#1db585", animation: "progressBar 5s linear forwards" }}></div></div>}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function Overview({ stats, appointments, onStartCall, onCancelAppt, onMessage, onRefresh }) {
  const isDark = useDarkMode();
  const upcoming = appointments.filter(a => new Date(a.date) >= new Date() && a.status !== "cancelled").slice(0, 4);
  const statusBadge = { confirmed: ["#dcfce7","#166534"], pending: ["#fef9c3","#854d0e"], completed: ["#dbeafe","#1e40af"], cancelled: ["#fee2e2","#991b1b"] };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: isDark ? "#f8fafc" : "#0f172a", letterSpacing: "-0.01em" }}>Dashboard</h1>
          <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: isDark ? "#94a3b8" : "#64748b", marginTop: 2 }}>Here's your health overview at a glance.</p>
        </div>
        <button className="dm-outline-btn" onClick={onRefresh} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", background: isDark ? "#1e293b" : "#fff", border: `1.5px solid ${isDark ? "#334155" : "#e2e8f0"}`, borderRadius: 10, fontSize: 13.5, fontWeight: 500, color: isDark ? "#cbd5e1" : "#475569", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = isDark ? "#475569" : "#cbd5e1"} onMouseLeave={e => e.currentTarget.style.borderColor = isDark ? "#334155" : "#e2e8f0"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Refresh
        </button>
      </div>
      <div className="dm-grid-stats" style={{ marginBottom: 24 }}>
        <StatCard label="Total appointments" value={stats?.totalAppointments || 0} sub="All time" icon={<Calendar size={18} color="#1db585" />} />
        <StatCard label="Upcoming" value={stats?.upcomingAppointments || 0} sub="Scheduled" color="#3b82f6" icon={<CalendarPlus size={18} color="#3b82f6" />} />
        <StatCard label="Health checks" value={stats?.totalPredictions || 0} sub="AI screenings" color="#8b5cf6" icon={<Brain size={18} color="#8b5cf6" />} />
        <StatCard label="Unread Messages" value={stats?.unreadMessages || 0} sub="New chats" color="#f59e0b" icon={<MessageSquare size={18} color="#f59e0b" />} />
      </div>
      <div className="dm-grid-two">
        {/* Upcoming appointments */}
        <SectionCard>
          <div className="dm-section-header" style={{ padding: "16px 20px", borderBottom: `1px solid ${isDark ? "#1e293b" : "#f8fafc"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: isDark ? "#f8fafc" : "#0f172a" }}>Upcoming appointments</div>
            <span className="dm-soft-muted" style={{ fontSize: 12.5, color: "#94a3b8" }}>{upcoming.length} scheduled</span>
          </div>
          <div style={{ padding: 16 }}>
            {upcoming.length === 0 ? <EmptyState icon={<Calendar size={24} color="#94a3b8" />} title="No upcoming appointments" subtitle="Book a consultation with a specialist." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {upcoming.map(apt => {
                  const [bg, color] = statusBadge[apt.status] || statusBadge.pending;
                  return (
                    <div className="dm-appointment-preview" key={apt._id} style={{ padding: "14px", border: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`, borderRadius: 14, background: isDark ? "#111827" : "#f8fafc" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div className="dm-soft-text" style={{ fontSize: 13.5, fontWeight: 700, color: isDark ? "#f8fafc" : "#0f172a" }}>{apt.doctorName}</div>
                        <span style={{ display: "inline-flex", padding: "2px 8px", fontSize: 10, fontWeight: 700, borderRadius: 999, background: isDark ? (apt.status === 'confirmed' ? 'rgba(29, 181, 133, 0.15)' : 'rgba(30, 41, 59, 0.5)') : bg, color: isDark ? (apt.status === 'confirmed' ? '#1db585' : '#94a3b8') : color, border: isDark ? `1px solid ${apt.status === 'confirmed' ? '#1db585' : '#334155'}` : 'none', textTransform: "uppercase" }}>{apt.status}</span>
                      </div>
                      <div className="dm-soft-muted" style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", display: "flex", gap: 10 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {new Date(apt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {apt.time}</span>
                      </div>
                      {apt.status === "confirmed" && (
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button onClick={() => onStartCall(apt)} style={{ flex: 1, padding: "8px", fontSize: 12.5, fontWeight: 600, background: "#1db585", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Join call</button>
                          <button onClick={() => onMessage({ appointmentId: apt._id, id: apt.doctorId?._id || apt.doctorId, name: apt.doctorName })} style={{ flex: 1, padding: "8px", fontSize: 12.5, fontWeight: 600, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Message</button>
                          <button onClick={() => onCancelAppt(apt._id)} style={{ flex: 1, padding: "8px", fontSize: 12.5, background: isDark ? "#1e293b" : "#fff", color: "#ef4444", border: `1px solid ${isDark ? "#334155" : "#fca5a5"}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Health tips */}
        <SectionCard>
          <div className="dm-section-header" style={{ padding: "16px 20px", borderBottom: `1px solid ${isDark ? "#1e293b" : "#f8fafc"}` }}>
            <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: isDark ? "#f8fafc" : "#0f172a" }}>Daily health tips</div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                [<Droplet size={18} color="#3b82f6" />, "Stay hydrated", "Aim for 8 glasses of water daily to maintain energy."],
                [<Footprints size={18} color="#10b981" />, "Stay active", "A 30-minute daily walk improves mood and cardiovascular health."],
                [<Moon size={18} color="#8b5cf6" />, "Prioritize sleep", "7–8 hours of quality sleep helps memory and immune function."],
                [<Salad size={18} color="#f59e0b" />, "Eat balanced meals", "Aim for 5 servings of fruits and vegetables every day."],
                [<Smile size={18} color="#f43f5e" />, "Manage stress", "Practice deep breathing or mindfulness for 5 minutes daily."],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div className="dm-muted-panel" style={{ width: 34, height: 34, background: "#f8fafc", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div className="dm-soft-text" style={{ fontSize: 13.5, fontWeight: 500, color: "#1e293b" }}>{title}</div>
                    <div className="dm-soft-muted" style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.45, marginTop: 1 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Appointment history tab ──────────────────────────────────────────────────

function AppointmentHistory({ appointments, onStartCall, onCancelAppt, onMessage, onRefresh, onDelete }) {
  const statusStyle = { confirmed: ["#dcfce7","#166534"], pending: ["#fef9c3","#854d0e"], completed: ["#dbeafe","#1e40af"], cancelled: ["#fee2e2","#991b1b"] };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 600, color: document.body.classList.contains("dm") ? "#f1f5f9" : "#0f172a", letterSpacing: "-0.01em" }}>My Appointments</h1>
          <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b", marginTop: 2 }}>{appointments.length} total appointments in your history.</p>
        </div>
        <button className="dm-outline-btn" onClick={onRefresh} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", background: document.body.classList.contains("dm") ? "#1e293b" : "#fff", border: `1.5px solid ${document.body.classList.contains("dm") ? "#334155" : "#e2e8f0"}`, borderRadius: 10, fontSize: 13.5, fontWeight: 500, color: document.body.classList.contains("dm") ? "#94a3b8" : "#475569", cursor: "pointer", fontFamily: "inherit" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Refresh
        </button>
      </div>
      <SectionCard>
        {appointments.length === 0 ? <EmptyState icon={<Calendar size={24} color="#94a3b8" />} title="No appointments yet" subtitle="Start by booking your first consultation." /> : (
          <div style={{ padding: "8px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {appointments.map(apt => {
                const [bg, color] = statusStyle[apt.status] || statusStyle.pending;
                const isDark = document.body.classList.contains("dm");
                return (
                  <div className="dm-appointment-card" key={apt._id} style={{ padding: "16px", background: isDark ? "#111827" : "#f8fafc", border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`, borderRadius: 16, display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
                    <div style={{ position: "absolute", top: 16, right: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      {(apt.status === "completed" || apt.status === "cancelled") && (
                        <button onClick={() => onDelete(apt._id)} style={{ padding: "4px", background: "transparent", color: isDark ? "#ef4444" : "#dc2626", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete Record">
                          <Trash2 size={15} />
                        </button>
                      )}
                      <span style={{ display: "inline-flex", padding: "4px 10px", fontSize: 10, fontWeight: 700, borderRadius: 999, background: isDark ? (apt.status === 'confirmed' ? 'rgba(29, 181, 133, 0.15)' : 'rgba(30, 41, 59, 0.5)') : bg, color: isDark ? (apt.status === 'confirmed' ? '#1db585' : '#94a3b8') : color, border: isDark ? `1px solid ${apt.status === 'confirmed' ? '#1db585' : '#334155'}` : 'none', textTransform: "uppercase", letterSpacing: "0.02em" }}>{apt.status}</span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0, paddingRight: 80 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1db585", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 12, flexShrink: 0 }}>{apt.doctorName?.charAt(0)}</div>
                        <div className="dm-soft-text" style={{ fontWeight: 600, color: isDark ? "#f8fafc" : "#0f172a", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{apt.doctorName}</div>
                        {apt.unreadCount > 0 && (
                          <div style={{ padding: "2px 8px", background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            <MessageSquare size={10} /> {apt.unreadCount} New
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px", fontSize: 12.5, color: isDark ? "#94a3b8" : "#64748b" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={14} /> {new Date(apt.date).toLocaleDateString()}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={14} /> {apt.time}</span>
                      </div>
                      {apt.reason && (
                        <div className="dm-soft-muted" style={{ fontSize: 12.5, color: isDark ? "#94a3b8" : "#64748b", marginTop: 10, fontStyle: "italic", lineHeight: 1.4 }}>
                          <span style={{ opacity: 0.7 }}>Reason:</span> {apt.reason}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      {apt.status === "confirmed" && (
                        <>
                          <button onClick={() => onStartCall(apt)} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 700, background: "#1db585", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.1s" }} onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"} onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>Join call</button>
                          <button onClick={() => onMessage({ appointmentId: apt._id, id: apt.doctorId?._id || apt.doctorId, name: apt.doctorName })} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 700, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.1s" }} onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"} onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>Message</button>
                          <button onClick={() => onCancelAppt(apt._id)} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 500, background: isDark ? "#1e293b" : "#fff", color: "#ef4444", border: `1px solid ${isDark ? "#334155" : "#fca5a5"}`, borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                        </>
                      )}
                      {apt.status === "pending" && (
                        <button onClick={() => onCancelAppt(apt._id)} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 500, background: isDark ? "#1e293b" : "#fff", color: "#ef4444", border: `1px solid ${isDark ? "#334155" : "#fca5a5"}`, borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Cancel Request</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function PatientDashboard() {
  const isDark = useDarkMode();
  const { user, logout, wsConnected } = useAuth();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState({ unreadHealthRecords: 0, unreadPrescriptions: 0, totalAppointments: 0, upcomingAppointments: 0, totalPredictions: 0 });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const activeChatRef = useRef(null);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  const activeCallRef = useRef(null);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  const remindedAppts = useRef(new Set());
  const [toasts, setToasts] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState({ open: false, id: null });
  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const apptRef = useRef(appointments);
  useEffect(() => { apptRef.current = appointments; }, [appointments]);

  const addToast = useCallback(t => {
    const id = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts(p => [...p, { id, ...t }]);
    if (t.autoClose) setTimeout(() => {
      if (isMounted.current) setToasts(p => p.filter(x => x.id !== id));
    }, 5000);
  }, []);
  const dismissToast = useCallback(id => setToasts(p => p.filter(x => x.id !== id)), []);
  const handleToastAction = useCallback((id, type, data) => {
    if (type === "accept" && data?.appointment && data?.callData) startCall(data.appointment, data.callData);
    else if (type === "decline" && data?.callData) websocketService.emit("call:reject", { appointmentId: data.callData.appointmentId, userId: user.id });
    else if (type === "view-prescriptions") setTab("prescriptions");
    else if (type === "view-health") setTab("health");
    else if (type === "reply") setActiveChat({ appointmentId: data.appointmentId, id: data.senderId, name: data.senderName });
  }, [user?.id]);

  const fetchData = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        apiClient.get(`/stats?t=${Date.now()}`),
        apiClient.get("/appointments")
      ]);
      setStats(s.data); setAppointments(a.data);
    } catch(e) { addToast({ type: "error", title: "Failed to load data", autoClose: true }); }
    finally { setLoading(false); }
  }, [addToast]);

  const deleteAppointment = async (id) => {
    try {
      await apiClient.delete(`/appointments/${id}`);
      fetchData();
      addToast({ type: "success", title: "Appointment Deleted", message: "The completed appointment was removed.", autoClose: true });
    } catch (err) {
      addToast({ type: "error", title: "Failed to delete", message: "Could not remove appointment.", autoClose: true });
    }
  };

  useEffect(() => {
    fetchData();
    if (user?.id) websocketService.notifyOnline(user.id);
    const onApptUpdate = d => { 
      fetchData(); 
      if (d?.initiatorId === user?.id) return;
      addToast({ type: "appointment", title: "Appointment updated", message: `Status: ${d.appointment?.status}`, autoClose: true }); 
    };
    const onCall = d => {
      if (activeCallRef.current?.appointmentId?.toString() === d.appointmentId?.toString()) {
        return;
      }
      if (activeCallRef.current) return;
      const apt = apptRef.current.find(a => a._id === d.appointmentId);
      addToast({ type: "call", title: "Incoming call", message: `${d.callerName} is calling`, autoClose: false, actions: [{ label: "Accept", type: "accept", primary: true, data: { appointment: apt, callData: d } }, { label: "Decline", type: "decline", data: { callData: d } }] });
    };
    const onRxCreated = d => { 
      fetchData();
      if (d?.initiatorId === user?.id) return;
      if (d.prescription && d.type === "created") addToast({ type: "prescription", title: "New prescription", message: `Dr. ${d.prescription.doctorId?.name || "Doctor"} added a prescription`, autoClose: true, actions: [{ label: "View", type: "view-prescriptions", primary: true }] }); 
    };
    const onRxUpdated = d => { 
      fetchData();
      if (d?.initiatorId === user?.id) return;
      if (d.prescription && d.type === "updated") addToast({ type: "prescription", title: "Prescription updated", autoClose: true }); 
    };
    const onRxDeleted = d => {
      fetchData();
      if (d?.initiatorId === user?.id) return;
      addToast({ type: "prescription", title: "Prescription removed", autoClose: true });
    };
    const onRecCreated = d => { 
      fetchData();
      if (d?.initiatorId === user?.id) return;
      if (d.record && d.type === "created") addToast({ type: "record", title: "New health record", message: `"${d.record.title}" added by your doctor`, autoClose: true, actions: [{ label: "View", type: "view-health", primary: true }] }); 
    };
    const onRecUpdated = d => { 
      fetchData();
      if (d?.initiatorId === user?.id) return;
      if (d.record && d.type === "updated") addToast({ type: "record", title: "Health record updated", autoClose: true }); 
    };
    const onRecDeleted = d => {
      fetchData();
      if (d?.initiatorId === user?.id) return;
      addToast({ type: "record", title: "Health record removed", autoClose: true });
    };
    const onChatMessage = d => {
      fetchData();
      if (activeChatRef.current?.appointmentId?.toString() === d.appointmentId?.toString()) return;
      addToast({ type: "chat", title: `New message from ${d.senderName}`, message: d.content.length > 40 ? d.content.substring(0, 40) + '...' : d.content, autoClose: true, actions: [{ label: "Reply", type: "reply", primary: true, data: { appointmentId: d.appointmentId, senderId: d.sender, senderName: d.senderName } }] });
    };
    websocketService.onAppointmentUpdated(onApptUpdate);
    websocketService.on("call:incoming", onCall);
    websocketService.onPrescriptionCreated(onRxCreated); websocketService.onPrescriptionUpdated(onRxUpdated); websocketService.onPrescriptionDeleted(onRxDeleted);
    websocketService.onHealthRecordCreated(onRecCreated); websocketService.onHealthRecordUpdated(onRecUpdated); websocketService.onHealthRecordDeleted(onRecDeleted);
    websocketService.onChatMessage(onChatMessage);

    const interval = setInterval(() => fetchData(), 30000);

    const checkUpcomingInterval = setInterval(() => {
      const now = new Date();
      appointments.forEach(apt => {
        if (apt.status === "confirmed") {
          const aptDate = parseAppointmentDateTime(apt.date, apt.time);
          const diffMs = aptDate - now;
          if (diffMs > 0 && diffMs <= 5 * 60 * 1000 && !remindedAppts.current.has(apt._id)) {
            remindedAppts.current.add(apt._id);
            addToast({
              type: "appointment",
              title: "Upcoming Appointment",
              message: `Your appointment with ${apt.doctorName} starts in 5 minutes!`,
              autoClose: false
            });
          }
        }
      });
    }, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(checkUpcomingInterval);
      websocketService.off("appointment:updated", onApptUpdate); websocketService.off("call:incoming", onCall);
      websocketService.offPrescriptionCreated(onRxCreated); websocketService.offPrescriptionUpdated(onRxUpdated); websocketService.offPrescriptionDeleted(onRxDeleted);
      websocketService.offHealthRecordCreated(onRecCreated); websocketService.offHealthRecordUpdated(onRecUpdated); websocketService.offHealthRecordDeleted(onRecDeleted);
      websocketService.offChatMessage(onChatMessage);
    };
  }, [fetchData, addToast]);

  const startCall = (apt, callData = null) => {
    const callObj = { appointmentId: apt._id, otherUserId: apt.doctorId?._id || apt.doctorId, otherUserName: apt.doctorName, isDoctor: false, incomingCallData: callData };
    activeCallRef.current = callObj;
    setActiveCall(callObj);
  };
  const cancelAppt = async id => {
    setConfirmCancel({ open: true, id });
  };

  const handleConfirmCancel = async () => {
    const id = confirmCancel.id;
    if (!id) return;
    try { 
      await apiClient.patch(`/appointments/${id}`, { status: "cancelled" }); 
      fetchData(); 
      addToast({ type: "success", title: "Appointment cancelled", autoClose: true }); 
    }
    catch { addToast({ type: "error", title: "Failed to cancel", autoClose: true }); }
  };

  const renderTab = () => {
    switch (tab) {
      case "overview":    return <Overview stats={stats} appointments={appointments} onStartCall={startCall} onCancelAppt={cancelAppt} onMessage={setActiveChat} onRefresh={() => fetchData()} />;
      case "diabetes":    return <DiabetesPrediction />;
      case "heart":       return <HeartDiseasePrediction />;
      case "pneumonia":   return <PneumoniaPrediction />;
      case "tumor":       return <BrainTumorPrediction />;

      case "book":        return <AppointmentBooking onBookingComplete={() => { fetchData(); addToast({ type: "success", title: "Appointment booked", message: "Doctor will confirm within 24 hours.", autoClose: true }); }} />;
      case "history":     return <AppointmentHistory appointments={appointments} onStartCall={startCall} onCancelAppt={cancelAppt} onMessage={setActiveChat} onRefresh={() => fetchData()} onDelete={deleteAppointment} />;
      case "health":      return <HealthRecords onRefresh={fetchData} />;
      case "prescriptions": return <Prescriptions onRefresh={fetchData} />;

      default: return null;
    }
  };

  return (
    <div className="dm-page-shell" style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      {activeCall && <VideoCall {...activeCall} onCallEnd={() => { setActiveCall(null); fetchData(); addToast({ type: "info", title: "Call ended", autoClose: true }); }} />}
      {activeChat && <Chat appointmentId={activeChat.appointmentId} receiverId={activeChat.id} receiverName={activeChat.name} onClose={() => setActiveChat(null)} onRead={() => fetchData()} />}
      <ToastStack toasts={toasts} onDismiss={dismissToast} onAction={handleToastAction} />
      <ConfirmModal 
        isOpen={confirmCancel.open} 
        onClose={() => setConfirmCancel({ open: false, id: null })}
        onConfirm={handleConfirmCancel}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        confirmText="Yes, Cancel"
      />
      <MobileHeader onMenuClick={() => setMobileNavOpen(true)} user={user} />
      <Sidebar user={user} navItems={getNavItems(
        appointments.filter(a => a.status === "confirmed" || a.status === "pending").length,
        stats?.unreadHealthRecords || 0,
        stats?.unreadPrescriptions || 0
      )} activeTab={tab} onTabChange={(t) => {
        setTab(t);
        if (t === "health" && stats?.unreadHealthRecords > 0) {
          setStats(prev => ({ ...prev, unreadHealthRecords: 0 }));
        }
        if (t === "prescriptions" && stats?.unreadPrescriptions > 0) {
          setStats(prev => ({ ...prev, unreadPrescriptions: 0 }));
        }
        if (t === "messages" && stats?.unreadMessages > 0) {
          setStats(prev => ({ ...prev, unreadMessages: 0 }));
        }
      }} onLogout={logout} wsConnected={wsConnected} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="dm-page-content">
        <div className="dm-page-inner">
          {loading ? <Loader message="Loading your dashboard…" /> : renderTab()}
        </div>
      </div>
      <style>{`@keyframes slideRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}} @keyframes progressBar{from{width:100%}to{width:0}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
