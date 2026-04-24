import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import websocketService from "../services/websocket";
import VideoCall from "../components/VideoCall";
import apiClient from "../services/apiClient";
import Prescriptions from "../components/Prescriptions";
import HealthRecords from "../components/HealthRecords";
import { Sidebar, StatCard, EmptyState, SectionCard, Badge, Loader, Btn, PageHeader, MobileHeader } from "../components/UI";
import { 
  Home, Calendar, CalendarClock, Users, FileText, Pill, ClipboardList, 
  Phone, CheckCircle, XCircle, Info, X, Check, RefreshCw, CalendarDays, MessageSquare,
  ClipboardCheck
} from "lucide-react";

// ─── Nav items ────────────────────────────────────────────────────────────────

function getNavItems(apptCount, feedbackCount) {
  return [
    { section: "Main" },
    { id: "overview",  label: "Overview",        icon: <Home size={18} /> },
    { id: "appointments", label: "Appointments",  icon: <Calendar size={18} />, badge: apptCount },
    { id: "schedule",  label: "Schedule",        icon: <CalendarClock size={18} /> },
    { section: "Practice" },
    { id: "patients",  label: "My Patients",     icon: <Users size={18} /> },
    { id: "reports",   label: "Reports",         icon: <FileText size={18} /> },
    { section: "Medical" },
    { id: "prescriptions", label: "Prescriptions", icon: <Pill size={18} /> },
    { id: "health-records", label: "Health Records", icon: <ClipboardList size={18} />, badge: feedbackCount },
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
      default: return <Info size={16} color="#64748b" />;
    }
  };

  const typeColor = { call: "#16a34a", appointment: "#2563eb", success: "#16a34a", error: "#dc2626", prescription: "#7c3aed", record: "#0891b2", info: "#64748b" };
  
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

function Overview({ stats, appointments, pendingFeedbacks, onStartCall, onUpdateStatus, onRefresh, onViewHealth }) {
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
        <StatCard label="Today's Appointments" value={stats?.todayAppointments || 0} icon={<CalendarDays size={18} color="#1db585" />} color="#1db585" />
        <StatCard label="Total Patients" value={stats?.totalPatients || 0} icon={<Users size={18} color="#3b82f6" />} color="#3b82f6" />
        <StatCard label="Pending Feedback" value={stats?.pendingFeedback || 0} icon={<ClipboardList size={18} color="#eab308" />} color="#eab308" />
        <StatCard label="Total Appointments" value={stats?.totalAppointments || 0} icon={<Calendar size={18} color="#8b5cf6" />} color="#8b5cf6" />
        <StatCard label="Feedback Given" value={stats?.feedbackProvided || 0} icon={<MessageSquare size={18} color="#10b981" />} color="#10b981" />
      </div>
      
      <div className="dm-grid-two">
        {/* Today's Schedule */}
        <SectionCard>
          <div className="dm-section-header" style={{ padding: "16px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Today's Schedule</div>
          </div>
          <div style={{ padding: 16 }}>
            {todayAppointments.length === 0 ? <EmptyState icon={<Calendar size={24} color="#94a3b8" />} title="No appointments today" subtitle="Enjoy your free time." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {todayAppointments.map(apt => {
                  const [bg, color] = statusBadge[apt.status] || statusBadge.pending;
                  return (
                    <div className="dm-card-row" key={apt._id} style={{ padding: "12px 14px", border: "1px solid #f1f5f9", borderRadius: 12, background: "#fafafa" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div>
                          <div className="dm-soft-text" style={{ fontSize: 13.5, fontWeight: 500, color: "#1e293b" }}>{apt.patientName}</div>
                          <div className="dm-soft-muted" style={{ fontSize: 12.5, color: "#94a3b8" }}>{apt.time}</div>
                        </div>
                        <span style={{ display: "inline-flex", padding: "2px 9px", fontSize: 11, fontWeight: 600, borderRadius: 999, background: bg, color }}>{apt.status}</span>
                      </div>
                      {apt.status === "confirmed" && (
                        <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
                          <Btn onClick={() => onStartCall(apt)} style={{ flex: 1 }} size="sm">Start Call</Btn>
                          <Btn onClick={() => window.confirm("Mark complete?") && onUpdateStatus(apt._id, "completed")} variant="outline" style={{ flex: 1 }} size="sm">Mark Complete</Btn>
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
          <div className="dm-section-header" style={{ padding: "16px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Pending Feedbacks</div>
            <button onClick={onViewHealth} style={{ fontSize: 12, color: "#1db585", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>View All</button>
          </div>
          <div style={{ padding: 16 }}>
            {pendingFeedbacks.length === 0 ? <EmptyState icon={<ClipboardCheck size={24} color="#94a3b8" />} title="All feedback completed" subtitle="Great job! You're all caught up." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pendingFeedbacks.map(rec => (
                  <div className="dm-card-row" key={rec._id} style={{ padding: "12px 14px", border: "1px solid #f1f5f9", borderRadius: 12, background: "#fafafa" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div className="dm-soft-text" style={{ fontSize: 13.5, fontWeight: 500, color: "#1e293b" }}>{rec.title}</div>
                      <span style={{ fontSize: 11, padding: "2px 8px", background: "#fef9c3", color: "#854d0e", borderRadius: 999, fontWeight: 600 }}>Needs Review</span>
                    </div>
                    <div className="dm-soft-muted" style={{ fontSize: 12.5, color: "#64748b" }}>Patient: {rec.patientId?.name || "Patient"}</div>
                    <div className="dm-soft-muted" style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>{new Date(rec.createdAt).toLocaleDateString()}</div>
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

function AppointmentManagement({ appointments, onStartCall, onUpdateStatus }) {
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
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "pending", "confirmed", "completed", "cancelled"].map(s => (
            <button className={filter === s ? "" : "dm-outline-btn"} key={s} onClick={() => setFilter(s)}
              style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: filter === s ? 500 : 400, fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s", border: filter === s ? "none" : "1px solid #e2e8f0", background: filter === s ? "#1db585" : "#fff", color: filter === s ? "#fff" : "#475569" }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      <SectionCard>
        {filtered.length === 0 ? <EmptyState icon={<Calendar size={24} color="#94a3b8" />} title="No appointments found" subtitle="Try changing your filters." /> : (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(apt => {
                const [bg, color] = statusBadge[apt.status] || statusBadge.pending;
                return (
                  <div className="dm-card-row" key={apt._id} style={{ padding: "16px", border: "1px solid #f1f5f9", borderRadius: 12, background: "#fafafa", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div className="dm-soft-text" style={{ fontSize: 15, fontWeight: 500, color: "#1e293b" }}>{apt.patientName}</div>
                      <div className="dm-soft-muted" style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{new Date(apt.date).toLocaleDateString()} at {apt.time}</div>
                      {apt.reason && <div className="dm-soft-muted" style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 4 }}>{apt.reason}</div>}
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
                      <span style={{ display: "inline-flex", padding: "4px 10px", fontSize: 12, fontWeight: 600, borderRadius: 999, background: bg, color }}>{apt.status.toUpperCase()}</span>
                      
                      <div style={{ display: "flex", gap: 8 }}>
                        {apt.status === "confirmed" && (
                          <>
                            <Btn onClick={() => onStartCall(apt)} size="sm">Start Call</Btn>
                            <Btn onClick={() => window.confirm("Mark complete?") && onUpdateStatus(apt._id, "completed")} variant="outline" size="sm">Complete</Btn>
                          </>
                        )}
                        {apt.status === "pending" && (
                          <>
                            <Btn onClick={() => onUpdateStatus(apt._id, "confirmed")} variant="success" size="sm">Confirm</Btn>
                            <Btn onClick={() => onUpdateStatus(apt._id, "cancelled")} variant="danger" size="sm">Decline</Btn>
                          </>
                        )}
                      </div>
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
          <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
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

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export default function DoctorDashboard() {
  const { user, logout, wsConnected } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ todayAppointments: 0, totalPatients: 0, totalAppointments: 0, feedbackProvided: 0, pendingFeedback: 0 });
  const [appointments, setAppointments] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [doctorPatients, setDoctorPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);
  const activeCallRef = useRef(null);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((t) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, ...t }]);
    if (t.autoClose) {
      setTimeout(() => setToasts((prev) => prev.filter((n) => n.id !== id)), 5000);
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

  useEffect(() => {
    fetchDashboardData();
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

    websocketService.onAppointmentUpdated(handleAppointmentUpdate);
    websocketService.on("appointment:created", handleNewAppointment);
    websocketService.on("call:incoming", handleIncomingCall);
    websocketService.onPrescriptionCreated(handlePrescriptionCreated);
    websocketService.onPrescriptionUpdated(handlePrescriptionUpdated);
    websocketService.onHealthRecordCreated(handleHealthRecordCreated);
    websocketService.onHealthRecordUpdated(handleHealthRecordUpdated);

    const interval = setInterval(() => fetchDashboardData(), 30000);

    return () => {
      websocketService.off("appointment:updated", handleAppointmentUpdate);
      websocketService.off("appointment:created", handleNewAppointment);
      websocketService.off("call:incoming", handleIncomingCall);
      websocketService.offPrescriptionCreated(handlePrescriptionCreated);
      websocketService.offPrescriptionUpdated(handlePrescriptionUpdated);
      websocketService.offHealthRecordCreated(handleHealthRecordCreated);
      websocketService.offHealthRecordUpdated(handleHealthRecordUpdated);
      clearInterval(interval);
    };
  }, [fetchDashboardData, addToast]);

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
    try {
      await apiClient.patch(`/appointments/${appointmentId}`, { status });
      fetchDashboardData();
      addToast({ type: "success", title: "Status Updated", message: `Appointment ${status}`, autoClose: true });
    } catch {
      addToast({ type: "error", title: "Error", message: "Failed to update appointment", autoClose: true });
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
          onRefresh={() => fetchDashboardData()} 
          onViewHealth={() => setActiveTab("health-records")}
        />
      );
      case "appointments": return <AppointmentManagement appointments={appointments} onStartCall={startVideoCall} onUpdateStatus={updateStatus} />;
      case "patients": return <PatientList appointments={appointments} doctorPatients={doctorPatients} />;
      case "schedule": return <ScheduleView appointments={appointments} />;
      case "reports": return <Reports stats={stats} appointments={appointments} />;
      case "prescriptions": return <Prescriptions doctorPatients={doctorPatients} onRefresh={() => fetchDashboardData()} />;
      case "health-records": return <HealthRecords doctorPatients={doctorPatients} onRefresh={() => fetchDashboardData()} />;

      default: return null;
    }
  };

  return (
    <div className="dm-page-shell" style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} onAction={handleToastAction} />

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
          appointments.filter((a) => a.status === "pending").length,
          stats?.pendingFeedback || 0
        )} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
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
