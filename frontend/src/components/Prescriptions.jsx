import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import websocketService from "../services/websocket";
import { SectionCard, Badge, EmptyState, Loader, Btn, PageHeader } from "./UI";
import { X, Pill } from "lucide-react";

function PatientSearch({ patients, value, onChange }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = patients.find(p => p._id === value);
  const filtered = q.trim() ? patients.filter(p => p.email?.toLowerCase().includes(q.toLowerCase()) || p.name?.toLowerCase().includes(q.toLowerCase())) : patients;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${open ? "#1db585" : "#e2e8f0"}`, borderRadius: 10, padding: "8px 12px", cursor: "text", background: "#fff", boxShadow: open ? "0 0 0 3px rgba(29,181,133,0.1)" : "none", transition: "all 0.15s" }} onClick={() => setOpen(true)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0, marginRight: 8 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        {selected && !open ? (
          <span style={{ flex: 1, fontSize: 13.5, color: "#1e293b" }}><strong>{selected.name}</strong> <span style={{ color: "#94a3b8" }}>({selected.email})</span></span>
        ) : (
          <input type="text" placeholder={selected ? `${selected.name} (${selected.email})` : "Search patient by name or email…"} value={q} autoFocus={open}
            onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13.5, fontFamily: "inherit", color: "#1e293b", background: "transparent" }} />
        )}
        {value && <button type="button" onClick={e => { e.stopPropagation(); onChange(null); setQ(""); }} style={{ marginLeft: 6, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>}
      </div>
      {open && (
        <div style={{ position: "absolute", zIndex: 50, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.1)", maxHeight: 220, overflowY: "auto" }}>
          {filtered.length === 0 ? <div style={{ padding: "12px 16px", fontSize: 13.5, color: "#94a3b8", textAlign: "center" }}>No patients found</div> : filtered.map(p => (
            <button key={p._id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(p); setOpen(false); setQ(""); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", borderBottom: "1px solid #f8fafc", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f0faf7"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1db585", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{p.name?.charAt(0)?.toUpperCase()}</div>
              <div><div style={{ fontSize: 13.5, fontWeight: 500, color: "#1e293b" }}>{p.name}</div><div style={{ fontSize: 12, color: "#94a3b8" }}>{p.email}</div></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = { patientId: "", diagnosis: "", medicines: [{ name: "", dosage: "", frequency: "", duration: "" }], advice: "", validUntil: "" };

const statusStyle = { active: { bg: "#dcfce7", color: "#166534", border: "#22c55e" }, expired: { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" }, cancelled: { bg: "#fee2e2", color: "#991b1b", border: "#ef4444" } };

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
  const inputCls = { width: "100%", padding: "8px 10px", fontSize: 13.5, fontFamily: "inherit", color: "#1e293b", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 9, outline: "none", boxSizing: "border-box" };
  const onFocus = e => { e.target.style.borderColor = "#1db585"; e.target.style.boxShadow = "0 0 0 3px rgba(29,181,133,0.08)"; };
  const onBlur = e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <PageHeader title="Prescriptions" subtitle={user?.role === "doctor" ? "Manage prescriptions for your patients" : "View your prescriptions and request refills"}
        action={user?.role === "doctor" && (
          <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "#1db585", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
            New prescription
          </button>
        )}
      />

      {/* Alerts */}
      {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "11px 14px", marginBottom: 14, fontSize: 13.5, color: "#dc2626", display: "flex", justifyContent: "space-between", alignItems: "center" }}>{error}<button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fca5a5", display: "flex", alignItems: "center" }}><X size={16} /></button></div>}
      {success && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "11px 14px", marginBottom: 14, fontSize: 13.5, color: "#166534" }}>{success}</div>}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          ["Total", prescriptions.length, "#64748b"],
          ["Active", prescriptions.filter(p => p.status === "active").length, "#16a34a"],
          ["Expired", prescriptions.filter(p => p.status === "expired").length, "#94a3b8"],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 500, color, letterSpacing: "-0.02em" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {["all", "active", "expired", "cancelled"].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "6px 14px", fontSize: 13, fontWeight: filter === s ? 500 : 400, background: filter === s ? "#1db585" : "#fff", color: filter === s ? "#fff" : "#64748b", border: filter === s ? "none" : "1.5px solid #e2e8f0", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <Loader message="Loading prescriptions..." /> : filtered.length === 0 ? (
        <SectionCard><EmptyState icon={<Pill size={24} color="#94a3b8" />} title="No prescriptions found" subtitle={user?.role === "doctor" ? "Create a new prescription for a patient." : "Your doctor will add prescriptions here."} /></SectionCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {filtered.map(rx => {
            const st = statusStyle[rx.status] || statusStyle.expired;
            return (
              <div key={rx._id} style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, overflow: "hidden", borderLeft: `3px solid ${st.border}`, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
                <div style={{ padding: "16px 18px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: "#0f172a", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {rx.diagnosis || "General Prescription"}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#94a3b8" }}>
                      {user?.role === "doctor" ? `For: ${rx.patientId?.name || "Patient"}` : `By: ${rx.doctorId?.name || rx.doctorName || "Doctor"}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ display: "inline-flex", padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 999, background: st.bg, color: st.color }}>{rx.status.charAt(0).toUpperCase() + rx.status.slice(1)}</span>
                    {user?.role === "doctor" && (
                      <div style={{ display: "flex", gap: 2 }}>
                        <button onClick={() => { setEditing(rx); setForm({ patientId: rx.patientId?._id || rx.patientId, diagnosis: rx.diagnosis || "", medicines: rx.medicines || [{ name: "", dosage: "", frequency: "", duration: "" }], advice: rx.advice || "", validUntil: rx.validUntil ? new Date(rx.validUntil).toISOString().split("T")[0] : "" }); setShowModal(true); }}
                          style={{ padding: "5px", background: "#eff6ff", border: "none", borderRadius: 6, cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => handleDelete(rx._id)} style={{ padding: "5px", background: "#fef2f2", border: "none", borderRadius: 6, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                    {[["Medicines", rx.medicines?.length || 0], ["Issued", rx.createdAt ? new Date(rx.createdAt).toLocaleDateString() : "—"], ["Valid until", rx.validUntil ? new Date(rx.validUntil).toLocaleDateString() : "Not set"]].map(([k, v]) => (
                      <div key={k} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{k}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Medicines list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {rx.medicines?.slice(0, 3).map((m, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#f8fafc", borderRadius: 8 }}>
                        <div style={{ width: 28, height: 28, background: "#f0faf7", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Pill size={14} color="#1db585" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                          <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{[m.dosage, m.frequency, m.duration].filter(Boolean).join(" · ")}</div>
                        </div>
                      </div>
                    ))}
                    {rx.medicines?.length > 3 && <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "4px" }}>+{rx.medicines.length - 3} more medicines</div>}
                  </div>
                  {rx.advice && <div style={{ marginTop: 10, padding: "8px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12.5, color: "#92400e", fontStyle: "italic" }}>{rx.advice}</div>}
                  {user?.role === "patient" && rx.status === "active" && (
                    <button onClick={() => handleRefill(rx._id)} disabled={refillLoading[rx._id]} style={{ marginTop: 12, width: "100%", padding: "9px", background: "#f0faf7", border: "1.5px solid #a3e7d4", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#0a7a57", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      {refillLoading[rx._id] ? "Requesting…" : "Request refill"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(2px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(15,23,42,0.15)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 500, color: "#0f172a" }}>{editing ? "Edit prescription" : "New prescription"}</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{editing ? "Update prescription details below" : "Fill in the details to create a new prescription"}</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", border: "none", borderRadius: 8, cursor: "pointer" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              {user?.role === "doctor" && !editing && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>Patient *</label>
                  {patients.length > 0 ? <PatientSearch patients={patients} value={form.patientId} onChange={p => setForm(prev => ({ ...prev, patientId: p?._id || "" }))} />
                    : <div style={{ padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, fontSize: 13, color: "#92400e" }}>No patients found. Patients appear after their first interaction with you.</div>}
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>Diagnosis</label>
                <input type="text" value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} placeholder="e.g., Hypertension, Common Cold" style={inputCls} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>Medicines *</label>
                  <button type="button" onClick={() => setForm(p => ({ ...p, medicines: [...p.medicines, { name: "", dosage: "", frequency: "", duration: "" }] }))} style={{ fontSize: 13, color: "#1db585", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>+ Add medicine</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {form.medicines.map((med, i) => (
                    <div key={i} style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9", padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>Medicine {i + 1}</div>
                        {form.medicines.length > 1 && <button type="button" onClick={() => setForm(p => ({ ...p, medicines: p.medicines.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[["name", "Medicine name *", "e.g., Amoxicillin"], ["dosage", "Dosage", "e.g., 500mg"], ["frequency", "Frequency", "e.g., 3× daily"], ["duration", "Duration", "e.g., 7 days"]].map(([key, label, ph]) => (
                          <div key={key}>
                            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>{label}</label>
                            <input type="text" value={med[key]} onChange={e => { const meds = [...form.medicines]; meds[i][key] = e.target.value; setForm(p => ({ ...p, medicines: meds })); }} placeholder={ph} required={key === "name"} style={{ ...inputCls, padding: "7px 9px", fontSize: 13 }} onFocus={onFocus} onBlur={onBlur} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>Valid until</label>
                  <input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} style={inputCls} onFocus={onFocus} onBlur={onBlur} />
                  <p style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>Defaults to 30 days if blank</p>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>Additional advice</label>
                  <textarea value={form.advice} onChange={e => setForm(p => ({ ...p, advice: e.target.value }))} placeholder="e.g., Take with food…" rows={3} style={{ ...inputCls, resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
              {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>{error}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "11px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: "11px", background: "#1db585", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{editing ? "Update prescription" : "Create prescription"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Dummy inputCls & focus helpers for modal (defined outside JSX scope) */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  
}

// Fix: define inputCls as an object properly
const inputCls = { width: "100%", padding: "9px 11px", fontSize: 13.5, fontFamily: "'DM Sans', sans-serif", color: "#1e293b", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 9, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" };
const onFocus = e => { e.target.style.borderColor = "#1db585"; e.target.style.boxShadow = "0 0 0 3px rgba(29,181,133,0.08)"; };
const onBlur = e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };