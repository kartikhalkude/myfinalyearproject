import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import websocketService from "../services/websocket";
import storage from "../utils/storage";
import { SectionCard, EmptyState, Loader, PageHeader, Btn, useDarkMode } from "./UI";
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

  const isDark = useDarkMode();
  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        className={focused || open ? "dm-search-trigger dm-search-trigger-active" : "dm-search-trigger"}
        style={{
          display: "flex", alignItems: "center", padding: "12px 16px", background: focused || open ? (isDark ? "#0f172a" : "#fff") : (isDark ? "#111827" : "#f8fafc"),
          border: "1px solid", borderColor: focused || open ? "#10b981" : (isDark ? "#1e293b" : "#e2e8f0"), borderRadius: 12, cursor: "text",
          boxShadow: focused || open ? "0 0 0 4px rgba(16, 185, 129, 0.1)" : "none", transition: "all 0.2s"
        }}
        onClick={() => setOpen(true)}
      >
        <Search size={16} color="#94a3b8" style={{ flexShrink: 0, marginRight: 10 }} />
        {selected && !open ? (
          <span className="dm-soft-text" style={{ flex: 1, fontSize: 14, color: isDark ? "#f1f5f9" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <strong style={{ fontWeight: 600 }}>{selected.name}</strong> <span style={{ color: "#64748b", marginLeft: 4 }}>({selected.email})</span>
          </span>
        ) : (
          <input type="text" placeholder={selected ? `${selected.name} (${selected.email})` : placeholder} value={q} autoFocus={open}
            onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => { setFocused(true); setOpen(true); }} onBlur={() => setFocused(false)}
            className="dm-soft-text"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "inherit", color: isDark ? "#f1f5f9" : "#0f172a", background: "transparent", padding: 0 }} />
        )}
        {value && <button type="button" onClick={e => { e.stopPropagation(); onChange(null); setQ(""); }} style={{ marginLeft: 8, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}><X size={16} /></button>}
      </div>
      {open && (
        <div className="dm-search-surface" style={{ position: "absolute", zIndex: 50, top: "calc(100% + 8px)", left: 0, right: 0, background: isDark ? "#111827" : "#fff", border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`, borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,0.1)", maxHeight: 240, overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 ? <div className="dm-soft-muted" style={{ padding: "12px", fontSize: 13, color: "#64748b", textAlign: "center" }}>No results found</div> : filtered.map(p => (
            <button key={p._id} type="button" onClick={() => { onChange(p); setOpen(false); setQ(""); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", borderRadius: 8, textAlign: "left", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? "#0f172a" : "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{p.name?.charAt(0)?.toUpperCase()}</div>
              <div><div className="dm-soft-text" style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#f1f5f9" : "#0f172a" }}>{p.name}</div><div className="dm-soft-muted" style={{ fontSize: 12, color: "#64748b" }}>{p.email}</div></div>
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
  const [dark, setDark] = useState(() => storage.getLocalItem("dm") === "1" || document.body.classList.contains("dm"));
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentData, setPaymentData] = useState({ card: "", expiry: "", cvc: "" });
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
    const syncDark = () => setDark(storage.getLocalItem("dm") === "1" || document.body.classList.contains("dm"));
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
        setRecords(prev => prev.map(r => r._id === record._id ? { ...r, readByPatient: true } : r));
        setViewingRecord(prev => ({ ...prev, readByPatient: true }));
        await apiClient.patch(`/health-records/${record._id}/read`);
        setTimeout(() => { if (onRefresh) onRefresh(); }, 800);
      } catch (err) { console.error("Failed to mark as read"); }
    } else if (user?.role === "doctor" && !record.readByDoctor) {
      try {
        setRecords(prev => prev.map(r => r._id === record._id ? { ...r, readByDoctor: true } : r));
        setViewingRecord(prev => ({ ...prev, readByDoctor: true }));
        await apiClient.patch(`/health-records/${record._id}/doctor-read`);
        setTimeout(() => { if (onRefresh) onRefresh(); }, 800);
      } catch (err) { console.error("Failed to mark as read"); }
    }
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!formData.title.trim()) { setError("Title is required."); return; }
    if (!formData.content.trim()) { setError("Content is required."); return; }
    
    // If patient is sending a new record to a doctor, charge a fee
    if (user?.role === "patient" && formData.patientId && !editingRecord) {
      setShowPayment(true);
    } else {
      executeSubmit();
    }
  };

  const handleCardChange = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 16) val = val.slice(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(" ") || val;
    setPaymentData({ ...paymentData, card: formatted });
  };
  
  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length >= 3) val = `${val.slice(0,2)}/${val.slice(2)}`;
    setPaymentData({ ...paymentData, expiry: val });
  };
  
  const handleCvcChange = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 4) val = val.slice(0, 4);
    setPaymentData({ ...paymentData, cvc: val });
  };

  const executeSubmit = async () => {
    setPaying(true);
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
      setShowModal(false); setShowPayment(false); setFile(null);
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err.response?.data?.error || "Failed to save record"); }
    finally { setPaying(false); }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    setPaying(true);
    setTimeout(() => {
      executeSubmit();
    }, 2000);
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
          <Btn variant="primary" size="md" onClick={() => { setEditingRecord(null); setFormData(EMPTY_FORM); setShowModal(true); }} style={{ borderRadius: 12, fontWeight: 600 }}>
            <Plus size={18} /> {user?.role === "doctor" ? "New Record" : "Send Report"}
          </Btn>
        )}
      />

      {error && <div className="dm-error-banner" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#dc2626", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(220, 38, 38, 0.05)" }}>{error}<button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fca5a5", display: "flex", alignItems: "center" }}><X size={18} /></button></div>}
      {success && <div className="dm-success-banner" style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#166534", boxShadow: "0 2px 8px rgba(22, 163, 74, 0.05)" }}>{success}</div>}

      <div className="dm-hide-scrollbar" style={{ display: "flex", overflowX: "auto", gap: 8, marginBottom: 24, paddingBottom: 4, whiteSpace: "nowrap" }}>
        <button className={filterType === "all" ? "" : "dm-outline-btn"} onClick={() => setFilterType("all")} style={{ flexShrink: 0, padding: "8px 16px", fontSize: 13, fontWeight: filterType === "all" ? 600 : 500, background: filterType === "all" ? "#10b981" : (dark ? "#111827" : "#fff"), color: filterType === "all" ? "#fff" : (dark ? "#94a3b8" : "#475569"), border: filterType === "all" ? "1px solid #10b981" : "1px solid #e2e8f0", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>All</button>
        {RECORD_TYPES.map(rt => (
          <button className={filterType === rt.value ? "" : "dm-outline-btn"} key={rt.value} onClick={() => setFilterType(rt.value)} style={{ flexShrink: 0, padding: "8px 16px", fontSize: 13, fontWeight: filterType === rt.value ? 600 : 500, background: filterType === rt.value ? "#10b981" : (dark ? "#111827" : "#fff"), color: filterType === rt.value ? "#fff" : (dark ? "#94a3b8" : "#475569"), border: filterType === rt.value ? "1px solid #10b981" : "1px solid #e2e8f0", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}>
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
            const isNew = (user?.role === "patient" && !record.readByPatient) || (user?.role === "doctor" && !record.readByDoctor);

            return (
              <div
                key={record._id}
                onClick={() => openDetail(record)}
                className="dm-record-row"
                style={{
                  padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 16, cursor: "pointer",
                  borderBottom: idx === filteredRecords.length - 1 ? "none" : `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`,
                  transition: "background 0.2s", background: isNew ? (dark ? "rgba(34,197,94,0.12)" : "#f0fdf4") : "transparent"
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: dark ? "#0f172a" : rType.bg, border: dark ? "1px solid #334155" : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  {rType.icon}
                </div>
 
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div className="dm-soft-text" style={{ fontSize: 14, fontWeight: 700, color: dark ? "#e2e8f0" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.title}</div>
                    {isNew && <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#10b981", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>New</span>}
                    <span style={{ padding: "2px 8px", fontSize: 10, fontWeight: 700, borderRadius: 999, background: sColors[record.severity || "normal"].bg, color: sColors[record.severity || "normal"].color, border: `1px solid ${sColors[record.severity || "normal"].border}`, textTransform: "capitalize" }}>{record.severity || "normal"}</span>
                  </div>
                  
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 12px", fontSize: 12 }}>
                    <span style={{ color: dark ? "#94a3b8" : "#64748b", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                      {user?.role === "doctor" ? `Pat: ${record.patientId?.name || "Unknown"}` : `Dr. ${record.doctorId?.name || record.doctorName || "Unknown"}`}
                    </span>
                    <span style={{ color: dark ? "#475569" : "#cbd5e1", fontSize: 10 }}>•</span>
                    <span style={{ color: dark ? "#64748b" : "#94a3b8", whiteSpace: "nowrap" }}>{new Date(record.date || record.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
 
                <div style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "center", flexShrink: 0 }}>
                  <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                    {user?.role === "doctor" && <button onClick={() => openEdit(record)} title="Edit" style={{ width: 30, height: 30, background: dark ? "#1e293b" : "#fff", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 8, cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}><Edit2 size={13} /></button>}
                    <button onClick={() => handleDelete(record._id)} title="Delete" style={{ width: 30, height: 30, background: dark ? "#1e293b" : "#fff", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 8, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={13} /></button>
                  </div>
                  <ChevronRight size={16} color={dark ? "#334155" : "#cbd5e1"} />
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
                  <a href={`${API_URL}/health-records/${viewingRecord._id}/file?token=${storage.getLocalItem('token')}`} target="_blank" rel="noopener noreferrer"
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

            <form onSubmit={handleInitialSubmit} style={{ padding: 24 }}>
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
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: c.textColor, marginBottom: 8 }}>Attach Report (File) <span style={{ fontWeight: 400, color: c.mutedColor }}>(Optional)</span></label>
                <div style={{ position: "relative" }}>
                  <input type="file" onChange={e => setFile(e.target.files[0])} style={dynamicInputCls} onFocus={onFocusDynamic} onBlur={onBlurDynamic} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
                  <div style={{ fontSize: 12, color: dark ? "#94a3b8" : "#64748b", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={14} /> PDF, Images, or DOC (Max 10MB)
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: dark ? "#cbd5e1" : "#334155", marginBottom: 8 }}>Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} style={dynamicInputCls} onFocus={onFocusDynamic} onBlur={onBlurDynamic} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 8 }}>Doctor's Feedback / Remarks</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder={user?.role === "doctor" ? "Provide your medical advice or feedback here..." : "Doctor's feedback will appear here."}
                    rows={2}
                    style={{ ...dynamicInputCls, borderColor: "#10b981", background: dark ? "rgba(16,185,129,0.12)" : "#f0fdf4" }}
                    onFocus={onFocusDynamic} onBlur={onBlurDynamic}
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

      {/* Payment Modal for Sending Record to Doctor */}
      {showPayment && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: dark ? "#1e293b" : "#fff", borderRadius: 20, width: "100%", maxWidth: 400, overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ background: "#10b981", padding: "20px 24px", color: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Secure Checkout</h3>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>Pay the review fee to send this report to your doctor.</p>
            </div>
            
            <form onSubmit={handlePaymentSubmit} style={{ padding: 24 }}>
              <div style={{ marginBottom: 20, padding: 16, background: dark ? "#0f172a" : "#f8fafc", borderRadius: 12, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: dark ? "#94a3b8" : "#64748b" }}>Record Review Fee</span>
                  <span style={{ fontWeight: 600, color: dark ? "#f8fafc" : "#0f172a" }}>$10</span>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: dark ? "#cbd5e1" : "#475569" }}>Card Information</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" rx="2" fill="#1A1F36"/><path d="M9.135 11.23H7.425L8.52 4H10.155L9.135 11.23ZM14.94 4.21C14.64 4.105 14.175 4 13.62 4C11.955 4 10.8 4.885 10.785 6.13C10.77 7.045 11.61 7.565 12.24 7.865C12.885 8.18 13.11 8.39 13.11 8.675C13.11 9.11 12.585 9.305 12.015 9.305C11.34 9.305 10.95 9.125 10.425 8.87L10.05 10.61C10.575 10.85 11.34 11.045 12.135 11.06C13.92 11.06 15.06 10.175 15.075 8.87C15.09 8.15 14.61 7.61 13.635 7.145C13.065 6.875 12.72 6.695 12.72 6.38C12.705 6.095 13.035 5.78 13.635 5.78C14.16 5.765 14.535 5.885 14.835 6.005L14.94 4.21ZM19.26 11.23H20.73C20.895 11.23 21.03 11.14 21.09 10.99L22.86 4.015H21.255C21.03 4.015 20.865 4.135 20.79 4.345L17.76 11.23H19.26ZM16.32 4H14.88C14.685 4 14.535 4.09 14.445 4.285L12.33 11.23H14.07L14.415 10.27H16.53L16.725 11.23H18.285L16.32 4ZM14.925 8.86L15.795 6.43L16.29 8.86H14.925Z" fill="white"/></svg>
                    <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" rx="2" fill="#FF5F00"/><path d="M10.231 10.825c1.472-1.048 2.428-2.766 2.428-4.717 0-1.95-.956-3.668-2.428-4.716a5.576 5.576 0 00-2.023 6.942 5.576 5.576 0 002.023 2.491z" fill="#EB001B"/><path d="M16.53 11.684a5.576 5.576 0 01-6.3-8.083 5.577 5.577 0 016.3 8.083z" fill="#F79E1B"/></svg>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 8, overflow: "hidden" }}>
                  <input type="text" required placeholder="Card number" value={paymentData.card} onChange={handleCardChange}
                    style={{ width: "100%", padding: "12px 14px", border: "none", borderBottom: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", color: dark ? "#f1f5f9" : "#0f172a", outline: "none", fontSize: 14, fontFamily: "monospace" }} />
                  <div style={{ display: "flex" }}>
                    <input type="text" required placeholder="MM / YY" value={paymentData.expiry} onChange={handleExpiryChange}
                      style={{ flex: 1, padding: "12px 14px", border: "none", borderRight: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", color: dark ? "#f1f5f9" : "#0f172a", outline: "none", fontSize: 14, fontFamily: "monospace" }} />
                    <input type="text" required placeholder="CVC" value={paymentData.cvc} onChange={handleCvcChange}
                      style={{ flex: 1, padding: "12px 14px", border: "none", background: dark ? "#0f172a" : "#fff", color: dark ? "#f1f5f9" : "#0f172a", outline: "none", fontSize: 14, fontFamily: "monospace", WebkitTextSecurity: "disc" }} />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <Btn type="button" variant="outline" onClick={() => setShowPayment(false)} disabled={paying} style={{ flex: 1, justifyContent: "center" }}>Cancel</Btn>
                <Btn type="submit" variant="primary" disabled={paying} style={{ flex: 2, justifyContent: "center", position: "relative" }}>
                  {paying ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg className="spinner" viewBox="0 0 50 50" style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }}><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="90 150" strokeLinecap="round"></circle></svg>
                      Processing...
                    </span>
                  ) : `Pay $10`}
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
