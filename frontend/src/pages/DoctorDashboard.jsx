import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import websocketService from "../services/websocket";
import VideoCall from "../components/VideoCall";
import apiClient from "../services/apiClient";
import Prescriptions from "../components/Prescriptions";
import HealthRecords from "../components/HealthRecords";
import Chat from "../components/Chat";
import { Sidebar, StatCard, EmptyState, SectionCard, Badge, Loader, Btn, PageHeader, MobileHeader, ConfirmModal, useDarkMode } from "../components/UI";
import { 
  Home, Calendar, CalendarClock, Users, FileText, Pill, ClipboardList, 
  Phone, CheckCircle, XCircle, Info, X, Check, RefreshCw, CalendarDays, MessageSquare,
  ClipboardCheck, Clock, Trash2, Settings, Wallet
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

function getNavItems(apptCount, feedbackCount, prescriptionCount) {
  return [
    { section: "Main" },
    { id: "overview",  label: "Overview",        icon: <Home size={18} /> },
    { id: "appointments", label: "Appointments",  icon: <Calendar size={18} />, badge: apptCount },
    { id: "schedule",  label: "Schedule",        icon: <CalendarClock size={18} /> },
    { section: "Practice" },
    { id: "patients",  label: "My Patients",     icon: <Users size={18} /> },
    { id: "reports",   label: "Reports",         icon: <FileText size={18} /> },
    { section: "Medical" },
    { id: "prescriptions", label: "Prescriptions", icon: <Pill size={18} />, badge: prescriptionCount },
    { id: "health-records", label: "Health Records", icon: <ClipboardList size={18} />, badge: feedbackCount },
    { section: "Settings & Finance" },
    { id: "wallet", label: "Wallet & Earnings", icon: <Wallet size={18} /> },
    { id: "settings", label: "Practice Settings", icon: <Settings size={18} /> },
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

function Overview({ stats, appointments, pendingFeedbacks, onStartCall, onUpdateStatus, onMessage, onRefresh, onViewHealth }) {
  const isDark = useDarkMode();
  const todayAppointments = appointments.filter(apt => new Date(apt.date).toDateString() === new Date().toDateString());
  const pendingAppointments = appointments.filter(apt => apt.status === "pending").slice(0, 5);
  const statusBadge = { confirmed: ["#dcfce7","#166534"], pending: ["#fef9c3","#854d0e"], completed: ["#dbeafe","#1e40af"], cancelled: ["#fee2e2","#991b1b"] };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em" }}>Dashboard Overview</h1>
          <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b", marginTop: 2 }}>Welcome back! Here's what's happening today.</p>
        </div>
        <Btn onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw size={14} /> Refresh
        </Btn>
      </div>
      <div className="dm-grid-stats" style={{ marginBottom: 24 }}>
        <StatCard label="Total Earnings" value={`$${stats?.totalEarnings || 0}`} icon={<span style={{ fontWeight: 800 }}>$</span>} color="#10b981" />
        <StatCard label="Today's Appointments" value={stats?.todayAppointments || 0} icon={<CalendarDays size={18} color="#1db585" />} color="#1db585" />
        <StatCard label="Total Patients" value={stats?.totalPatients || 0} icon={<Users size={18} color="#3b82f6" />} color="#3b82f6" />
        <StatCard label="Unread Messages" value={stats?.unreadMessages || 0} icon={<MessageSquare size={18} color="#f59e0b" />} color="#f59e0b" />
        <StatCard label="Total Appointments" value={stats?.totalAppointments || 0} icon={<Calendar size={18} color="#8b5cf6" />} color="#8b5cf6" />
      </div>
      
      <div className="dm-grid-two">
        {/* Today's Schedule */}
        <SectionCard>
          <div className="dm-section-header" style={{ padding: "16px 20px", borderBottom: `1px solid ${document.body.classList.contains("dm") ? "#1e293b" : "#f8fafc"}` }}>
            <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 600, color: document.body.classList.contains("dm") ? "#f1f5f9" : "#0f172a" }}>Today's Schedule</div>
          </div>
          <div style={{ padding: 16 }}>
            {todayAppointments.length === 0 ? <EmptyState icon={<Calendar size={24} color="#94a3b8" />} title="No appointments today" subtitle="Enjoy your free time." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {todayAppointments.map(apt => {
                  const [bg, color] = statusBadge[apt.status] || statusBadge.pending;
                  return (
                    <div className="dm-appointment-preview" key={apt._id} style={{ padding: "14px", border: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`, borderRadius: 14, background: isDark ? "#111827" : "#f8fafc" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div className="dm-soft-text" style={{ fontSize: 13.5, fontWeight: 700, color: isDark ? "#f8fafc" : "#0f172a" }}>{apt.patientName}</div>
                        <span style={{ display: "inline-flex", padding: "2px 8px", fontSize: 10, fontWeight: 700, borderRadius: 999, background: isDark ? (apt.status === 'confirmed' ? 'rgba(29, 181, 133, 0.15)' : 'rgba(30, 41, 59, 0.5)') : bg, color: isDark ? (apt.status === 'confirmed' ? '#1db585' : '#94a3b8') : color, border: isDark ? `1px solid ${apt.status === 'confirmed' ? '#1db585' : '#334155'}` : 'none', textTransform: "uppercase" }}>{apt.status}</span>
                      </div>
                      <div className="dm-soft-muted" style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", display: "flex", gap: 10 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {apt.time}</span>
                      </div>
                      {apt.status === "confirmed" && (
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <Btn onClick={() => onStartCall(apt)} style={{ flex: 2, fontWeight: 600 }} size="sm">Start Call</Btn>
                          <Btn onClick={() => onMessage({ appointmentId: apt._id, id: apt.patientId?._id || apt.patientId, name: apt.patientName })} style={{ flex: 1, fontWeight: 600, background: "#3b82f6" }} size="sm">Message</Btn>
                          <Btn onClick={() => onUpdateStatus(apt._id, "completed")} variant="outline" style={{ flex: 1, fontWeight: 600 }} size="sm">Mark Done</Btn>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Pending Feedbacks */}
        <SectionCard>
          <div className="dm-section-header" style={{ padding: "16px 20px", borderBottom: `1px solid ${document.body.classList.contains("dm") ? "#1e293b" : "#f8fafc"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 600, color: document.body.classList.contains("dm") ? "#f1f5f9" : "#0f172a" }}>Pending Feedbacks</div>
            <button onClick={onViewHealth} style={{ fontSize: 12, color: "#1db585", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View All</button>
          </div>
          <div style={{ padding: 16 }}>
            {pendingFeedbacks.length === 0 ? <EmptyState icon={<ClipboardCheck size={24} color="#94a3b8" />} title="All feedback completed" subtitle="Great job! You're all caught up." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pendingFeedbacks.map(rec => (
                  <div className="dm-card-row" key={rec._id} style={{ padding: "12px 14px", border: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`, borderRadius: 12, background: isDark ? "#0f172a" : "#fafafa" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div className="dm-soft-text" style={{ fontSize: 13.5, fontWeight: 600, color: isDark ? "#f1f5f9" : "#1e293b" }}>{rec.title}</div>
                      <span style={{ fontSize: 11, padding: "2px 8px", background: isDark ? "rgba(234, 179, 8, 0.15)" : "#fef9c3", color: isDark ? "#eab308" : "#854d0e", borderRadius: 999, fontWeight: 700, border: isDark ? "1px solid #eab308" : "none" }}>Needs Review</span>
                    </div>
                    <div className="dm-soft-muted" style={{ fontSize: 12.5, color: isDark ? "#94a3b8" : "#64748b" }}>Patient: {rec.patientId?.name || "Patient"}</div>
                    <div className="dm-soft-muted" style={{ fontSize: 11.5, color: isDark ? "#475569" : "#94a3b8", marginTop: 2 }}>{new Date(rec.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Appointment Management tab ──────────────────────────────────────────────────

function AppointmentManagement({ appointments, onStartCall, onMessage, onUpdateStatus, onDelete }) {
  const isDark = useDarkMode();
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? appointments : appointments.filter(a => a.status === filter);
  const statusBadge = { confirmed: ["#dcfce7","#166534"], pending: ["#fef9c3","#854d0e"], completed: ["#dbeafe","#1e40af"], cancelled: ["#fee2e2","#991b1b"] };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em" }}>Appointments</h1>
          <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b", marginTop: 2 }}>Manage all your patient consultations.</p>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, maxWidth: "100%", whiteSpace: "nowrap" }} className="dm-hide-scrollbar">
            {["all", "pending", "confirmed", "completed", "cancelled"].map(s => (
              <button className={filter === s ? "" : "dm-outline-btn"} key={s} onClick={() => setFilter(s)}
                style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: filter === s ? 500 : 400, fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s", border: filter === s ? "none" : "1px solid #e2e8f0", background: filter === s ? "#1db585" : (isDark ? "#111827" : "#fff"), color: filter === s ? "#fff" : (isDark ? "#94a3b8" : "#475569"), flexShrink: 0 }}
              >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      <SectionCard>
        {filtered.length === 0 ? <EmptyState icon={<Calendar size={24} color="#94a3b8" />} title="No appointments found" subtitle="Try changing your filters." /> : (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map(apt => {
                const [bg, color] = statusBadge[apt.status] || statusBadge.pending;
                return (
                  <div className="dm-appointment-card" key={apt._id} style={{ padding: "16px", border: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`, borderRadius: 20, background: isDark ? "#111827" : "#f8fafc", display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
                    {/* Status Badge & Actions - Pinned to top right */}
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
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1db585", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{apt.patientName?.charAt(0)}</div>
                        <div className="dm-soft-text" style={{ fontSize: 15, fontWeight: 700, color: isDark ? "#f8fafc" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{apt.patientName}</div>
                        {apt.unreadCount > 0 && (
                          <div style={{ padding: "2px 8px", background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            <MessageSquare size={10} /> {apt.unreadCount} New
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px", fontSize: 13, color: isDark ? "#94a3b8" : "#64748b" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={14} /> {new Date(apt.date).toLocaleDateString()}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={14} /> {apt.time}</div>
                      </div>
                      
                      {apt.reason && (
                        <div className="dm-soft-muted" style={{ fontSize: 12.5, color: isDark ? "#94a3b8" : "#64748b", marginTop: 10, padding: "10px 14px", background: isDark ? "rgba(30,41,59,0.5)" : "#fff", borderRadius: 12, border: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}` }}>
                          <span style={{ fontWeight: 600, color: isDark ? "#475569" : "#64748b", fontSize: 11, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Reason for visit</span>
                          {apt.reason}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      {apt.status === "confirmed" && (
                        <>
                          <Btn onClick={() => onStartCall(apt)} style={{ flex: 2, fontWeight: 700, borderRadius: 10 }} size="sm">Start Consultation</Btn>
                          <Btn onClick={() => onMessage({ appointmentId: apt._id, id: apt.patientId?._id || apt.patientId, name: apt.patientName })} style={{ flex: 1, fontWeight: 700, borderRadius: 10, background: "#3b82f6" }} size="sm">Message</Btn>
                          <Btn onClick={() => onUpdateStatus(apt._id, "completed")} variant="outline" style={{ flex: 1, fontWeight: 600, borderRadius: 10 }} size="sm">Mark Done</Btn>
                        </>
                      )}
                      {apt.status === "pending" && (
                        <>
                          <Btn onClick={() => onUpdateStatus(apt._id, "confirmed")} variant="success" style={{ flex: 2, fontWeight: 700, borderRadius: 10 }} size="sm">Accept Request</Btn>
                          <Btn onClick={() => onUpdateStatus(apt._id, "cancelled")} variant="danger" style={{ flex: 1, fontWeight: 600, borderRadius: 10 }} size="sm">Decline</Btn>
                        </>
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

// ─── Patient List tab ────────────────────────────────────────────────────────

function PatientList({ appointments, doctorPatients }) {
  const patientsMap = {};
  appointments.forEach(apt => {
    if (apt.patientId) {
      const id = apt.patientId._id || apt.patientId;
      if (!patientsMap[id]) patientsMap[id] = { ...apt.patientId, patientName: apt.patientName, appointmentCount: 1, lastVisit: apt.date };
      else {
        patientsMap[id].appointmentCount++;
        if (new Date(apt.date) > new Date(patientsMap[id].lastVisit)) patientsMap[id].lastVisit = apt.date;
      }
    }
  });

  if (doctorPatients) {
    doctorPatients.forEach(dp => {
      if (patientsMap[dp._id]) {
        patientsMap[dp._id].email = dp.email || patientsMap[dp._id].email;
        patientsMap[dp._id].name  = dp.name  || patientsMap[dp._id].name;
      }
    });
  }

  const patientList = Object.values(patientsMap);
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em" }}>My Patients</h1>
        <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b", marginTop: 2 }}>{patientList.length} patients in your directory.</p>
      </div>
      
      <SectionCard>
        {patientList.length === 0 ? <EmptyState icon={<Users size={24} color="#94a3b8" />} title="No patients yet" subtitle="Patients will appear here after booking." /> : (
          <div className="dm-grid-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, padding: 24 }}>
            {patientList.map((p, i) => (
              <div className="dm-mini-panel" key={i} style={{ padding: 20, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, background: "#1db585", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 16 }}>
                    {(p.name || p.patientName)?.charAt(0)}
                  </div>
                  <div>
                    <div className="dm-page-title" style={{ fontWeight: 500, color: "#0f172a", fontSize: 15 }}>{p.name || p.patientName}</div>
                    {p.email && <div className="dm-soft-muted" style={{ fontSize: 13, color: "#64748b" }}>{p.email}</div>}
                  </div>
                </div>
                
                <div className="dm-soft-muted" style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#475569" }}>
                  <div className="dm-card-row" style={{ display: "flex", justifyContent: "space-between", background: "#fff", padding: "8px 12px", borderRadius: 8 }}>
                    <span>Total Visits:</span>
                    <span className="dm-soft-text" style={{ fontWeight: 600 }}>{p.appointmentCount}</span>
                  </div>
                  <div className="dm-card-row" style={{ display: "flex", justifyContent: "space-between", background: "#fff", padding: "8px 12px", borderRadius: 8 }}>
                    <span>Last Visit:</span>
                    <span className="dm-soft-text" style={{ fontWeight: 600 }}>{new Date(p.lastVisit).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Schedule View tab ───────────────────────────────────────────────────────

function ScheduleView({ appointments }) {
  const upcoming = appointments.filter(apt => new Date(apt.date) >= new Date()).slice(0, 7);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em" }}>Weekly Schedule</h1>
        <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b", marginTop: 2 }}>Your upcoming consultations for the next 7 days.</p>
      </div>
      
      <SectionCard>
        {upcoming.length === 0 ? <EmptyState icon={<CalendarClock size={24} color="#94a3b8" />} title="No upcoming appointments" subtitle="Your schedule is clear." /> : (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {upcoming.map(apt => (
              <div className="dm-schedule-card" key={apt._id} style={{ display: "flex", alignItems: "center", gap: 16, padding: 20, background: "#f0faf7", borderRadius: 16, border: "1px solid #a3e7d4" }}>
                <div style={{ width: 70, height: 70, background: "#1db585", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{new Date(apt.date).getDate()}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4 }}>{days[new Date(apt.date).getDay()]}</div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <div className="dm-page-title" style={{ fontSize: 16, fontWeight: 500, color: "#0f172a" }}>{apt.patientName}</div>
                  <div className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#475569", marginTop: 4 }}>{apt.time} — {apt.reason || "Regular checkup"}</div>
                </div>
                
                <span style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: apt.status === "confirmed" ? "#dcfce7" : "#fef9c3", color: apt.status === "confirmed" ? "#166534" : "#854d0e" }}>
                  {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Reports tab ─────────────────────────────────────────────────────────────

function Reports({ stats, appointments }) {
  const completedApts = appointments.filter(a => a.status === "completed").length;
  
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em" }}>Reports & Analytics</h1>
        <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b", marginTop: 2 }}>Practice statistics and consultation metrics.</p>
      </div>
      
      <div className="dm-grid-two">
        <SectionCard>
          <div className="dm-section-header" style={{ padding: "16px 20px", borderBottom: "1px solid #f8fafc" }}>
            <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Practice Statistics</div>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              ["Total Earnings", `$${stats?.totalEarnings || 0}`],
              ["Total Consultations", stats?.totalAppointments || 0],
              ["Active Patients", stats?.totalPatients || 0],
              ["Completed Consultations", completedApts]
            ].map(([label, val]) => (
              <div className="dm-mini-panel" key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderRadius: 10 }}>
                <span className="dm-soft-muted" style={{ fontSize: 13.5, color: "#475569", fontWeight: 500 }}>{label}</span>
                <span className="dm-page-title" style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{val}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Settings tab ────────────────────────────────────────────────────────────

function SettingsView({ user, onSave }) {
  const isDark = useDarkMode();
  const [formData, setFormData] = useState({
    daysOff: user?.availability?.daysOff || [0, 6],
    startTime: user?.availability?.startTime || "09:00",
    endTime: user?.availability?.endTime || "17:00",
    slotDuration: user?.availability?.slotDuration || 30,
    consultationFee: user?.availability?.consultationFee || 50
  });

  const toggleDay = (day) => {
    setFormData(p => ({
      ...p,
      daysOff: p.daysOff.includes(day) ? p.daysOff.filter(d => d !== day) : [...p.daysOff, day]
    }));
  };

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em" }}>Practice Settings</h1>
        <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b", marginTop: 2 }}>Manage your availability and consultation fees.</p>
      </div>

      <SectionCard>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: isDark ? "#cbd5e1" : "#475569", marginBottom: 8 }}>Days Off</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {days.map((d, i) => (
                <button
                  key={d}
                  onClick={() => toggleDay(i)}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
                    background: formData.daysOff.includes(i) ? "#ef4444" : (isDark ? "#111827" : "#fff"),
                    color: formData.daysOff.includes(i) ? "#fff" : (isDark ? "#94a3b8" : "#475569"),
                    cursor: "pointer", fontWeight: 500, fontSize: 13, transition: "all 0.2s"
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Patients cannot book appointments on these days.</p>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: isDark ? "#cbd5e1" : "#475569", marginBottom: 8 }}>Start Time</label>
              <input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, background: isDark ? "#0f172a" : "#fff", color: isDark ? "#f1f5f9" : "#0f172a" }} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: isDark ? "#cbd5e1" : "#475569", marginBottom: 8 }}>End Time</label>
              <input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, background: isDark ? "#0f172a" : "#fff", color: isDark ? "#f1f5f9" : "#0f172a" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: isDark ? "#cbd5e1" : "#475569", marginBottom: 8 }}>Slot Duration (minutes)</label>
              <select value={formData.slotDuration} onChange={e => setFormData({...formData, slotDuration: Number(e.target.value)})}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, background: isDark ? "#0f172a" : "#fff", color: isDark ? "#f1f5f9" : "#0f172a" }}>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: isDark ? "#cbd5e1" : "#475569", marginBottom: 8 }}>Consultation Fee ($)</label>
              <input type="number" min="0" value={formData.consultationFee} onChange={e => setFormData({...formData, consultationFee: Number(e.target.value)})}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, background: isDark ? "#0f172a" : "#fff", color: isDark ? "#f1f5f9" : "#0f172a" }} />
            </div>
          </div>
          
          <div style={{ marginTop: 8 }}>
            <Btn onClick={() => onSave(formData)} style={{ padding: "10px 24px" }}>Save Settings</Btn>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Wallet tab ──────────────────────────────────────────────────────────────

function WalletView({ stats, transactions, onRefresh, addToast }) {
  const isDark = useDarkMode();
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);
  const balance = stats?.totalEarnings || 0;

  const handleWithdraw = async () => {
    if (balance <= 0) return;
    setWithdrawing(true);
    try {
      await apiClient.post("/doctors/withdraw", { amount: balance });
      setWithdrawn(true);
      if (onRefresh) onRefresh();
      addToast({ type: "success", title: "Withdrawal Successful", message: "Funds will appear in 2-3 business days.", autoClose: true });
    } catch (err) {
      addToast({ type: "error", title: "Withdrawal Failed", message: "Could not process your withdrawal." });
    } finally {
      setWithdrawing(false);
    }
  };

  const recentTransactions = transactions.slice(0, 10);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em" }}>Wallet & Earnings</h1>
        <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b", marginTop: 2 }}>Manage your consultation revenue and withdraw funds.</p>
      </div>

      <div className="dm-grid-two">
        <SectionCard>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ padding: 24, borderRadius: 16, background: "linear-gradient(135deg, #1db585 0%, #10b981 100%)", color: "#fff", display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: -20, top: -20, opacity: 0.1 }}>
                <Wallet size={120} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, opacity: 0.9 }}>Available Balance</div>
              <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-0.02em" }}>${withdrawn ? 0 : balance}</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Ready for withdrawal to your linked bank account.</div>
            </div>

            <Btn onClick={handleWithdraw} disabled={withdrawing || withdrawn || balance === 0} style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 15, fontWeight: 600 }}>
              {withdrawing ? "Processing Withdrawal..." : withdrawn ? "Funds Withdrawn" : "Withdraw Funds"}
            </Btn>
            {withdrawn && <div style={{ fontSize: 13, color: "#10b981", textAlign: "center", fontWeight: 500 }}>Withdrawal successful! Funds will appear in 2-3 business days.</div>}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="dm-section-header" style={{ padding: "16px 20px", borderBottom: `1px solid ${isDark ? "#1e293b" : "#f8fafc"}` }}>
            <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#f1f5f9" : "#0f172a" }}>Recent Transactions</div>
          </div>
          <div style={{ padding: 16 }}>
            {recentTransactions.length === 0 ? <EmptyState icon={<Wallet size={24} color="#94a3b8" />} title="No transactions yet" subtitle="Completed consultations and withdrawals will appear here." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {recentTransactions.map(tx => {
                  const isWithdrawal = tx.type === 'withdrawal';
                  return (
                    <div key={tx._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, border: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`, borderRadius: 12, background: isDark ? "#111827" : "#fff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: isWithdrawal ? "#fee2e2" : "#dcfce7", color: isWithdrawal ? "#dc2626" : "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontWeight: 700 }}>{isWithdrawal ? '↑' : '$'}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#f8fafc" : "#0f172a" }}>{tx.description || (isWithdrawal ? "Withdrawal" : "Consultation Earning")}</div>
                          <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", marginTop: 2 }}>{new Date(tx.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: isWithdrawal ? (isDark ? "#ef4444" : "#dc2626") : (isDark ? "#10b981" : "#16a34a") }}>{isWithdrawal ? '-' : '+'}${tx.amount}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: isWithdrawal ? "#dc2626" : "#64748b", textTransform: "uppercase", marginTop: 4 }}>{tx.status}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export default function DoctorDashboard() {
  const isDark = useDarkMode();
  const { user, setUser, logout, wsConnected } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ todayAppointments: 0, totalPatients: 0, totalAppointments: 0, feedbackProvided: 0, pendingFeedback: 0 });
  const [appointments, setAppointments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [doctorPatients, setDoctorPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const activeChatRef = useRef(null);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  const activeCallRef = useRef(null);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  const remindedAppts = useRef(new Set());
  const [incomingCall, setIncomingCall] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, status: null, title: "", message: "" });
  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const addToast = useCallback((t) => {
    const id = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, ...t }]);
    if (t.autoClose) {
      setTimeout(() => {
        if (isMounted.current) setToasts((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    }
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleToastAction = useCallback(
    (id, actionType, data) => {
      if (actionType === "answer" && data?.callData) {
        setIncomingCall(data.callData);
      } else if (actionType === "decline" && data?.callData) {
        websocketService.emit("call:reject", {
          appointmentId: data.callData.appointmentId,
          userId: user?.id,
        });
        setIncomingCall(null);
      } else if (actionType === "reply") {
        setActiveChat({ appointmentId: data.appointmentId, id: data.senderId, name: data.senderName });
      }
    },
    [user?.id],
  );

  const fetchDashboardData = useCallback(async (showToast = false) => {
    try {
      const [statsRes, appointmentsRes, prescRes, recordsRes] = await Promise.all([
        apiClient.get("/stats"),
        apiClient.get("/appointments"),
        apiClient.get("/prescriptions").catch(() => ({ data: { prescriptions: [] } })),
        apiClient.get("/health-records").catch(() => ({ data: { records: [] } })),
      ]);
      setStats(statsRes.data);
      const appts = appointmentsRes.data;
      setAppointments(appts);
      const records = recordsRes.data?.records || [];
      setHealthRecords(records);

      const patientMap = new Map();
      const addPatient = (obj) => {
        if (!obj) return;
        const id = obj._id || obj;
        if (typeof id !== "string") return;
        if (!patientMap.has(id)) {
          patientMap.set(id, { _id: id, name: obj.name || "Unknown Patient", email: obj.email || "" });
        }
      };
      appts.forEach((a) => addPatient(a.patientId));
      (prescRes.data.prescriptions || []).forEach((p) => addPatient(p.patientId));
      (recordsRes.data.records || recordsRes.data || []).forEach((r) => addPatient(r.patientId));

      setDoctorPatients([...patientMap.values()].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await apiClient.get("/doctors/transactions");
      setTransactions(res.data);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchTransactions();
    if (user?.id) websocketService.notifyOnline(user.id);

    const handleAppointmentUpdate = (data) => {
      fetchDashboardData();
      if (data?.initiatorId === user?.id) return;
      addToast({ type: "appointment", title: "Appointment Updated", message: "An appointment was updated", autoClose: true });
    };

    const handleNewAppointment = (data) => {
      fetchDashboardData();
      if (data?.initiatorId === user?.id) return;
      addToast({ type: "appointment", title: "New Appointment Request", message: `${data.appointment?.patientName || "A patient"} requested an appointment`, autoClose: true });
    };

    const handleIncomingCall = (data) => {
      // Don't show if already in a call for this specific appointment
      if (activeCallRef.current?.appointmentId?.toString() === data.appointmentId?.toString()) return;
      if (activeCallRef.current) return; // Don't show if already in another call
      setIncomingCall(data);
      addToast({
        type: "call",
        title: "Incoming Video Call",
        message: `${data.callerName} is calling`,
        actions: [
          { label: "Answer", type: "answer", primary: true, data: { callData: data } },
          { label: "Decline", type: "decline", data: { callData: data } },
        ],
      });
    };

    const handlePrescriptionCreated = (data) => {
      fetchDashboardData();
      if (data?.initiatorId === user?.id) return;
      addToast({ type: "prescription", title: "New Prescription", message: `Prescription for ${data.prescription?.patientId?.name || "patient"} added`, autoClose: true });
    };

    const handlePrescriptionUpdated = (data) => {
      if (data?.initiatorId === user?.id) return;
      addToast({ type: "success", title: "Prescription Updated", message: `Prescription updated successfully`, autoClose: true });
    };

    const handleHealthRecordCreated = (data) => {
      fetchDashboardData();
      if (data?.initiatorId === user?.id) return;
      addToast({ type: "record", title: "New Health Record", message: `A new record "${data.record?.title}" requires your feedback`, autoClose: true });
    };

    const handleHealthRecordUpdated = (data) => {
      fetchDashboardData();
      if (data?.initiatorId === user?.id) return;
      addToast({ type: "record", title: "Record Updated", message: `Health record updated by patient`, autoClose: true });
    };

    const handleChatMessage = (data) => {
      fetchDashboardData();
      if (activeChatRef.current?.appointmentId?.toString() === data.appointmentId?.toString()) return;
      addToast({ type: "chat", title: `New message from ${data.senderName}`, message: data.content.length > 40 ? data.content.substring(0, 40) + '...' : data.content, autoClose: true, actions: [{ label: "Reply", type: "reply", primary: true, data: { appointmentId: data.appointmentId, senderId: data.sender, senderName: data.senderName } }] });
    };

    const handleAppointmentDeleted = (data) => {
      fetchDashboardData();
      if (data?.initiatorId === user?.id) return;
      addToast({ type: "info", title: "Appointment Removed", message: "An appointment was deleted by the patient.", autoClose: true });
    };

    websocketService.onAppointmentUpdated(handleAppointmentUpdate);
    websocketService.on("appointment:created", handleNewAppointment);
    websocketService.onAppointmentDeleted(handleAppointmentDeleted);
    websocketService.on("call:incoming", handleIncomingCall);
    websocketService.onPrescriptionCreated(handlePrescriptionCreated);
    websocketService.onPrescriptionUpdated(handlePrescriptionUpdated);
    websocketService.onHealthRecordCreated(handleHealthRecordCreated);
    websocketService.onHealthRecordUpdated(handleHealthRecordUpdated);
    websocketService.onChatMessage(handleChatMessage);

    const interval = setInterval(() => { fetchDashboardData(); fetchTransactions(); }, 30000);

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
              message: `You have an appointment with ${apt.patientName} in 5 minutes!`,
              autoClose: false
            });
          }
        }
      });
    }, 60000);

    return () => {
      websocketService.off("appointment:updated", handleAppointmentUpdate);
      websocketService.off("appointment:created", handleNewAppointment);
      websocketService.offAppointmentDeleted(handleAppointmentDeleted);
      websocketService.off("call:incoming", handleIncomingCall);
      websocketService.offPrescriptionCreated(handlePrescriptionCreated);
      websocketService.offPrescriptionUpdated(handlePrescriptionUpdated);
      websocketService.offHealthRecordCreated(handleHealthRecordCreated);
      websocketService.offHealthRecordUpdated(handleHealthRecordUpdated);
      websocketService.offChatMessage(handleChatMessage);
      clearInterval(interval);
      clearInterval(checkUpcomingInterval);
    };
  }, [fetchDashboardData, fetchTransactions, addToast]);

  const startVideoCall = (apt) => {
    const callObj = {
      appointmentId: apt._id,
      otherUserId: apt.patientId?._id || apt.patientId,
      otherUserName: apt.patientName,
      isDoctor: true,
    };
    activeCallRef.current = callObj;
    setActiveCall(callObj);
  };

  const answerCall = () => {
    if (!incomingCall) return;
    const appointment = appointments.find((a) => a._id === incomingCall.appointmentId);
    if (appointment) {
      startVideoCall(appointment);
    } else {
      setActiveCall({
        appointmentId: incomingCall.appointmentId,
        otherUserId: incomingCall.callerId,
        otherUserName: incomingCall.callerName,
        isDoctor: true,
      });
    }
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (incomingCall) {
      websocketService.emit("call:reject", { appointmentId: incomingCall.appointmentId, userId: user?.id });
      setIncomingCall(null);
    }
  };

  const updateStatus = async (appointmentId, status) => {
    const messages = {
      completed: { title: "Mark Completed", msg: "Mark this consultation as completed?" },
      confirmed: { title: "Confirm Appointment", msg: "Confirm this appointment request?" },
      cancelled: { title: "Decline Appointment", msg: "Are you sure you want to decline this request?" }
    };
    const m = messages[status] || { title: "Update Status", msg: `Update appointment status to ${status}?` };
    setConfirmModal({ open: true, id: appointmentId, status, title: m.title, message: m.msg });
  };

  const handleConfirmStatus = async () => {
    const { id, status } = confirmModal;
    if (!id || !status) return;
    try {
      await apiClient.patch(`/appointments/${id}`, { status });
      fetchDashboardData();
      addToast({ type: "success", title: "Status Updated", message: `Appointment ${status}`, autoClose: true });
    } catch (err) {
      console.error(err);
      addToast({ type: "error", title: "Update Failed", message: "Could not update appointment status." });
    }
  };

  const deleteAppointment = async (id) => {
    try {
      await apiClient.delete(`/appointments/${id}`);
      fetchDashboardData();
      addToast({ type: "success", title: "Appointment Deleted", message: "The completed appointment was removed.", autoClose: true });
    } catch (err) {
      console.error(err);
      addToast({ type: "error", title: "Failed to delete", message: "Could not remove appointment.", autoClose: true });
    }
  };

  const saveSettings = async (availability) => {
    try {
      const { data } = await apiClient.put("/doctors/settings", { availability });
      setUser(data);
      addToast({ type: "success", title: "Settings Saved", message: "Your availability schedule has been updated.", autoClose: true });
    } catch (err) {
      console.error(err);
      addToast({ type: "error", title: "Save Failed", message: "Could not update settings." });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview": return (
        <Overview 
          stats={stats} 
          appointments={appointments} 
          pendingFeedbacks={healthRecords.filter(r => !r.notes || r.notes.trim() === "").slice(0, 5)}
          onStartCall={startVideoCall} 
          onUpdateStatus={updateStatus} 
          onMessage={setActiveChat}
          onRefresh={() => fetchDashboardData()} 
          onViewHealth={() => setActiveTab("health-records")}
        />
      );
      case "appointments": return <AppointmentManagement appointments={appointments} onStartCall={startVideoCall} onMessage={setActiveChat} onUpdateStatus={updateStatus} onDelete={deleteAppointment} />;
      case "patients": return <PatientList appointments={appointments} doctorPatients={doctorPatients} />;
      case "schedule": return <ScheduleView appointments={appointments} />;
      case "reports": return <Reports stats={stats} appointments={appointments} />;
      case "prescriptions": return <Prescriptions doctorPatients={doctorPatients} onRefresh={() => fetchDashboardData()} />;
      case "health-records": return <HealthRecords doctorPatients={doctorPatients} onRefresh={() => fetchDashboardData()} />;
      case "wallet": return <WalletView stats={stats} transactions={transactions} onRefresh={() => { fetchDashboardData(); fetchTransactions(); }} addToast={addToast} />;
      case "settings": return <SettingsView user={user} onSave={saveSettings} />;

      default: return null;
    }
  };

  return (
    <div className="dm-page-shell" style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      {activeChat && <Chat appointmentId={activeChat.appointmentId} receiverId={activeChat.id} receiverName={activeChat.name} onClose={() => setActiveChat(null)} onRead={() => fetchDashboardData()} />}
      <ToastStack toasts={toasts} onDismiss={dismissToast} onAction={handleToastAction} />
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null, status: null, title: "", message: "" })}
        onConfirm={handleConfirmStatus}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Confirm"
        variant={confirmModal.status === "cancelled" ? "danger" : "primary"}
      />

      {incomingCall && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: 24, padding: 32, width: "100%", maxWidth: 400, textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" }}>
            <div style={{ width: 80, height: 80, background: "#1db585", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "#fff", animation: "pulse 2s infinite" }}>
              <Phone size={36} />
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Incoming Call</h3>
            <p style={{ fontSize: 16, color: "#64748b", marginBottom: 32 }}>{incomingCall.callerName} is calling...</p>
            <div style={{ display: "flex", gap: 16 }}>
              <Btn onClick={rejectCall} variant="danger" style={{ flex: 1, padding: "16px 0", justifyContent: "center" }}>Decline</Btn>
              <Btn onClick={answerCall} variant="success" style={{ flex: 1, padding: "16px 0", justifyContent: "center" }}>Answer</Btn>
            </div>
          </div>
        </div>
      )}

      {activeCall && (
        <VideoCall
          appointmentId={activeCall.appointmentId}
          otherUserId={activeCall.otherUserId}
          otherUserName={activeCall.otherUserName}
          isDoctor={true}
          onCallEnd={() => {
            setActiveCall(null);
            fetchDashboardData();
            addToast({ type: "info", title: "Call Ended", message: "The video call has ended", autoClose: true });
          }}
        />
      )}

      <MobileHeader onMenuClick={() => setMobileNavOpen(true)} user={user} />
      <Sidebar 
        user={user} 
        navItems={getNavItems(
          stats?.pendingAppointments || appointments.filter((a) => a.status === "pending").length,
          stats?.pendingFeedback || 0,
          stats?.pendingPrescriptions || 0
        )} 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "messages" && stats?.unreadMessages > 0) {
            setStats(prev => ({ ...prev, unreadMessages: 0 }));
          }
          if (tab === "health-records" && stats?.pendingFeedback > 0) {
            setStats(prev => ({ ...prev, pendingFeedback: 0 }));
          }
        }} 
        onLogout={logout} 
        wsConnected={wsConnected} 
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      
      <div className="dm-page-content">
        <div className="dm-page-inner">
          {loading ? <Loader message="Loading dashboard..." /> : renderContent()}
        </div>
      </div>
      <style>{`@keyframes slideRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}} @keyframes progressBar{from{width:100%}to{width:0}} @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.8;transform:scale(1.05)}}`}</style>
    </div>
  );
}
