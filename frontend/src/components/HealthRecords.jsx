import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import websocketService from "../services/websocket";
import { SectionCard, EmptyState, Loader, PageHeader } from "./UI";
import { X, Plus, Edit2, Trash2, FileText, AlertCircle, CheckCircle, Search, Activity, Thermometer, Heart, ClipboardList, Calendar, MessageSquare, ChevronRight, Bell } from "lucide-react";

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
          <input type="text" placeholder={selected ? `${selected.name} (${selected.email})` : placeholder} value={q} autoFocus={open}
            onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => { setFocused(true); setOpen(true); }} onBlur={() => setFocused(false)}
            className="dm-soft-text"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "inherit", color: "#0f172a", background: "transparent", padding: 0 }} />
        )}
        {value && <button type="button" onClick={e => { e.stopPropagation(); onChange(null); setQ(""); }} style={{ marginLeft: 8, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}><X size={16} /></button>}
      </div>
      {open && (
        <div className="dm-search-surface" style={{ position: "absolute", zIndex: 50, top: "calc(100% + 8px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,0.1)", maxHeight: 240, overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 ? <div className="dm-soft-muted" style={{ padding: "12px", fontSize: 13, color: "#64748b", textAlign: "center" }}>No results found</div> : filtered.map(p => (
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

export default function HealthRecords({ doctorPatients, onRefresh }) {
  const { user, API_URL } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem("dm") === "1" || document.body.classList.contains("dm"));
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);

  // ── Dark mode color tokens ──────────────────────────────────────────────────
  const c = {
    modalBg: dark ? "#111827" : "#fff",
    modalBorder: dark ? "#334155" : "#f1f5f9",
    headerBg: dark ? "#111827" : "#fff",
    headerBorder: dark ? "#1e293b" : "#f1f5f9",
    footerBg: dark ? "#111827" : "#fff",
    footerBorder: dark ? "#1e293b" : "#f1f5f9",
    panelBg: dark ? "#1a2236" : "#f8fafc",
    panelBorder: dark ? "#2d3e55" : "#f1f5f9",
    titleColor: dark ? "#f8fafc" : "#0f172a",
    textColor: dark ? "#cbd5e1" : "#1e293b",
    mutedColor: dark ? "#94a3b8" : "#64748b",
    feedbackBg: dark ? "rgba(22, 163, 74, 0.12)" : "#f0fdf4",
    feedbackBorder: dark ? "rgba(34, 197, 94, 0.3)" : "#86efac",
    feedbackText: dark ? "#86efac" : "#166534",
    fileBg: dark ? "rgba(37, 99, 235, 0.12)" : "#eff6ff",
    fileBorder: dark ? "rgba(59, 130, 246, 0.3)" : "#bfdbfe",
    fileText: dark ? "#93c5fd" : "#1e40af",
    xBg: dark ? "#1e293b" : "#f8fafc",
    xBorder: dark ? "#334155" : "#e2e8f0",
    closeBtnBg: dark ? "#334155" : "#0f172a",
  };

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

  const dynamicInputCls = {
    width: "100%",
    padding: "12px 16px",
    fontSize: 14,
    fontFamily: "inherit",
    color: c.textColor,
    background: dark ? "#0f172a" : "#f8fafc",
    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
    borderRadius: 12,
    outline: "none",
    transition: "all 0.2s",
    boxSizing: "border-box"
  };

  const onFocusDynamic = e => {
    e.target.style.background = dark ? "#111827" : "#fff";
    e.target.style.borderColor = "#10b981";
    e.target.style.boxShadow = "0 0 0 4px rgba(16, 185, 129, 0.1)";
  };

  const onBlurDynamic = e => {
    e.target.style.background = dark ? "#0f172a" : "#f8fafc";
    e.target.style.borderColor = dark ? "#334155" : "#e2e8f0";
    e.target.style.boxShadow = "none";
  };

  const sColors = {
    normal: {
      bg: dark ? "rgba(34,197,94,0.12)" : "#f0fdf4",
      color: dark ? "#86efac" : "#166534",
      border: dark ? "rgba(34,197,94,0.3)" : "#86efac"
    },
    moderate: {
      bg: dark ? "rgba(251,191,36,0.12)" : "#fffbeb",
      color: dark ? "#fcd34d" : "#92400e",
      border: dark ? "rgba(251,191,36,0.3)" : "#fde68a"
    },
    severe: {
      bg: dark ? "rgba(239,68,68,0.12)" : "#fef2f2",
      color: dark ? "#fca5a5" : "#991b1b",
      border: dark ? "rgba(239,68,68,0.3)" : "#fca5a5"
    },
  };

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
    const onUpdated = data => {
      const r = data?.record || (data?._id ? data : null);
      if (r) {
        setRecords(prev => prev.map(x => (x._id === r._id ? r : x)));
        setViewingRecord(prev => (prev?._id === r._id ? r : prev));
      }
    };
    const onDeleted = data => { const id = data?.recordId || data?._id; if (id) setRecords(prev => prev.filter(x => x._id !== id)); };

    websocketService.onHealthRecordCreated(onCreated); websocketService.onHealthRecordUpdated(onUpdated); websocketService.onHealthRecordDeleted(onDeleted);
    return () => { websocketService.offHealthRecordCreated(onCreated); websocketService.offHealthRecordUpdated(onUpdated); websocketService.offHealthRecordDeleted(onDeleted); };
  }, [user?.role, doctorPatients]);

  const openEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      patientId: record.patientId?._id || record.patientId || "",
      title: record.title || "",
      type: record.type || record.recordType || "diagnosis",
      content: record.content || record.description || "",
      severity: record.severity || "normal",
      notes: record.notes || "",
      date: new Date(record.date || record.createdAt).toISOString().split("T")[0]
    });
    setShowModal(true);
  };

  const openFeedback = (record) => {
    openEdit(record);
  };

  const openDetail = async (record) => {
    setViewingRecord(record);
    if (user?.role === "patient" && !record.readByPatient) {
      try {
        // Update locally immediately for better UX
        setRecords(prev => prev.map(r => r._id === record._id ? { ...r, readByPatient: true } : r));
        setViewingRecord(prev => ({ ...prev, readByPatient: true }));

        await apiClient.patch(`/health-records/${record._id}/read`);
        // Increased delay to ensure DB aggregation (stats) is fully synchronized
        setTimeout(() => { if (onRefresh) onRefresh(); }, 800);
      } catch (err) { console.error("Failed to mark as read"); }
    }
  };

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
      setShowModal(false); setFile(null);
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err.response?.data?.error || "Failed to save record"); }
  };

  const handleDelete = async id => {
    if (!window.confirm("Delete this health record? This cannot be undone.")) return;
    try {
      await apiClient.delete(`/health-records/${id}`);
      setRecords(prev => prev.filter(r => r._id !== id));
      if (onRefresh) onRefresh();
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

      {error && <div className="dm-error-banner" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#dc2626", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(220, 38, 38, 0.05)" }}>{error}<button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fca5a5", display: "flex", alignItems: "center" }}><X size={18} /></button></div>}
      {success && <div className="dm-success-banner" style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#166534", boxShadow: "0 2px 8px rgba(22, 163, 74, 0.05)" }}>{success}</div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        <button className={filterType === "all" ? "" : "dm-outline-btn"} onClick={() => setFilterType("all")} style={{ padding: "8px 16px", fontSize: 14, fontWeight: filterType === "all" ? 600 : 500, background: filterType === "all" ? "#10b981" : "#fff", color: filterType === "all" ? "#fff" : "#475569", border: filterType === "all" ? "1px solid #10b981" : "1px solid #e2e8f0", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }} onMouseEnter={e => { if (filterType !== "all") { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; } }} onMouseLeave={e => { if (filterType !== "all") { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; } }}>All</button>
        {RECORD_TYPES.map(rt => (
          <button className={filterType === rt.value ? "" : "dm-outline-btn"} key={rt.value} onClick={() => setFilterType(rt.value)} style={{ padding: "8px 16px", fontSize: 14, fontWeight: filterType === rt.value ? 600 : 500, background: filterType === rt.value ? "#10b981" : "#fff", color: filterType === rt.value ? "#fff" : "#475569", border: filterType === rt.value ? "1px solid #10b981" : "1px solid #e2e8f0", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => { if (filterType !== rt.value) { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; } }} onMouseLeave={e => { if (filterType !== rt.value) { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; } }}>
            {filterType === rt.value ? <CheckCircle size={14} /> : null} {rt.label}
          </button>
        ))}
      </div>

      {loading ? <Loader message="Loading health records..." /> : filteredRecords.length === 0 ? (
        <SectionCard><EmptyState icon={<ClipboardList size={32} color="#94a3b8" />} title="No health records" subtitle={user?.role === "doctor" ? "Create a record for a patient to see it here." : "Your health records will appear here when added by a doctor."} /></SectionCard>
      ) : (
        <div className="dm-list-surface" style={{ background: dark ? "#111827" : "#fff", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 16, overflow: "hidden", boxShadow: dark ? "0 10px 28px rgba(2,6,23,0.35)" : "0 4px 12px rgba(15,23,42,0.03)" }}>
          {filteredRecords.map((record, idx) => {
            const rType = RECORD_TYPES.find(t => t.value === (record.type || record.recordType)) || RECORD_TYPES[5];
            const severityStyle = SEVERITY_COLORS[record.severity || "normal"] || SEVERITY_COLORS.normal;
            const isNew = user?.role === "patient" && !record.readByPatient;

            return (
              <div
                key={record._id}
                onClick={() => openDetail(record)}
                className="dm-record-row"
                style={{
                  padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, cursor: "pointer",
                  borderBottom: idx === filteredRecords.length - 1 ? "none" : `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`,
                  transition: "background 0.2s", background: isNew ? (dark ? "rgba(34,197,94,0.12)" : "#f0fdf4") : "transparent"
                }}
                onMouseEnter={e => e.currentTarget.style.background = isNew ? (dark ? "rgba(34,197,94,0.18)" : "#dcfce7") : (dark ? "#0f172a" : "#f8fafc")}
                onMouseLeave={e => e.currentTarget.style.background = isNew ? (dark ? "rgba(34,197,94,0.12)" : "#f0fdf4") : "transparent"}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: dark ? "#0f172a" : rType.bg, border: dark ? "1px solid #334155" : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {rType.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <div className="dm-soft-text" style={{ fontSize: 15, fontWeight: 600, color: dark ? "#e2e8f0" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.title}</div>
                    {isNew && <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#10b981", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, textTransform: "uppercase" }}><Bell size={10} fill="currentColor" /> New</span>}
                    {user?.role === "doctor" && !record.notes && <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#fef9c3", color: "#854d0e", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, textTransform: "uppercase", border: "1px solid #fde68a" }}><AlertCircle size={10} /> Feedback Needed</span>}
                  </div>
                  <div className="dm-soft-muted" style={{ fontSize: 13, color: dark ? "#94a3b8" : "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{user?.role === "doctor" ? `Patient: ${record.patientId?.name || "Unknown"}` : `Dr. ${record.doctorId?.name || record.doctorName || "Unknown"}`}</span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#cbd5e1" }}></span>
                    <span>{new Date(record.date || record.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ display: "inline-flex", padding: "4px 10px", fontSize: 12, fontWeight: 600, borderRadius: 999, background: sColors[record.severity || "normal"].bg, color: sColors[record.severity || "normal"].color, border: `1px solid ${sColors[record.severity || "normal"].border}` }}>{record.severity || "normal"}</span>

                  {user?.role === "doctor" && (
                    <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(record)} title="Edit" style={{ width: 32, height: 32, background: dark ? "#0f172a" : "#fff", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 8, cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(record._id)} title="Delete" style={{ width: 32, height: 32, background: dark ? "#0f172a" : "#fff", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 8, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} /></button>
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
      {viewingRecord && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="dm-modal-surface" style={{ background: c.modalBg, border: `1px solid ${c.modalBorder}`, borderRadius: 24, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: dark ? "0 24px 64px rgba(2,6,23,0.55)" : "0 24px 64px rgba(15,23,42,0.2)" }}>
            <div className="dm-modal-header" style={{ padding: "24px", borderBottom: `1px solid ${c.headerBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: c.headerBg, zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: dark ? "rgba(16,185,129,0.12)" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                  <FileText size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="dm-page-title" style={{ fontSize: 18, fontWeight: 700, color: c.titleColor }}>Record Details</div>
                  <div className="dm-soft-muted" style={{ fontSize: 13, color: c.mutedColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{viewingRecord.title}</div>
                </div>
              </div>
              <button onClick={() => setViewingRecord(null)} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: c.xBg, border: `1px solid ${c.xBorder}`, borderRadius: 10, cursor: "pointer", color: c.mutedColor }}><X size={18} /></button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div className="dm-detail-panel" style={{ padding: 12, background: c.panelBg, borderRadius: 12, border: `1px solid ${c.panelBorder}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.mutedColor, textTransform: "uppercase", marginBottom: 4 }}>Date</div>
                  <div className="dm-soft-text" style={{ fontSize: 14, fontWeight: 500, color: c.textColor }}>{new Date(viewingRecord.date || viewingRecord.createdAt).toLocaleDateString("en-US", { dateStyle: "long" })}</div>
                </div>
                <div className="dm-detail-panel" style={{ padding: 12, background: c.panelBg, borderRadius: 12, border: `1px solid ${c.panelBorder}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.mutedColor, textTransform: "uppercase", marginBottom: 4 }}>Severity</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: sColors[viewingRecord.severity]?.color || c.textColor }}>{(viewingRecord.severity || "normal").toUpperCase()}</div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: c.mutedColor, textTransform: "uppercase", marginBottom: 8 }}>Details & Findings</label>
                <div className="dm-detail-panel" style={{ background: c.panelBg, padding: 16, borderRadius: 16, border: `1px solid ${c.panelBorder}`, fontSize: 14, color: c.textColor, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {viewingRecord.content || viewingRecord.description}
                </div>
              </div>

              {viewingRecord.notes && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#10b981", textTransform: "uppercase", marginBottom: 8 }}>Doctor's Feedback</label>
                  <div className="dm-feedback-panel" style={{ background: c.feedbackBg, padding: 16, borderRadius: 16, border: `1px solid ${c.feedbackBorder}`, display: "flex", gap: 12 }}>
                    <MessageSquare size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 14, color: c.feedbackText, lineHeight: 1.6 }}>{viewingRecord.notes}</div>
                  </div>
                </div>
              )}

              {(viewingRecord.fileName || viewingRecord.fileContentType) && (
                <div className="dm-file-panel" style={{ marginTop: 8, padding: 16, background: c.fileBg, borderRadius: 16, border: `1px solid ${c.fileBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: dark ? "rgba(255,255,255,0.1)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", flexShrink: 0 }}><FileText size={18} /></div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: c.fileText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{viewingRecord.fileName || "Medical Report"}</div>
                  </div>
                  <a href={`${API_URL}/health-records/${viewingRecord._id}/file?token=${localStorage.getItem('token')}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>View File</a>
                </div>
              )}
            </div>

            <div className="dm-modal-footer" style={{ padding: "16px 24px", borderTop: `1px solid ${c.footerBorder}`, display: "flex", justifyContent: "flex-end", background: c.footerBg }}>
              <button onClick={() => setViewingRecord(null)} style={{ padding: "10px 24px", background: c.closeBtnBg, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Close Details</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div className="dm-modal-surface" style={{ background: c.modalBg, border: `1px solid ${c.modalBorder}`, borderRadius: 24, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: dark ? "0 24px 64px rgba(2,6,23,0.55)" : "0 24px 64px rgba(15,23,42,0.2)" }}>
            <div className="dm-modal-header" style={{ padding: "24px", borderBottom: `1px solid ${c.headerBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: c.headerBg, zIndex: 10 }}>
              <div>
                <div className="dm-page-title" style={{ fontSize: 20, fontWeight: 700, color: c.titleColor, letterSpacing: "-0.01em" }}>{editingRecord ? "Update Health Record" : "New Health Record"}</div>
                <div className="dm-soft-muted" style={{ fontSize: 14, color: c.mutedColor, marginTop: 4 }}>{editingRecord ? "Provide feedback or update record details." : "Add a new record for your patient."}</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: c.xBg, border: `1px solid ${c.xBorder}`, borderRadius: 10, cursor: "pointer", color: c.mutedColor, transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? "#1e293b" : "#f1f5f9"; e.currentTarget.style.color = dark ? "#f8fafc" : "#0f172a"; }} onMouseLeave={e => { e.currentTarget.style.background = c.xBg; e.currentTarget.style.color = c.mutedColor; }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              {!editingRecord && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: c.textColor, marginBottom: 8 }}>{user?.role === "doctor" ? "Select Patient *" : "Select Doctor (Optional)"}</label>
                  {patients.length > 0 ? <EntitySearch entities={patients} value={formData.patientId} onChange={p => setFormData(prev => ({ ...prev, patientId: p?._id || "" }))} placeholder={user?.role === "doctor" ? "Search patient..." : "Search doctor..."} />
                    : <div style={{ padding: "12px 16px", background: dark ? "rgba(251,191,36,0.12)" : "#fffbeb", border: `1px solid ${dark ? "rgba(251,191,36,0.3)" : "#fde68a"}`, borderRadius: 12, fontSize: 14, color: dark ? "#fbbf24" : "#92400e", display: "flex", gap: 8 }}><AlertCircle size={18} /> No {user?.role === "doctor" ? "patients" : "doctors"} available.</div>}
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: c.textColor, marginBottom: 8 }}>Record Title *</label>
                <input type="text" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Annual Blood Work" style={dynamicInputCls} onFocus={onFocusDynamic} onBlur={onBlurDynamic} required />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: c.textColor, marginBottom: 8 }}>Record Type</label>
                  <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} style={{ ...dynamicInputCls, cursor: "pointer", appearance: "none" }} onFocus={onFocusDynamic} onBlur={onBlurDynamic}>
                    {RECORD_TYPES.map(t => <option key={t.value} value={t.value} style={{ background: c.modalBg, color: c.textColor }}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: c.textColor, marginBottom: 8 }}>Severity</label>
                  <select value={formData.severity} onChange={e => setFormData(p => ({ ...p, severity: e.target.value }))} style={{ ...dynamicInputCls, cursor: "pointer", appearance: "none" }} onFocus={onFocusDynamic} onBlur={onBlurDynamic}>
                    <option value="normal" style={{ background: c.modalBg, color: c.textColor }}>Normal</option>
                    <option value="moderate" style={{ background: c.modalBg, color: c.textColor }}>Moderate</option>
                    <option value="severe" style={{ background: c.modalBg, color: c.textColor }}>Severe</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: c.textColor, marginBottom: 8 }}>Details / Results *</label>
                <textarea value={formData.content} onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} placeholder="Enter the main record details..." rows={4} style={{ ...dynamicInputCls, resize: "vertical" }} onFocus={onFocusDynamic} onBlur={onBlurDynamic} required />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: c.textColor, marginBottom: 8 }}>Attach Report (File) *</label>
                <div style={{ position: "relative" }}>
                  <input type="file" onChange={e => setFile(e.target.files[0])} style={{ ...inputCls, padding: "10px 16px" }} onFocus={onFocus} onBlur={onBlur} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
                  <div style={{ fontSize: 12, color: dark ? "#94a3b8" : "#64748b", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={14} /> PDF, Images, or DOC (Max 10MB)
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: dark ? "#cbd5e1" : "#334155", marginBottom: 8 }}>Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} style={inputCls} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 8 }}>Doctor's Feedback / Remarks</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder={user?.role === "doctor" ? "Provide your medical advice or feedback here..." : "Doctor's feedback will appear here."}
                    rows={2}
                    style={{ ...inputCls, borderColor: "#10b981", background: dark ? "rgba(16,185,129,0.12)" : "#f0fdf4" }}
                    onFocus={onFocus} onBlur={onBlur}
                    readOnly={user?.role === "patient"}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, paddingTop: 16, borderTop: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}` }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "14px", background: dark ? "#0f172a" : "#f8fafc", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 12, fontSize: 15, fontWeight: 600, color: dark ? "#cbd5e1" : "#475569", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = dark ? "#1e293b" : "#f1f5f9"; e.currentTarget.style.borderColor = dark ? "#475569" : "#cbd5e1"; }} onMouseLeave={e => { e.currentTarget.style.background = dark ? "#0f172a" : "#f8fafc"; e.currentTarget.style.borderColor = dark ? "#334155" : "#e2e8f0"; }}>Cancel</button>
                <button type="submit" style={{ flex: 2, padding: "14px", background: "#10b981", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)" }} onMouseEnter={e => { e.currentTarget.style.background = "#059669"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.3)"; }} onMouseLeave={e => { e.currentTarget.style.background = "#10b981"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.2)"; }}>{editingRecord ? "Save Changes" : "Create Record"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
