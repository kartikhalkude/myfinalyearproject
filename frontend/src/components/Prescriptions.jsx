import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import websocketService from "../services/websocket";
import { SectionCard, Badge, EmptyState, Loader, PageHeader } from "./UI";
import { X, Pill, Search, Calendar, User, Clock, FileText, Edit2, Trash2, Plus, CheckCircle, AlertCircle, ChevronRight, Bell, ClipboardList } from "lucide-react";

function PatientSearch({ patients, value, onChange }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);
  const selected = patients.find(p => p._id === value);
  const filtered = q.trim() ? patients.filter(p => p.email?.toLowerCase().includes(q.toLowerCase()) || p.name?.toLowerCase().includes(q.toLowerCase())) : patients;

  useEffect(() => {
    const handler = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div 
        className={focused || open ? "dm-search-trigger dm-search-trigger-active" : "dm-search-trigger"}
        style={{ 
          display: "flex", alignItems: "center", padding: "12px 16px", background: focused || open ? "#fff" : "#f8fafc", 
          border: "1px solid", borderColor: focused || open ? "#10b981" : "#e2e8f0", borderRadius: 12, cursor: "text", 
          boxShadow: focused || open ? "0 0 0 4px rgba(16, 185, 129, 0.1)" : "none", transition: "all 0.2s" 
        }} 
        onClick={() => setOpen(true)}
      >
        <Search size={16} color="#94a3b8" style={{ flexShrink: 0, marginRight: 10 }} />
        {selected && !open ? (
          <span className="dm-soft-text" style={{ flex: 1, fontSize: 14, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <strong style={{ fontWeight: 600 }}>{selected.name}</strong> <span style={{ color: "#64748b", marginLeft: 4 }}>({selected.email})</span>
          </span>
        ) : (
          <input type="text" placeholder={selected ? `${selected.name} (${selected.email})` : "Search patient by name or email…"} value={q} autoFocus={open}
            onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => { setFocused(true); setOpen(true); }} onBlur={() => setFocused(false)}
            className="dm-soft-text"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "inherit", color: "#0f172a", background: "transparent", padding: 0 }} />
        )}
        {value && <button type="button" onClick={e => { e.stopPropagation(); onChange(null); setQ(""); }} style={{ marginLeft: 8, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}><X size={16} /></button>}
      </div>
      {open && (
        <div className="dm-search-surface" style={{ position: "absolute", zIndex: 50, top: "calc(100% + 8px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,0.1)", maxHeight: 240, overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 ? <div className="dm-soft-muted" style={{ padding: "12px", fontSize: 13, color: "#64748b", textAlign: "center" }}>No patients found</div> : filtered.map(p => (
            <button key={p._id} type="button" onClick={() => { onChange(p); setOpen(false); setQ(""); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", borderRadius: 8, textAlign: "left", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{p.name?.charAt(0)?.toUpperCase()}</div>
              <div><div className="dm-soft-text" style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{p.name}</div><div className="dm-soft-muted" style={{ fontSize: 12, color: "#64748b" }}>{p.email}</div></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = { patientId: "", diagnosis: "", medicines: [{ name: "", dosage: "", frequency: "", duration: "" }], advice: "", validUntil: "" };
const statusStyle = { active: { bg: "#dcfce7", color: "#166534", border: "#22c55e", icon: <CheckCircle size={14} /> }, expired: { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1", icon: <Clock size={14} /> }, cancelled: { bg: "#fee2e2", color: "#991b1b", border: "#ef4444", icon: <AlertCircle size={14} /> } };

const inputCls = { width: "100%", padding: "12px 16px", fontSize: 14, fontFamily: "inherit", color: "#0f172a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, outline: "none", transition: "all 0.2s", boxSizing: "border-box" };
const onFocus = e => { e.target.style.background = "#fff"; e.target.style.borderColor = "#10b981"; e.target.style.boxShadow = "0 0 0 4px rgba(16, 185, 129, 0.1)"; };
const onBlur = e => { e.target.style.background = "#f8fafc"; e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };

export default function Prescriptions({ doctorPatients, onRefresh }) {
  const { user } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem("dm") === "1" || document.body.classList.contains("dm"));
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [refillLoading, setRefillLoading] = useState({});

  useEffect(() => {
    const syncDark = () => setDark(localStorage.getItem("dm") === "1" || document.body.classList.contains("dm"));
    syncDark();
    const observer = new MutationObserver(syncDark);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("dm-change", syncDark);
    window.addEventListener("storage", syncDark);
    return () => {
      observer.disconnect();
      window.removeEventListener("dm-change", syncDark);
      window.removeEventListener("storage", syncDark);
    };
  }, []);

  const extractArr = (data, keys) => { if (Array.isArray(data)) return data; for (const k of keys) { if (Array.isArray(data?.[k])) return data[k]; } return []; };

  useEffect(() => { if (doctorPatients?.length) setPatients(doctorPatients); }, [doctorPatients]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        if (user?.role === "patient") {
          const r = await apiClient.get("/prescriptions").catch(() => ({ data: [] }));
          setPrescriptions(extractArr(r.data, ["prescriptions", "data"]));
          return;
        }
        const [prescRes, apptRes, recRes] = await Promise.all([
          apiClient.get("/prescriptions").catch(() => ({ data: [] })),
          apiClient.get("/appointments").catch(() => ({ data: [] })),
          apiClient.get("/health-records").catch(() => ({ data: [] })),
        ]);
        const prescs = extractArr(prescRes.data, ["prescriptions", "data"]);
        setPrescriptions(prescs);
        if (!(doctorPatients?.length)) {
          const map = new Map();
          const add = obj => { if (!obj) return; const id = obj._id || obj; if (typeof id !== "string") return; if (!map.has(id)) map.set(id, { _id: id, name: obj.name || "Unknown", email: obj.email || "" }); };
          prescs.forEach(p => add(p.patientId));
          extractArr(apptRes.data, ["appointments"]).forEach(a => add(a.patientId));
          extractArr(recRes.data, ["records"]).forEach(r => add(r.patientId));
          setPatients([...map.values()].sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch(e) { setError("Failed to load prescriptions."); }
      finally { setLoading(false); }
    })();
    const onCreated = data => { const p = data?.prescription || (data?._id ? data : null); if (p) setPrescriptions(prev => prev.some(x => x._id === p._id) ? prev : [p, ...prev]); };
    const onUpdated = data => { 
      const p = data?.prescription || (data?._id ? data : null); 
      if (p) {
        setPrescriptions(prev => prev.map(x => (x._id === p._id ? p : x)));
        setViewing(prev => (prev?._id === p._id ? p : prev));
      }
    };
    const onDeleted = data => { const id = data?.prescriptionId || data?._id; if (id) { setPrescriptions(prev => prev.filter(x => x._id !== id)); setViewing(prev => (prev?._id === id ? null : prev)); } };
    websocketService.onPrescriptionCreated(onCreated); websocketService.onPrescriptionUpdated(onUpdated); websocketService.onPrescriptionDeleted(onDeleted);
    return () => { websocketService.offPrescriptionCreated(onCreated); websocketService.offPrescriptionUpdated(onUpdated); websocketService.offPrescriptionDeleted(onDeleted); };
  }, [user?.role, doctorPatients]);

  const handleSubmit = async e => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!form.medicines.some(m => m.name.trim())) { setError("Add at least one medicine."); return; }
    try {
      if (editing) {
        const res = await apiClient.patch(`/prescriptions/${editing._id}`, form);
        setPrescriptions(prev => prev.map(p => p._id === editing._id ? res.data : p));
        setSuccess("Prescription updated.");
      } else {
        if (user?.role !== "doctor") { setError("Only doctors can create prescriptions."); return; }
        const res = await apiClient.post("/prescriptions", form);
        setPrescriptions(prev => [res.data, ...prev]);
        setSuccess("Prescription created.");
      }
      setShowModal(false); 
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch(err) { setError(err.response?.data?.error || "Operation failed."); }
  };

  const handleDelete = async id => {
    if (!window.confirm("Delete this prescription? This cannot be undone.")) return;
    try { 
      await apiClient.delete(`/prescriptions/${id}`); 
      setPrescriptions(prev => prev.filter(p => p._id !== id)); 
      if (onRefresh) onRefresh();
      setSuccess("Deleted."); setTimeout(() => setSuccess(""), 3000); 
    }
    catch(err) { setError(err.response?.data?.error || "Delete failed."); }
  };

  const handleRefill = async id => {
    setRefillLoading(p => ({ ...p, [id]: true }));
    try { await apiClient.post(`/prescriptions/${id}/refill`); setSuccess("Refill request sent."); setTimeout(() => setSuccess(""), 3000); }
    catch(err) { setError(err.response?.data?.error || "Failed to request refill."); }
    finally { setRefillLoading(p => ({ ...p, [id]: false })); }
  };

  const openDetail = async (rx) => {
    setViewing(rx);
    if (user?.role === "patient" && !rx.readByPatient) {
      try {
        // Update locally immediately for better UX
        setPrescriptions(prev => prev.map(p => p._id === rx._id ? { ...p, readByPatient: true } : p));
        setViewing(prev => ({ ...prev, readByPatient: true }));
        
        await apiClient.patch(`/prescriptions/${rx._id}/read`);
        // Increased delay to ensure DB aggregation (stats) is fully synchronized
        setTimeout(() => { if (onRefresh) onRefresh(); }, 800);
      } catch (err) { console.error("Failed to mark as read"); }
    }
  };

  const filtered = filter === "all" ? prescriptions : prescriptions.filter(p => p.status === filter);

  return (
    <div style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
      <PageHeader title="Prescriptions" subtitle={user?.role === "doctor" ? "Manage prescriptions for your patients" : "View your prescriptions and request refills"}
        action={user?.role === "doctor" && (
          <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#10b981", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#059669"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.3)"; }} onMouseLeave={e => { e.currentTarget.style.background = "#10b981"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.2)"; }}>
            <Plus size={18} />
            New prescription
          </button>
        )}
      />

      {/* Alerts */}
      {error && <div className="dm-error-banner" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#dc2626", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(220, 38, 38, 0.05)" }}>{error}<button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fca5a5", display: "flex", alignItems: "center" }}><X size={18} /></button></div>}
      {success && <div className="dm-success-banner" style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#166534", boxShadow: "0 2px 8px rgba(22, 163, 74, 0.05)" }}>{success}</div>}

      {/* Stats Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          ["Total Prescriptions", prescriptions.length, dark ? "#f8fafc" : "#0f172a", <FileText size={20} color={dark ? "#cbd5e1" : "#94a3b8"} />],
          ["Active", prescriptions.filter(p => p.status === "active").length, "#10b981", <CheckCircle size={20} color="#10b981" />],
          ["Expired/Cancelled", prescriptions.filter(p => p.status !== "active").length, dark ? "#cbd5e1" : "#64748b", <AlertCircle size={20} color={dark ? "#cbd5e1" : "#64748b"} />],
        ].map(([label, val, color, icon]) => (
          <div className="dm-stat-card" key={label} style={{ background: dark ? "#111827" : "#fff", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: dark ? "0 10px 28px rgba(2,6,23,0.35)" : "0 2px 8px rgba(15, 23, 42, 0.02)" }}>
            <div>
              <div className="dm-soft-muted" style={{ fontSize: 13, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: "1.875rem", fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{val}</div>
            </div>
            <div className="dm-icon-chip" style={{ width: 44, height: 44, background: dark ? "#0f172a" : "#f8fafc", border: dark ? "1px solid #334155" : "none", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["all", "active", "expired", "cancelled"].map(s => (
          <button className={filter === s ? "" : "dm-outline-btn"} key={s} onClick={() => setFilter(s)} style={{ padding: "8px 16px", fontSize: 14, fontWeight: filter === s ? 600 : 500, background: filter === s ? "#10b981" : "#fff", color: filter === s ? "#fff" : "#475569", border: filter === s ? "1px solid #10b981" : "1px solid #e2e8f0", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
            onMouseEnter={e => { if(filter !== s) { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; } }} onMouseLeave={e => { if(filter !== s) { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; } }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <Loader message="Loading prescriptions..." /> : filtered.length === 0 ? (
        <SectionCard><EmptyState icon={<Pill size={32} color="#94a3b8" />} title="No prescriptions found" subtitle={user?.role === "doctor" ? "Create a new prescription for a patient." : "Your doctor will add prescriptions here."} /></SectionCard>
      ) : (
        <div className="dm-list-surface" style={{ background: dark ? "#111827" : "#fff", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 16, overflow: "hidden", boxShadow: dark ? "0 10px 28px rgba(2,6,23,0.35)" : "0 4px 12px rgba(15,23,42,0.03)" }}>
          {filtered.map((rx, idx) => {
            const st = statusStyle[rx.status] || statusStyle.expired;
            const isNew = user?.role === "patient" && !rx.readByPatient;
            
            return (
              <div 
                key={rx._id} 
                onClick={() => openDetail(rx)}
                className="dm-rx-row"
                style={{ 
                  padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, cursor: "pointer", 
                  borderBottom: idx === filtered.length - 1 ? "none" : `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`,
                  transition: "background 0.2s", background: isNew ? (dark ? "rgba(34,197,94,0.12)" : "#f0fdf4") : "transparent"
                }}
                onMouseEnter={e => e.currentTarget.style.background = isNew ? (dark ? "rgba(34,197,94,0.18)" : "#dcfce7") : (dark ? "#0f172a" : "#f8fafc")}
                onMouseLeave={e => e.currentTarget.style.background = isNew ? (dark ? "rgba(34,197,94,0.12)" : "#f0fdf4") : "transparent"}
              >
                <div className="dm-icon-chip" style={{ width: 44, height: 44, borderRadius: 12, background: dark ? "#0f172a" : "#f8fafc", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Pill size={20} color="#10b981" />
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <div className="dm-soft-text" style={{ fontSize: 15, fontWeight: 600, color: dark ? "#e2e8f0" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rx.diagnosis || "General Prescription"}</div>
                    {isNew && <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#10b981", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, textTransform: "uppercase" }}><Bell size={10} fill="currentColor" /> New</span>}
                  </div>
                  <div className="dm-soft-muted" style={{ fontSize: 13, color: dark ? "#94a3b8" : "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{user?.role === "doctor" ? `Patient: ${rx.patientId?.name || "Unknown"}` : `Dr. ${rx.doctorId?.name || rx.doctorName || "Unknown"}`}</span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#cbd5e1" }}></span>
                    <span>{new Date(rx.prescribedDate || rx.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ display: "inline-flex", padding: "4px 10px", fontSize: 12, fontWeight: 600, borderRadius: 999, background: st.bg, color: st.color, border: `1px solid ${st.bg}` }}>{rx.status}</span>
                  
                  {user?.role === "doctor" && (
                    <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditing(rx); setForm({ patientId: rx.patientId?._id || rx.patientId, diagnosis: rx.diagnosis || "", medicines: rx.medicines || [{ name: "", dosage: "", frequency: "", duration: "" }], advice: rx.advice || "", validUntil: rx.validUntil ? new Date(rx.validUntil).toISOString().split("T")[0] : "" }); setShowModal(true); }}
                        style={{ width: 32, height: 32, background: dark ? "#0f172a" : "#fff", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 8, cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(rx._id)} 
                        style={{ width: 32, height: 32, background: dark ? "#0f172a" : "#fff", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 8, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} /></button>
                    </div>
                  )}
                  
                  <ChevronRight size={18} color={dark ? "#64748b" : "#cbd5e1"} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {viewing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="dm-modal-surface" style={{ background: dark ? "#111827" : "#fff", border: dark ? "1px solid #334155" : "none", borderRadius: 24, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: dark ? "0 24px 64px rgba(2,6,23,0.55)" : "0 24px 64px rgba(15,23,42,0.2)" }}>
            <div className="dm-modal-header" style={{ padding: "24px", borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: dark ? "#111827" : "#fff", zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                  <Pill size={20} />
                </div>
                <div>
                  <div className="dm-page-title" style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Prescription Details</div>
                  <div className="dm-soft-muted" style={{ fontSize: 13, color: "#64748b" }}>{viewing.diagnosis || "General Consultation"}</div>
                </div>
              </div>
              <button onClick={() => setViewing(null)} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", color: "#64748b" }}><X size={18} /></button>
            </div>
            
            <div style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div className="dm-detail-panel" style={{ padding: 12, background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Prescribed Date</div>
                  <div className="dm-soft-text" style={{ fontSize: 14, fontWeight: 500, color: "#1e293b" }}>{new Date(viewing.prescribedDate || viewing.createdAt).toLocaleDateString("en-US", { dateStyle: "long" })}</div>
                </div>
                <div className="dm-detail-panel" style={{ padding: 12, background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Status</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: statusStyle[viewing.status]?.color || "#1e293b" }}>{(viewing.status || "active").toUpperCase()}</div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 12 }}>Medications</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {viewing.medicines?.map((m, i) => (
                    <div className="dm-detail-panel" key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 16 }}>
                      <div className="dm-icon-chip" style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Pill size={18} color="#10b981" />
                      </div>
                      <div>
                        <div className="dm-soft-text" style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{m.name}</div>
                        <div className="dm-soft-muted" style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{[m.dosage, m.frequency, m.duration].filter(Boolean).join(" • ")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {viewing.advice && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Doctor's Advice</label>
                  <div className="dm-warning-panel" style={{ background: "#fffbeb", padding: 16, borderRadius: 16, border: "1px solid #fde68a", display: "flex", gap: 12 }}>
                    <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 14, color: "#92400e", lineHeight: 1.6 }}>{viewing.advice}</div>
                  </div>
                </div>
              )}

              <div className="dm-detail-panel" style={{ padding: 16, background: "#f8fafc", borderRadius: 16, border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                <User size={18} color="#64748b" />
                <div style={{ fontSize: 14, color: "#475569" }}>
                  Prescribed by <strong style={{ color: "#0f172a" }}>{viewing.doctorName || viewing.doctorId?.name || "Dr. Unknown"}</strong>
                </div>
              </div>
            </div>

            <div className="dm-modal-footer" style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {user?.role === "patient" && viewing.status === "active" ? (
                <button onClick={() => handleRefill(viewing._id)} disabled={refillLoading[viewing._id]} style={{ padding: "10px 20px", background: "#f0fdf4", color: "#166534", border: "1px solid #86efac", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  {refillLoading[viewing._id] ? "Requesting…" : <><Clock size={16} /> Request Refill</>}
                </button>
              ) : <div></div>}
              <button onClick={() => setViewing(null)} style={{ padding: "10px 24px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="dm-modal-surface" style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(15,23,42,0.2)" }}>
            <div className="dm-modal-header" style={{ padding: "24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
              <div>
                <div className="dm-page-title" style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>{editing ? "Edit Prescription" : "New Prescription"}</div>
                <div className="dm-soft-muted" style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>{editing ? "Update prescription details below." : "Provide diagnosis and medication details."}</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: dark ? "#0f172a" : "#f8fafc", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 10, cursor: "pointer", color: dark ? "#94a3b8" : "#64748b", transition: "all 0.2s" }}
                onMouseEnter={e=>{e.currentTarget.style.background=dark ? "#1e293b" : "#f1f5f9";e.currentTarget.style.color=dark ? "#f8fafc" : "#0f172a";}} onMouseLeave={e=>{e.currentTarget.style.background=dark ? "#0f172a" : "#f8fafc";e.currentTarget.style.color=dark ? "#94a3b8" : "#64748b";}}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              {user?.role === "doctor" && !editing && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: dark ? "#cbd5e1" : "#334155", marginBottom: 8 }}>Select Patient *</label>
                  {patients.length > 0 ? <PatientSearch patients={patients} value={form.patientId} onChange={p => setForm(prev => ({ ...prev, patientId: p?._id || "" }))} />
                    : <div style={{ padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, fontSize: 14, color: "#92400e", display: "flex", gap: 8 }}><AlertCircle size={18} /> No patients available. Patients appear here after booking an appointment.</div>}
                </div>
              )}
              
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: dark ? "#cbd5e1" : "#334155", marginBottom: 8 }}>Diagnosis / Condition</label>
                <input type="text" value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} placeholder="e.g. Acute Bronchitis" style={inputCls} onFocus={onFocus} onBlur={onBlur} />
              </div>
              
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: dark ? "#f8fafc" : "#0f172a" }}>Medications *</label>
                  <button type="button" onClick={() => setForm(p => ({ ...p, medicines: [...p.medicines, { name: "", dosage: "", frequency: "", duration: "" }] }))} style={{ fontSize: 13, fontWeight: 600, color: "#10b981", background: "rgba(16, 185, 129, 0.1)", border: "none", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(16, 185, 129, 0.15)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(16, 185, 129, 0.1)"}>
                    <Plus size={14} /> Add Medicine
                  </button>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {form.medicines.map((med, i) => (
                    <div className="dm-med-card" key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 2px 8px rgba(15,23,42,0.02)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: dark ? "#94a3b8" : "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}><Pill size={14} color={dark ? "#94a3b8" : "#94a3b8"} /> Medicine {i + 1}</div>
                        {form.medicines.length > 1 && (
                          <button type="button" onClick={() => setForm(p => ({ ...p, medicines: p.medicines.filter((_, j) => j !== i) }))} style={{ width: 28, height: 28, background: "#fef2f2", border: "none", borderRadius: 8, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#fee2e2"} onMouseLeave={e=>e.currentTarget.style.background="#fef2f2"}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[["name", "Medicine Name *", "e.g., Amoxicillin 500mg"], ["dosage", "Dosage", "e.g., 1 tablet"], ["frequency", "Frequency", "e.g., Twice daily"], ["duration", "Duration", "e.g., 7 days"]].map(([key, label, ph]) => (
                          <div key={key}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 6 }}>{label}</label>
                            <input type="text" value={med[key]} onChange={e => { const meds = [...form.medicines]; meds[i][key] = e.target.value; setForm(p => ({ ...p, medicines: meds })); }} placeholder={ph} required={key === "name"} style={{ ...inputCls, padding: "10px 14px", fontSize: 14 }} onFocus={onFocus} onBlur={onBlur} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: dark ? "#cbd5e1" : "#334155", marginBottom: 8 }}>Valid Until</label>
                  <input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} style={inputCls} onFocus={onFocus} onBlur={onBlur} />
                  <p style={{ fontSize: 12, color: dark ? "#94a3b8" : "#94a3b8", marginTop: 6 }}>Defaults to 30 days if left blank</p>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: dark ? "#cbd5e1" : "#334155", marginBottom: 8 }}>Additional Instructions</label>
                  <textarea value={form.advice} onChange={e => setForm(p => ({ ...p, advice: e.target.value }))} placeholder="e.g. Take with food, avoid dairy..." rows={3} style={{ ...inputCls, resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
              
              {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} />{error}</div>}
              
              <div style={{ display: "flex", gap: 12, paddingTop: 16, borderTop: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}` }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "14px", background: dark ? "#0f172a" : "#f8fafc", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 12, fontSize: 15, fontWeight: 600, color: dark ? "#cbd5e1" : "#475569", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.background=dark ? "#1e293b" : "#f1f5f9";e.currentTarget.style.borderColor=dark ? "#475569" : "#cbd5e1";}} onMouseLeave={e=>{e.currentTarget.style.background=dark ? "#0f172a" : "#f8fafc";e.currentTarget.style.borderColor=dark ? "#334155" : "#e2e8f0";}}>Cancel</button>
                <button type="submit" style={{ flex: 2, padding: "14px", background: "#10b981", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)" }} onMouseEnter={e=>{e.currentTarget.style.background="#059669";e.currentTarget.style.boxShadow="0 6px 16px rgba(16, 185, 129, 0.3)";}} onMouseLeave={e=>{e.currentTarget.style.background="#10b981";e.currentTarget.style.boxShadow="0 4px 12px rgba(16, 185, 129, 0.2)";}}>{editing ? "Save Changes" : "Create Prescription"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
