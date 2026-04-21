import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import websocketService from "../services/websocket";
import { SectionCard, Badge, EmptyState, Loader, PageHeader } from "./UI";
import { X, Pill, Search, Calendar, User, Clock, FileText, Edit2, Trash2, Plus, CheckCircle, AlertCircle } from "lucide-react";

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
        style={{ 
          display: "flex", alignItems: "center", padding: "12px 16px", background: focused || open ? "#fff" : "#f8fafc", 
          border: "1px solid", borderColor: focused || open ? "#10b981" : "#e2e8f0", borderRadius: 12, cursor: "text", 
          boxShadow: focused || open ? "0 0 0 4px rgba(16, 185, 129, 0.1)" : "none", transition: "all 0.2s" 
        }} 
        onClick={() => setOpen(true)}
      >
        <Search size={16} color="#94a3b8" style={{ flexShrink: 0, marginRight: 10 }} />
        {selected && !open ? (
          <span style={{ flex: 1, fontSize: 14, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <strong style={{ fontWeight: 600 }}>{selected.name}</strong> <span style={{ color: "#64748b", marginLeft: 4 }}>({selected.email})</span>
          </span>
        ) : (
          <input type="text" placeholder={selected ? `${selected.name} (${selected.email})` : "Search patient by name or email…"} value={q} autoFocus={open}
            onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => { setFocused(true); setOpen(true); }} onBlur={() => setFocused(false)}
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "inherit", color: "#0f172a", background: "transparent", padding: 0 }} />
        )}
        {value && <button type="button" onClick={e => { e.stopPropagation(); onChange(null); setQ(""); }} style={{ marginLeft: 8, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}><X size={16} /></button>}
      </div>
      {open && (
        <div style={{ position: "absolute", zIndex: 50, top: "calc(100% + 8px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,0.1)", maxHeight: 240, overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 ? <div style={{ padding: "12px", fontSize: 13, color: "#64748b", textAlign: "center" }}>No patients found</div> : filtered.map(p => (
            <button key={p._id} type="button" onClick={() => { onChange(p); setOpen(false); setQ(""); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", borderRadius: 8, textAlign: "left", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{p.name?.charAt(0)?.toUpperCase()}</div>
              <div><div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{p.name}</div><div style={{ fontSize: 12, color: "#64748b" }}>{p.email}</div></div>
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

export default function Prescriptions({ doctorPatients }) {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [refillLoading, setRefillLoading] = useState({});

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
    const onCreated = d => { const p = d?.prescription || (d?._id ? d : null); if (p) setPrescriptions(prev => prev.some(x => x._id === p._id) ? prev : [p, ...prev]); };
    const onUpdated = d => { const p = d?.prescription || (d?._id ? d : null); if (p) setPrescriptions(prev => prev.map(x => x._id === p._id ? p : x)); };
    const onDeleted = d => { const id = d?.prescriptionId || d?._id; if (id) setPrescriptions(prev => prev.filter(x => x._id !== id)); };
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
      setShowModal(false); setTimeout(() => setSuccess(""), 3000);
    } catch(err) { setError(err.response?.data?.error || "Operation failed."); }
  };

  const handleDelete = async id => {
    if (!window.confirm("Delete this prescription? This cannot be undone.")) return;
    try { await apiClient.delete(`/prescriptions/${id}`); setPrescriptions(prev => prev.filter(p => p._id !== id)); setSuccess("Deleted."); setTimeout(() => setSuccess(""), 3000); }
    catch(err) { setError(err.response?.data?.error || "Delete failed."); }
  };

  const handleRefill = async id => {
    setRefillLoading(p => ({ ...p, [id]: true }));
    try { await apiClient.post(`/prescriptions/${id}/refill`); setSuccess("Refill request sent."); setTimeout(() => setSuccess(""), 3000); }
    catch(err) { setError(err.response?.data?.error || "Failed to request refill."); }
    finally { setRefillLoading(p => ({ ...p, [id]: false })); }
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
      {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#dc2626", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(220, 38, 38, 0.05)" }}>{error}<button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fca5a5", display: "flex", alignItems: "center" }}><X size={18} /></button></div>}
      {success && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#166534", boxShadow: "0 2px 8px rgba(22, 163, 74, 0.05)" }}>{success}</div>}

      {/* Stats Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          ["Total Prescriptions", prescriptions.length, "#0f172a", <FileText size={20} color="#94a3b8" />],
          ["Active", prescriptions.filter(p => p.status === "active").length, "#10b981", <CheckCircle size={20} color="#10b981" />],
          ["Expired/Cancelled", prescriptions.filter(p => p.status !== "active").length, "#64748b", <AlertCircle size={20} color="#64748b" />],
        ].map(([label, val, color, icon]) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(15, 23, 42, 0.02)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: "1.875rem", fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{val}</div>
            </div>
            <div style={{ width: 44, height: 44, background: "#f8fafc", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["all", "active", "expired", "cancelled"].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "8px 16px", fontSize: 14, fontWeight: filter === s ? 600 : 500, background: filter === s ? "#10b981" : "#fff", color: filter === s ? "#fff" : "#475569", border: filter === s ? "1px solid #10b981" : "1px solid #e2e8f0", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
            onMouseEnter={e => { if(filter !== s) { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; } }} onMouseLeave={e => { if(filter !== s) { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; } }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <Loader message="Loading prescriptions..." /> : filtered.length === 0 ? (
        <SectionCard><EmptyState icon={<Pill size={32} color="#94a3b8" />} title="No prescriptions found" subtitle={user?.role === "doctor" ? "Create a new prescription for a patient." : "Your doctor will add prescriptions here."} /></SectionCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 20 }}>
          {filtered.map(rx => {
            const st = statusStyle[rx.status] || statusStyle.expired;
            return (
              <div key={rx._id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 4px 12px rgba(15,23,42,0.03)", transition: "transform 0.2s, box-shadow 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(15,23,42,0.08)";}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 12px rgba(15,23,42,0.03)";}}>
                
                {/* Card Header */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, background: "#fafafa" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <FileText size={16} color="#10b981" />
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {rx.diagnosis || "General Prescription"}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                      <User size={14} />
                      {user?.role === "doctor" ? `Patient: ${rx.patientId?.name || "Unknown"}` : `Dr. ${rx.doctorId?.name || rx.doctorName || "Unknown"}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 12, fontWeight: 600, borderRadius: 999, background: st.bg, color: st.color, border: `1px solid ${st.bg}` }}>
                      {st.icon}
                      {rx.status.charAt(0).toUpperCase() + rx.status.slice(1)}
                    </span>
                    
                    {user?.role === "doctor" && (
                      <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
                        <button onClick={() => { setEditing(rx); setForm({ patientId: rx.patientId?._id || rx.patientId, diagnosis: rx.diagnosis || "", medicines: rx.medicines || [{ name: "", dosage: "", frequency: "", duration: "" }], advice: rx.advice || "", validUntil: rx.validUntil ? new Date(rx.validUntil).toISOString().split("T")[0] : "" }); setShowModal(true); }}
                          style={{ width: 32, height: 32, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.background="#eff6ff";e.currentTarget.style.borderColor="#bfdbfe";}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor="#e2e8f0";}}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(rx._id)} 
                          style={{ width: 32, height: 32, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.background="#fef2f2";e.currentTarget.style.borderColor="#fecaca";}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor="#e2e8f0";}}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Card Body */}
                <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, background: "#f8fafc", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><Calendar size={14} color="#64748b" /></div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Issued</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{rx.createdAt ? new Date(rx.createdAt).toLocaleDateString() : "—"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, background: "#f8fafc", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><Clock size={14} color="#64748b" /></div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Valid Until</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{rx.validUntil ? new Date(rx.validUntil).toLocaleDateString() : "Not set"}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Medicines ({rx.medicines?.length || 0})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {rx.medicines?.slice(0, 3).map((m, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 12 }}>
                          <div style={{ width: 32, height: 32, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Pill size={16} color="#10b981" />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{[m.dosage, m.frequency, m.duration].filter(Boolean).join(" • ")}</div>
                          </div>
                        </div>
                      ))}
                      {rx.medicines?.length > 3 && <div style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", textAlign: "center", padding: "6px", background: "#f8fafc", borderRadius: 8 }}>+{rx.medicines.length - 3} more medicines</div>}
                    </div>
                  </div>

                  {rx.advice && (
                    <div style={{ marginTop: 16, padding: "12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, fontSize: 13, color: "#92400e", display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ lineHeight: 1.5 }}><strong>Advice:</strong> {rx.advice}</div>
                    </div>
                  )}

                  {user?.role === "patient" && rx.status === "active" && (
                    <button onClick={() => handleRefill(rx._id)} disabled={refillLoading[rx._id]} style={{ marginTop: 20, width: "100%", padding: "12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#166534", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}
                      onMouseEnter={e=>{e.currentTarget.style.background="#dcfce7";e.currentTarget.style.borderColor="#4ade80";}} onMouseLeave={e=>{e.currentTarget.style.background="#f0fdf4";e.currentTarget.style.borderColor="#86efac";}}>
                      {refillLoading[rx._id] ? "Requesting…" : <><Clock size={16} /> Request refill</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(15,23,42,0.2)" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>{editing ? "Edit Prescription" : "New Prescription"}</div>
                <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>{editing ? "Update prescription details below." : "Provide diagnosis and medication details."}</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", color: "#64748b", transition: "all 0.2s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="#f1f5f9";e.currentTarget.style.color="#0f172a";}} onMouseLeave={e=>{e.currentTarget.style.background="#f8fafc";e.currentTarget.style.color="#64748b";}}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              {user?.role === "doctor" && !editing && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Select Patient *</label>
                  {patients.length > 0 ? <PatientSearch patients={patients} value={form.patientId} onChange={p => setForm(prev => ({ ...prev, patientId: p?._id || "" }))} />
                    : <div style={{ padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, fontSize: 14, color: "#92400e", display: "flex", gap: 8 }}><AlertCircle size={18} /> No patients available. Patients appear here after booking an appointment.</div>}
                </div>
              )}
              
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Diagnosis / Condition</label>
                <input type="text" value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} placeholder="e.g. Acute Bronchitis" style={inputCls} onFocus={onFocus} onBlur={onBlur} />
              </div>
              
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Medications *</label>
                  <button type="button" onClick={() => setForm(p => ({ ...p, medicines: [...p.medicines, { name: "", dosage: "", frequency: "", duration: "" }] }))} style={{ fontSize: 13, fontWeight: 600, color: "#10b981", background: "rgba(16, 185, 129, 0.1)", border: "none", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(16, 185, 129, 0.15)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(16, 185, 129, 0.1)"}>
                    <Plus size={14} /> Add Medicine
                  </button>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {form.medicines.map((med, i) => (
                    <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 2px 8px rgba(15,23,42,0.02)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}><Pill size={14} color="#94a3b8" /> Medicine {i + 1}</div>
                        {form.medicines.length > 1 && (
                          <button type="button" onClick={() => setForm(p => ({ ...p, medicines: p.medicines.filter((_, j) => j !== i) }))} style={{ width: 28, height: 28, background: "#fef2f2", border: "none", borderRadius: 8, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#fee2e2"} onMouseLeave={e=>e.currentTarget.style.background="#fef2f2"}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[["name", "Medicine Name *", "e.g., Amoxicillin 500mg"], ["dosage", "Dosage", "e.g., 1 tablet"], ["frequency", "Frequency", "e.g., Twice daily"], ["duration", "Duration", "e.g., 7 days"]].map(([key, label, ph]) => (
                          <div key={key}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>{label}</label>
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
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Valid Until</label>
                  <input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} style={inputCls} onFocus={onFocus} onBlur={onBlur} />
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Defaults to 30 days if left blank</p>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Additional Instructions</label>
                  <textarea value={form.advice} onChange={e => setForm(p => ({ ...p, advice: e.target.value }))} placeholder="e.g. Take with food, avoid dairy..." rows={3} style={{ ...inputCls, resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
              
              {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} />{error}</div>}
              
              <div style={{ display: "flex", gap: 12, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.background="#f1f5f9";e.currentTarget.style.borderColor="#cbd5e1";}} onMouseLeave={e=>{e.currentTarget.style.background="#f8fafc";e.currentTarget.style.borderColor="#e2e8f0";}}>Cancel</button>
                <button type="submit" style={{ flex: 2, padding: "14px", background: "#10b981", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)" }} onMouseEnter={e=>{e.currentTarget.style.background="#059669";e.currentTarget.style.boxShadow="0 6px 16px rgba(16, 185, 129, 0.3)";}} onMouseLeave={e=>{e.currentTarget.style.background="#10b981";e.currentTarget.style.boxShadow="0 4px 12px rgba(16, 185, 129, 0.2)";}}>{editing ? "Save Changes" : "Create Prescription"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}