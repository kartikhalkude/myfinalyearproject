import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import websocketService from "../services/websocket";
import { SectionCard, EmptyState, Loader, PageHeader } from "./UI";
import { X, Plus, Edit2, Trash2, FileText, AlertCircle, CheckCircle, Search, Activity, Thermometer, Heart, ClipboardList, Calendar } from "lucide-react";

function EntitySearch({ entities, value, onChange, placeholder = "Search..." }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);
  const selected = entities.find(e => e._id === value);
  const filtered = q.trim() ? entities.filter(e => e.email?.toLowerCase().includes(q.toLowerCase()) || e.name?.toLowerCase().includes(q.toLowerCase())) : entities;

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
          <input type="text" placeholder={selected ? `${selected.name} (${selected.email})` : placeholder} value={q} autoFocus={open}
            onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => { setFocused(true); setOpen(true); }} onBlur={() => setFocused(false)}
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "inherit", color: "#0f172a", background: "transparent", padding: 0 }} />
        )}
        {value && <button type="button" onClick={e => { e.stopPropagation(); onChange(null); setQ(""); }} style={{ marginLeft: 8, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}><X size={16} /></button>}
      </div>
      {open && (
        <div style={{ position: "absolute", zIndex: 50, top: "calc(100% + 8px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,0.1)", maxHeight: 240, overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 ? <div style={{ padding: "12px", fontSize: 13, color: "#64748b", textAlign: "center" }}>No results found</div> : filtered.map(p => (
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

const RECORD_TYPES = [
  { value: "lab_result", label: "Lab Result", icon: <Activity size={20} color="#3b82f6" />, bg: "#eff6ff" },
  { value: "diagnosis", label: "Diagnosis", icon: <ClipboardList size={20} color="#8b5cf6" />, bg: "#f5f3ff" },
  { value: "vital_signs", label: "Vital Signs", icon: <Thermometer size={20} color="#ef4444" />, bg: "#fef2f2" },
  { value: "imaging", label: "Imaging", icon: <FileText size={20} color="#eab308" />, bg: "#fefce8" },
  { value: "consultation", label: "Consultation", icon: <Heart size={20} color="#10b981" />, bg: "#f0fdf4" },
  { value: "other", label: "Other", icon: <FileText size={20} color="#64748b" />, bg: "#f8fafc" },
];

const SEVERITY_COLORS = {
  normal: { bg: "#f0fdf4", color: "#166534", border: "#86efac" },
  moderate: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  severe: { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" },
};

const EMPTY_FORM = { patientId: "", title: "", type: "diagnosis", content: "", severity: "normal", notes: "", date: new Date().toISOString().split("T")[0] };

const inputCls = { width: "100%", padding: "12px 16px", fontSize: 14, fontFamily: "inherit", color: "#0f172a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, outline: "none", transition: "all 0.2s", boxSizing: "border-box" };
const onFocus = e => { e.target.style.background = "#fff"; e.target.style.borderColor = "#10b981"; e.target.style.boxShadow = "0 0 0 4px rgba(16, 185, 129, 0.1)"; };
const onBlur = e => { e.target.style.background = "#f8fafc"; e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };

export default function HealthRecords({ doctorPatients }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);

  const extractArray = (data, keys = []) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
    return [];
  };

  useEffect(() => { if (doctorPatients?.length > 0) setPatients(doctorPatients); }, [doctorPatients]);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true); setError("");
        const [recordsRes, appointRes, prescRes, doctorsRes] = await Promise.all([
          apiClient.get("/health-records").catch(() => ({ data: [] })),
          apiClient.get("/appointments").catch(() => ({ data: [] })),
          apiClient.get("/prescriptions").catch(() => ({ data: [] })),
          user?.role === "patient" ? apiClient.get("/doctors").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        ]);

        const recordsData = extractArray(recordsRes.data, ["records", "data"]);
        setRecords(recordsData);

        if (user?.role === "patient") {
          setPatients(extractArray(doctorsRes.data, ["doctors", "data"]));
        } else if (!(doctorPatients?.length > 0)) {
          const patientMap = new Map();
          const addPatient = obj => {
            if (!obj) return;
            const id = obj._id || obj;
            if (typeof id !== "string") return;
            if (!patientMap.has(id)) patientMap.set(id, { _id: id, name: obj.name || "Unknown Patient", email: obj.email || "" });
          };
          recordsData.forEach(r => addPatient(r.patientId));
          extractArray(appointRes.data, ["appointments", "data"]).forEach(a => addPatient(a.patientId));
          extractArray(prescRes.data, ["prescriptions", "data"]).forEach(p => addPatient(p.patientId));
          setPatients([...patientMap.values()].sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (err) { setError("Failed to load health records"); }
      finally { setLoading(false); }
    };
    fetchRecords();

    const onCreated = data => { const r = data?.record || (data?._id ? data : null); if (r) setRecords(prev => prev.some(x => x._id === r._id) ? prev : [r, ...prev]); };
    const onUpdated = data => { const r = data?.record || (data?._id ? data : null); if (r) setRecords(prev => prev.map(x => (x._id === r._id ? r : x))); };
    const onDeleted = data => { const id = data?.recordId || data?._id; if (id) setRecords(prev => prev.filter(x => x._id !== id)); };

    websocketService.onHealthRecordCreated(onCreated); websocketService.onHealthRecordUpdated(onUpdated); websocketService.onHealthRecordDeleted(onDeleted);
    return () => { websocketService.offHealthRecordCreated(onCreated); websocketService.offHealthRecordUpdated(onUpdated); websocketService.offHealthRecordDeleted(onDeleted); };
  }, [user?.role, doctorPatients]);

  const handleSubmit = async e => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!formData.title.trim()) { setError("Title is required."); return; }
    if (!formData.content.trim()) { setError("Content is required."); return; }
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] && key !== 'patientId') data.append(key, formData[key]);
      });

      if (user?.role === "patient" && formData.patientId) {
        data.append("doctorId", formData.patientId);
      } else if (user?.role === "doctor" && formData.patientId) {
        data.append("patientId", formData.patientId);
      }

      if (file) data.append("file", file);

      if (editingRecord) {
        // PATCH with FormData might be tricky depending on backend, 
        // but for now let's focus on creation.
        // If editing doesn't support file update yet, we can fall back to JSON if no file.
        const res = await apiClient.patch(`/health-records/${editingRecord._id}`, formData);
        setRecords(prev => prev.map(r => (r._id === editingRecord._id ? res.data.record || res.data : r)));
        setSuccess("Health record updated successfully");
      } else {
        const res = await apiClient.post("/health-records", data, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setRecords(prev => [res.data.record || res.data, ...prev]);
        setSuccess(user?.role === "doctor" ? "Health record created successfully" : "Report sent to doctor successfully");
      }
      setShowModal(false); setFile(null); setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err.response?.data?.error || "Failed to save record"); }
  };

  const handleDelete = async id => {
    if (!window.confirm("Delete this health record? This cannot be undone.")) return;
    try {
      await apiClient.delete(`/health-records/${id}`);
      setRecords(prev => prev.filter(r => r._id !== id));
      setSuccess("Record deleted"); setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError("Failed to delete record"); }
  };

  const filteredRecords = filterType === "all" ? records : records.filter(r => (r.type || r.recordType) === filterType);

  return (
    <div style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
      <PageHeader title="Health Records" subtitle={user?.role === "doctor" ? "Manage and view patient health records securely." : "View your medical history and send reports to your doctor."}
        action={(
          <button onClick={() => { setEditingRecord(null); setFormData(EMPTY_FORM); setShowModal(true); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#10b981", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#059669"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.3)"; }} onMouseLeave={e => { e.currentTarget.style.background = "#10b981"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.2)"; }}>
            <Plus size={18} />
            {user?.role === "doctor" ? "New Record" : "Send Report"}
          </button>
        )}
      />

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#dc2626", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(220, 38, 38, 0.05)" }}>{error}<button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fca5a5", display: "flex", alignItems: "center" }}><X size={18} /></button></div>}
      {success && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#166534", boxShadow: "0 2px 8px rgba(22, 163, 74, 0.05)" }}>{success}</div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        <button onClick={() => setFilterType("all")} style={{ padding: "8px 16px", fontSize: 14, fontWeight: filterType === "all" ? 600 : 500, background: filterType === "all" ? "#10b981" : "#fff", color: filterType === "all" ? "#fff" : "#475569", border: filterType === "all" ? "1px solid #10b981" : "1px solid #e2e8f0", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }} onMouseEnter={e => { if(filterType !== "all") { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; } }} onMouseLeave={e => { if(filterType !== "all") { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; } }}>All</button>
        {RECORD_TYPES.map(rt => (
          <button key={rt.value} onClick={() => setFilterType(rt.value)} style={{ padding: "8px 16px", fontSize: 14, fontWeight: filterType === rt.value ? 600 : 500, background: filterType === rt.value ? "#10b981" : "#fff", color: filterType === rt.value ? "#fff" : "#475569", border: filterType === rt.value ? "1px solid #10b981" : "1px solid #e2e8f0", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => { if(filterType !== rt.value) { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; } }} onMouseLeave={e => { if(filterType !== rt.value) { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; } }}>
            {filterType === rt.value ? <CheckCircle size={14} /> : null} {rt.label}
          </button>
        ))}
      </div>

      {loading ? <Loader message="Loading health records..." /> : filteredRecords.length === 0 ? (
        <SectionCard><EmptyState icon={<ClipboardList size={32} color="#94a3b8" />} title="No health records" subtitle={user?.role === "doctor" ? "Create a record for a patient to see it here." : "Your health records will appear here when added by a doctor."} /></SectionCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 20 }}>
          {filteredRecords.map(record => {
            const rType = RECORD_TYPES.find(t => t.value === (record.type || record.recordType)) || RECORD_TYPES[5];
            const severityStyle = SEVERITY_COLORS[record.severity || "normal"] || SEVERITY_COLORS.normal;
            return (
              <div key={record._id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 4px 12px rgba(15,23,42,0.03)", transition: "transform 0.2s, box-shadow 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(15,23,42,0.08)";}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 12px rgba(15,23,42,0.03)";}}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, background: "#fafafa" }}>
                  <div style={{ display: "flex", gap: 14, minWidth: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: rType.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {rType.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.title}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{user?.role === "doctor" ? `Patient: ${record.patientId?.name || "Unknown"}` : `Dr. ${record.doctorId?.name || record.doctorName || "Unknown"}`}</div>
                    </div>
                  </div>
                  {user?.role === "doctor" && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button onClick={() => openEdit(record)} style={{ width: 32, height: 32, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.background="#eff6ff";e.currentTarget.style.borderColor="#bfdbfe";}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor="#e2e8f0";}}><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(record._id)} style={{ width: 32, height: 32, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.background="#fef2f2";e.currentTarget.style.borderColor="#fecaca";}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor="#e2e8f0";}}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                
                <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ display: "inline-flex", padding: "4px 10px", fontSize: 12, fontWeight: 600, borderRadius: 999, background: "#f1f5f9", color: "#475569" }}>{rType.label}</span>
                    <span style={{ display: "inline-flex", padding: "4px 10px", fontSize: 12, fontWeight: 600, borderRadius: 999, background: severityStyle.bg, color: severityStyle.color, border: `1px solid ${severityStyle.border}` }}>Severity: {record.severity?.charAt(0).toUpperCase() + record.severity?.slice(1) || "Normal"}</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 500, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}><Calendar size={14} />{new Date(record.date || record.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, flex: 1, border: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Details</div>
                    <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{record.content || record.description}</div>
                  </div>
                  
                  {record.notes && (
                    <div style={{ marginTop: 12, padding: "12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, fontSize: 13, color: "#92400e", display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ lineHeight: 1.5 }}><strong>Doctor's Note:</strong> {record.notes}</div>
                    </div>
                  )}

                  {(record.fileName || record.fileContentType) && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                      <a href={`http://localhost:5000/api/health-records/${record._id}/file?token=${localStorage.getItem('token')}`} target="_blank" rel="noopener noreferrer" 
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#f1f5f9", color: "#3b82f6", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none", transition: "all 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#e0e7ff"} onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}>
                        <FileText size={16} />
                        View Attachment: {record.fileName || "Report File"}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(15,23,42,0.2)" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>{editingRecord ? "Edit Record" : "New Health Record"}</div>
                <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>{editingRecord ? "Update the patient's record." : "Add a new record for your patient."}</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", color: "#64748b", transition: "all 0.2s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="#f1f5f9";e.currentTarget.style.color="#0f172a";}} onMouseLeave={e=>{e.currentTarget.style.background="#f8fafc";e.currentTarget.style.color="#64748b";}}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              {!editingRecord && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>{user?.role === "doctor" ? "Select Patient *" : "Select Doctor (Optional)"}</label>
                  {patients.length > 0 ? <EntitySearch entities={patients} value={formData.patientId} onChange={p => setFormData(prev => ({ ...prev, patientId: p?._id || "" }))} placeholder={user?.role === "doctor" ? "Search patient..." : "Search doctor..."} />
                    : <div style={{ padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, fontSize: 14, color: "#92400e", display: "flex", gap: 8 }}><AlertCircle size={18} /> No {user?.role === "doctor" ? "patients" : "doctors"} available.</div>}
                </div>
              )}
              
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Record Title *</label>
                <input type="text" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Annual Blood Work" style={inputCls} onFocus={onFocus} onBlur={onBlur} required />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Record Type</label>
                  <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} style={{ ...inputCls, cursor: "pointer", appearance: "none" }} onFocus={onFocus} onBlur={onBlur}>
                    {RECORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Severity</label>
                  <select value={formData.severity} onChange={e => setFormData(p => ({ ...p, severity: e.target.value }))} style={{ ...inputCls, cursor: "pointer", appearance: "none" }} onFocus={onFocus} onBlur={onBlur}>
                    <option value="normal">Normal</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              </div>
              
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Details / Results *</label>
                <textarea value={formData.content} onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} placeholder="Enter the main record details..." rows={4} style={{ ...inputCls, resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} required />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Attach Report (File) *</label>
                <div style={{ position: "relative" }}>
                  <input type="file" onChange={e => setFile(e.target.files[0])} style={{ ...inputCls, padding: "10px 16px" }} onFocus={onFocus} onBlur={onBlur} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={14} /> PDF, Images, or DOC (Max 10MB)
                  </div>
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} style={inputCls} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Doctor's Notes (Optional)</label>
                  <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional remarks..." rows={2} style={{ ...inputCls, resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
              
              <div style={{ display: "flex", gap: 12, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.background="#f1f5f9";e.currentTarget.style.borderColor="#cbd5e1";}} onMouseLeave={e=>{e.currentTarget.style.background="#f8fafc";e.currentTarget.style.borderColor="#e2e8f0";}}>Cancel</button>
                <button type="submit" style={{ flex: 2, padding: "14px", background: "#10b981", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)" }} onMouseEnter={e=>{e.currentTarget.style.background="#059669";e.currentTarget.style.boxShadow="0 6px 16px rgba(16, 185, 129, 0.3)";}} onMouseLeave={e=>{e.currentTarget.style.background="#10b981";e.currentTarget.style.boxShadow="0 4px 12px rgba(16, 185, 129, 0.2)";}}>{editingRecord ? "Save Changes" : "Create Record"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
