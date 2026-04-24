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
import { Sidebar, StatCard, EmptyState, SectionCard, Badge, Loader, MobileHeader } from "../components/UI";
import { 
  Home, Brain, HeartPulse, Stethoscope, CalendarPlus, Calendar, 
  ClipboardList, Pill, Smile, Phone, CheckCircle, XCircle, Info, X, Check, Clock,
  Droplet, Footprints, Moon, Salad, MessageSquare
} from "lucide-react";

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

function Overview({ stats, appointments, onStartCall, onCancelAppt, onRefresh }) {
  const upcoming = appointments.filter(a => new Date(a.date) >= new Date() && a.status !== "cancelled").slice(0, 4);
  const statusBadge = { confirmed: ["#dcfce7","#166534"], pending: ["#fef9c3","#854d0e"], completed: ["#dbeafe","#1e40af"], cancelled: ["#fee2e2","#991b1b"] };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em" }}>Dashboard</h1>
          <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b", marginTop: 2 }}>Here's your health overview at a glance.</p>
        </div>
        <button className="dm-outline-btn" onClick={onRefresh} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13.5, fontWeight: 500, color: "#475569", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#cbd5e1"} onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Refresh
        </button>
      </div>
      <div className="dm-grid-stats" style={{ marginBottom: 24 }}>
        <StatCard label="Total appointments" value={stats?.totalAppointments || 0} sub="All time" icon={<Calendar size={18} color="#1db585" />} />
        <StatCard label="Upcoming" value={stats?.upcomingAppointments || 0} sub="Scheduled" color="#3b82f6" icon={<CalendarPlus size={18} color="#3b82f6" />} />
        <StatCard label="Health checks" value={stats?.totalPredictions || 0} sub="AI screenings" color="#8b5cf6" icon={<Brain size={18} color="#8b5cf6" />} />
        <StatCard label="New Medical Data" value={(stats?.unreadHealthRecords || 0) + (stats?.unreadPrescriptions || 0)} sub="Unread items" color="#10b981" icon={<MessageSquare size={18} color="#10b981" />} />
      </div>
      <div className="dm-grid-two">
        {/* Upcoming appointments */}
        <SectionCard>
          <div className="dm-section-header" style={{ padding: "16px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Upcoming appointments</div>
            <span className="dm-soft-muted" style={{ fontSize: 12.5, color: "#94a3b8" }}>{upcoming.length} scheduled</span>
          </div>
          <div style={{ padding: 16 }}>
            {upcoming.length === 0 ? <EmptyState icon={<Calendar size={24} color="#94a3b8" />} title="No upcoming appointments" subtitle="Book a consultation with a specialist." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {upcoming.map(apt => {
                  const [bg, color] = statusBadge[apt.status] || statusBadge.pending;
                  return (
                    <div className="dm-soft-panel" key={apt._id} style={{ padding: "12px 14px", border: "1px solid #f1f5f9", borderRadius: 12, background: "#fafafa" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div className="dm-soft-text" style={{ fontSize: 13.5, fontWeight: 500, color: "#1e293b" }}>{apt.doctorName}</div>
                        <span style={{ display: "inline-flex", padding: "2px 9px", fontSize: 11, fontWeight: 600, borderRadius: 999, background: bg, color }}>{apt.status}</span>
                      </div>
                      <div className="dm-soft-muted" style={{ fontSize: 12.5, color: "#94a3b8" }}>{new Date(apt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {apt.time}</div>
                      {apt.status === "confirmed" && (
                        <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
                          <button onClick={() => onStartCall(apt)} style={{ flex: 1, padding: "7px", fontSize: 12.5, fontWeight: 500, background: "#1db585", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Join call</button>
                          <button onClick={() => onCancelAppt(apt._id)} style={{ padding: "7px 12px", fontSize: 12.5, background: "#fff", color: "#ef4444", border: "1.5px solid #fca5a5", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
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
          <div className="dm-section-header" style={{ padding: "16px 20px", borderBottom: "1px solid #f8fafc" }}>
            <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Daily health tips</div>
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

function AppointmentHistory({ appointments, onStartCall, onCancelAppt, onRefresh }) {
  const statusStyle = { confirmed: ["#dcfce7","#166534"], pending: ["#fef9c3","#854d0e"], completed: ["#dbeafe","#1e40af"], cancelled: ["#fee2e2","#991b1b"] };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em" }}>My Appointments</h1>
          <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b", marginTop: 2 }}>{appointments.length} total appointments in your history.</p>
        </div>
        <button className="dm-outline-btn" onClick={onRefresh} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13.5, fontWeight: 500, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Refresh
        </button>
      </div>
      <SectionCard>
        {appointments.length === 0 ? <EmptyState icon={<Calendar size={24} color="#94a3b8" />} title="No appointments yet" subtitle="Start by booking your first consultation." /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead className="dm-table-head"><tr style={{ background: "#f8fafc" }}>
                {["Doctor", "Date & Time", "Reason", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #f1f5f9" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {appointments.map(apt => {
                  const [bg, color] = statusStyle[apt.status] || statusStyle.pending;
                  return (
                    <tr className="dm-table-row" key={apt._id} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td className="dm-table-cell" style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1db585", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 12, flexShrink: 0 }}>{apt.doctorName?.charAt(0)}</div>
                          <span className="dm-soft-text" style={{ fontWeight: 500, color: "#1e293b" }}>{apt.doctorName}</span>
                        </div>
                      </td>
                      <td className="dm-table-cell" style={{ padding: "12px 16px" }}>
                        <div className="dm-soft-text" style={{ fontWeight: 500, color: "#1e293b" }}>{new Date(apt.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        <div className="dm-soft-muted" style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 1 }}>{apt.time}</div>
                      </td>
                      <td className="dm-table-cell dm-soft-muted" style={{ padding: "12px 16px", color: "#64748b" }}>{apt.reason || "General consultation"}</td>
                      <td className="dm-table-cell" style={{ padding: "12px 16px" }}>
                        <span style={{ display: "inline-flex", padding: "3px 10px", fontSize: 12, fontWeight: 500, borderRadius: 999, background: bg, color }}>{apt.status}</span>
                      </td>
                      <td className="dm-table-cell" style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {apt.status === "confirmed" && <>
                            <button onClick={() => onStartCall(apt)} style={{ padding: "5px 12px", fontSize: 12.5, fontWeight: 500, background: "#1db585", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}>Join call</button>
                            <button onClick={() => onCancelAppt(apt._id)} style={{ padding: "5px 12px", fontSize: 12.5, background: "#fff", color: "#ef4444", border: "1.5px solid #fca5a5", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                          </>}
                          {apt.status === "pending" && <button onClick={() => onCancelAppt(apt._id)} style={{ padding: "5px 12px", fontSize: 12.5, background: "#fff", color: "#ef4444", border: "1.5px solid #fca5a5", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}



// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function PatientDashboard() {
  const { user, logout, wsConnected } = useAuth();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState({ unreadHealthRecords: 0, unreadPrescriptions: 0, totalAppointments: 0, upcomingAppointments: 0, totalPredictions: 0 });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);
  const activeCallRef = useRef(null);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  const [toasts, setToasts] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const apptRef = useRef(appointments);
  useEffect(() => { apptRef.current = appointments; }, [appointments]);

  const addToast = useCallback(t => {
    const id = Date.now();
    setToasts(p => [...p, { id, ...t }]);
    if (t.autoClose) setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 5000);
  }, []);
  const dismissToast = useCallback(id => setToasts(p => p.filter(x => x.id !== id)), []);
  const handleToastAction = useCallback((id, type, data) => {
    if (type === "accept" && data?.appointment && data?.callData) startCall(data.appointment, data.callData);
    else if (type === "decline" && data?.callData) websocketService.emit("call:reject", { appointmentId: data.callData.appointmentId, userId: user.id });
    else if (type === "view-prescriptions") setTab("prescriptions");
    else if (type === "view-health") setTab("health");
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

  useEffect(() => {
    fetchData();
    if (user?.id) websocketService.notifyOnline(user.id);
    const onApptUpdate = d => { 
      fetchData(); 
      if (d?.initiatorId === user?.id) return;
      addToast({ type: "appointment", title: "Appointment updated", message: `Status: ${d.appointment?.status}`, autoClose: true }); 
    };
    const onCall = d => {
      // Don't show if already in a call for this specific appointment
      if (activeCallRef.current?.appointmentId?.toString() === d.appointmentId?.toString()) {
        return;
      }
      if (activeCallRef.current) return; // Don't show if in another call already
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
    websocketService.onAppointmentUpdated(onApptUpdate);
    websocketService.on("call:incoming", onCall);
    websocketService.onPrescriptionCreated(onRxCreated); websocketService.onPrescriptionUpdated(onRxUpdated); websocketService.onPrescriptionDeleted(onRxDeleted);
    websocketService.onHealthRecordCreated(onRecCreated); websocketService.onHealthRecordUpdated(onRecUpdated); websocketService.onHealthRecordDeleted(onRecDeleted);
    return () => {
      websocketService.off("appointment:updated", onApptUpdate); websocketService.off("call:incoming", onCall);
      websocketService.offPrescriptionCreated(onRxCreated); websocketService.offPrescriptionUpdated(onRxUpdated); websocketService.offPrescriptionDeleted(onRxDeleted);
      websocketService.offHealthRecordCreated(onRecCreated); websocketService.offHealthRecordUpdated(onRecUpdated); websocketService.offHealthRecordDeleted(onRecDeleted);
    };
  }, [fetchData, addToast]);

  const startCall = (apt, callData = null) => {
    const callObj = { appointmentId: apt._id, otherUserId: apt.doctorId?._id || apt.doctorId, otherUserName: apt.doctorName, isDoctor: false, incomingCallData: callData };
    activeCallRef.current = callObj;
    setActiveCall(callObj);
  };
  const cancelAppt = async id => {
    if (!window.confirm("Cancel this appointment?")) return;
    try { await apiClient.patch(`/appointments/${id}`, { status: "cancelled" }); fetchData(); addToast({ type: "success", title: "Appointment cancelled", autoClose: true }); }
    catch { addToast({ type: "error", title: "Failed to cancel", autoClose: true }); }
  };

  const renderTab = () => {
    switch (tab) {
      case "overview":    return <Overview stats={stats} appointments={appointments} onStartCall={startCall} onCancelAppt={cancelAppt} onRefresh={() => fetchData()} />;
      case "diabetes":    return <DiabetesPrediction />;
      case "heart":       return <HeartDiseasePrediction />;
      case "pneumonia":   return <PneumoniaPrediction />;
      case "tumor":       return <BrainTumorPrediction />;

      case "book":        return <AppointmentBooking onBookingComplete={() => { fetchData(); addToast({ type: "success", title: "Appointment booked", message: "Doctor will confirm within 24 hours.", autoClose: true }); }} />;
      case "history":     return <AppointmentHistory appointments={appointments} onStartCall={startCall} onCancelAppt={cancelAppt} onRefresh={() => fetchData()} />;
      case "health":      return <HealthRecords onRefresh={fetchData} />;
      case "prescriptions": return <Prescriptions onRefresh={fetchData} />;

      default: return null;
    }
  };

  return (
    <div className="dm-page-shell" style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      {activeCall && <VideoCall {...activeCall} onCallEnd={() => { setActiveCall(null); fetchData(); addToast({ type: "info", title: "Call ended", autoClose: true }); }} />}
      <ToastStack toasts={toasts} onDismiss={dismissToast} onAction={handleToastAction} />
      <MobileHeader onMenuClick={() => setMobileNavOpen(true)} user={user} />
      <Sidebar user={user} navItems={getNavItems(
        appointments.filter(a => a.status === "confirmed" || a.status === "pending").length,
        stats?.unreadHealthRecords || 0,
        stats?.unreadPrescriptions || 0
      )} activeTab={tab} onTabChange={setTab} onLogout={logout} wsConnected={wsConnected} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="dm-page-content">
        <div className="dm-page-inner">
          {loading ? <Loader message="Loading your dashboard…" /> : renderTab()}
        </div>
      </div>
      <style>{`@keyframes slideRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}} @keyframes progressBar{from{width:100%}to{width:0}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
