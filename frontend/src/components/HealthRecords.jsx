// frontend/src/components/HealthRecords.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import websocketService from "../services/websocket";
import {
  X,
  Plus,
  Edit2,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
  Search,
  Activity,
  Thermometer,
  Heart,
  ClipboardList,
} from "lucide-react";
import { SectionCard, Badge, Btn, Loader, EmptyState, PageHeader, StatCard } from "./UI";

const inputStyle = { width: "100%", padding: "10px 14px", fontSize: 13.5, fontFamily: "inherit", color: "#1e293b", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" };
const onFocus = e => { e.target.style.borderColor = "#1db585"; e.target.style.boxShadow = "0 0 0 3px rgba(29,181,133,0.08)"; };
const onBlur = e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };

// ─── Reusable email-based patient selector ────────────────────────────────────

function PatientEmailSelector({ patients, value, onChange, required }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);

  const selected = patients.find((p) => p._id === value);

  const filtered = query.trim()
    ? patients.filter(
        (p) =>
          p.email?.toLowerCase().includes(query.toLowerCase()) ||
          p.name?.toLowerCase().includes(query.toLowerCase()),
      )
    : patients;

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (patient) => {
    onChange(patient);
    setOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        style={{
          display: "flex", alignItems: "center", padding: "10px 14px", border: "1.5px solid",
          borderColor: open || focused ? "#1db585" : "#e2e8f0",
          borderRadius: 10, cursor: "text", background: "#fff",
          boxShadow: open || focused ? "0 0 0 3px rgba(29,181,133,0.08)" : "none",
          transition: "all 0.15s"
        }}
        onClick={() => setOpen(true)}
      >
        <Search style={{ width: 16, height: 16, color: "#94a3b8", marginRight: 8, flexShrink: 0 }} />
        {selected && !open ? (
          <span style={{ flex: 1, fontSize: 13.5, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 500 }}>{selected.name}</span>
            <span style={{ color: "#64748b", marginLeft: 8 }}>({selected.email})</span>
          </span>
        ) : (
          <input
            type="text"
            style={{ flex: 1, outline: "none", fontSize: 13.5, background: "transparent", border: "none", color: "#1e293b", padding: 0 }}
            placeholder={
              selected
                ? `${selected.name} (${selected.email})`
                : "Search patient by name or email…"
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            required={required && !value}
          />
        )}
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            style={{ marginLeft: 8, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", display: "flex" }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>

      {open && (
        <div style={{ position: "absolute", zIndex: 50, marginTop: 4, width: "100%", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)", maxHeight: 224, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "12px 16px", fontSize: 13, color: "#64748b", textAlign: "center" }}>
              No patients found
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p._id}
                type="button"
                style={{ width: "100%", textAlign: "left", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.15s" }}
                onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"}
                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(p)}
              >
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1db585", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {p.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name || "Unknown"}
                  </p>
                  <p style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {required && (
        <select
          style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", borderWidth: 0 }}
          value={value || ""}
          onChange={() => {}}
          required={required}
          tabIndex={-1}
          aria-hidden
        >
          <option value="" />
          {patients.map((p) => (
            <option key={p._id} value={p._id}>
              {p.email}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// ─── Record type config ───────────────────────────────────────────────────────

const RECORD_TYPES = [
  {
    value: "lab_result",
    label: "Lab Result",
    icon: <Activity style={{ width: 16, height: 16 }} />,
  },
  {
    value: "diagnosis",
    label: "Diagnosis",
    icon: <ClipboardList style={{ width: 16, height: 16 }} />,
  },
  {
    value: "vital_signs",
    label: "Vital Signs",
    icon: <Thermometer style={{ width: 16, height: 16 }} />,
  },
  {
    value: "imaging",
    label: "Imaging",
    icon: <FileText style={{ width: 16, height: 16 }} />,
  },
  {
    value: "consultation",
    label: "Consultation",
    icon: <Heart style={{ width: 16, height: 16 }} />,
  },
  { value: "other", label: "Other", icon: <FileText style={{ width: 16, height: 16 }} /> },
];

const typeLabel = (val) =>
  RECORD_TYPES.find((t) => t.value === val)?.label || val;
const typeIcon = (val) =>
  RECORD_TYPES.find((t) => t.value === val)?.icon || (
    <FileText style={{ width: 16, height: 16 }} />
  );

const EMPTY_FORM = {
  patientId: "",
  title: "",
  type: "diagnosis",
  content: "",
  severity: "normal",
  notes: "",
  date: new Date().toISOString().split("T")[0],
};

// ─── Main HealthRecords component ─────────────────────────────────────────────

function HealthRecords({ doctorPatients }) {
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

  useEffect(() => {
    if (doctorPatients && doctorPatients.length > 0) {
      setPatients(doctorPatients);
    }
  }, [doctorPatients]);

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    const onCreated = (data) => {
      const record = data?.record || (data?._id ? data : null);
      if (record) {
        setRecords((prev) => {
          if (prev.some((r) => r._id === record._id)) return prev;
          return [record, ...prev];
        });
      }
    };
    const onUpdated = (data) => {
      const record = data?.record || (data?._id ? data : null);
      if (record) {
        setRecords((prev) =>
          prev.map((r) => (r._id === record._id ? record : r)),
        );
      }
    };
    const onDeleted = (data) => {
      const id = data?.recordId || data?._id;
      if (id) {
        setRecords((prev) => prev.filter((r) => r._id !== id));
      }
    };

    websocketService.onHealthRecordCreated(onCreated);
    websocketService.onHealthRecordUpdated(onUpdated);
    websocketService.onHealthRecordDeleted(onDeleted);

    return () => {
      websocketService.offHealthRecordCreated(onCreated);
      websocketService.offHealthRecordUpdated(onUpdated);
      websocketService.offHealthRecordDeleted(onDeleted);
    };
  }, []);

  const extractArray = (data, keys = []) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError("");

      if (user?.role === "patient") {
        const recordsRes = await apiClient
          .get("/health-records")
          .catch(() => ({ data: [] }));
        const recordsData = extractArray(recordsRes.data, ["records", "data"]);
        setRecords(recordsData);
        return;
      }

      const [recordsRes, appointRes, prescRes] = await Promise.all([
        apiClient.get("/health-records").catch(() => ({ data: [] })),
        apiClient.get("/appointments").catch(() => ({ data: [] })),
        apiClient.get("/prescriptions").catch(() => ({ data: [] })),
      ]);

      const recordsData = extractArray(recordsRes.data, ["records", "data"]);
      const apptData = extractArray(appointRes.data, ["appointments", "data"]);
      const prescData = extractArray(prescRes.data, ["prescriptions", "data"]);

      setRecords(recordsData);

      if (!(doctorPatients && doctorPatients.length > 0)) {
        const patientMap = new Map();
        const addPatient = (obj) => {
          if (!obj) return;
          const id = obj._id || obj;
          if (typeof id !== "string") return;
          if (!patientMap.has(id)) {
            patientMap.set(id, {
              _id: id,
              name: obj.name || "Unknown Patient",
              email: obj.email || "",
            });
          }
        };
        recordsData.forEach((r) => addPatient(r.patientId));
        apptData.forEach((a) => addPatient(a.patientId));
        prescData.forEach((p) => addPatient(p.patientId));

        setPatients(
          [...patientMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
    } catch (err) {
      setError("Failed to load health records");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingRecord(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      patientId: record.patientId?._id || record.patientId || "",
      title: record.title || "",
      type: record.type || record.recordType || "diagnosis",
      content: record.content || record.description || "",
      severity: record.severity || "normal",
      notes: record.notes || "",
      date: record.date
        ? new Date(record.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!formData.content.trim()) {
      setError("Content is required.");
      return;
    }

    try {
      if (editingRecord) {
        const res = await apiClient.patch(
          `/health-records/${editingRecord._id}`,
          formData,
        );
        setRecords((prev) =>
          prev.map((r) =>
            r._id === editingRecord._id ? res.data.record || res.data : r,
          ),
        );
        setSuccess("Health record updated successfully");
      } else {
        if (user?.role !== "doctor") {
          setError("Only doctors can create health records");
          return;
        }
        const res = await apiClient.post("/health-records", formData);
        setRecords((prev) => [res.data.record || res.data, ...prev]);
        setSuccess("Health record created successfully");
      }
      setShowModal(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this health record? This cannot be undone."))
      return;
    try {
      setError("");
      await apiClient.delete(`/health-records/${id}`);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      setSuccess("Record deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete record");
    }
  };

  const filtered =
    filterType === "all"
      ? records
      : records.filter((r) => r.type === filterType);
  const criticalCount = records.filter((r) => r.severity === "critical" || r.severity === "severe").length;
  const diagnosisCount = records.filter((r) => (r.type || r.recordType) === "diagnosis").length;
  const recentCount = records.filter((r) => {
    if (!r.date) return false;
    const diff = Date.now() - new Date(r.date).getTime();
    return diff <= 1000 * 60 * 60 * 24 * 30;
  }).length;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <PageHeader
        title="Health Records"
        subtitle={user?.role === "doctor" ? "Manage and review patient health records" : "Your health records added by your doctor"}
        action={
          user?.role === "doctor" && (
            <Btn onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Plus style={{ width: 18, height: 18 }} />
              Add Record
            </Btn>
          )
        }
      />

      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 12, display: "flex", alignItems: "flex-start", marginBottom: 20 }}>
          <AlertCircle style={{ width: 20, height: 20, marginRight: 12, flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 14, flex: 1 }}>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0 }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>
      )}
      {success && (
        <div style={{ padding: "12px 16px", background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d", borderRadius: 12, display: "flex", alignItems: "flex-start", marginBottom: 20 }}>
          <CheckCircle style={{ width: 20, height: 20, marginRight: 12, flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 14, flex: 1 }}>{success}</span>
          <button onClick={() => setSuccess("")} style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", padding: 0 }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Records" value={records.length} />
        <StatCard label="Recent 30 Days" value={recentCount} />
        <StatCard label={user?.role === "doctor" ? "High Severity" : "Diagnoses"} value={user?.role === "doctor" ? criticalCount : diagnosisCount} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {[{ value: "all", label: "All" }, ...RECORD_TYPES].map((t) => (
          <button
            key={t.value}
            onClick={() => setFilterType(t.value)}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
              ...(filterType === t.value
                ? { background: "#1db585", color: "#fff", border: "1px solid #1db585" }
                : { background: "#fff", color: "#475569", border: "1px solid #e2e8f0" })
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText style={{ width: 32, height: 32, color: "#94a3b8" }} />}
          title="No health records found"
          message={user?.role === "doctor" ? "Add a new health record for your patients" : "Your doctor will add health records here after your visits"}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 16 }}>
          {filtered.map((record) => (
            <RecordCard
              key={record._id}
              record={record}
              userRole={user?.role}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <RecordModal
          record={editingRecord}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          userRole={user?.role}
          patients={patients}
        />
      )}
    </div>
  );
}

function RecordCard({ record, userRole, onEdit, onDelete }) {
  const content = record.content || record.description || "No content available";
  const recordType = record.type || record.recordType || "diagnosis";
  const recordDate = record.date
    ? new Date(record.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "N/A";
  const shortContent = content.length > 280 ? `${content.slice(0, 280)}...` : content;

  // Map severity to standard Badge colors
  const severityColorMap = {
    normal: "green",
    mild: "slate",
    moderate: "yellow",
    severe: "orange",
    critical: "red",
  };
  const badgeColor = severityColorMap[record.severity] || "slate";

  return (
    <SectionCard>
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#1db585", flexShrink: 0 }}>
              {typeIcon(recordType)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
                {record.title}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Badge color="slate">{typeLabel(recordType)}</Badge>
                <Badge color={badgeColor}>{record.severity?.charAt(0).toUpperCase() + record.severity?.slice(1) || "Normal"}</Badge>
              </div>
            </div>
          </div>

          {userRole === "doctor" && (
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => onEdit(record)}
                style={{ padding: 6, borderRadius: 8, background: "none", border: "none", color: "#3b82f6", cursor: "pointer" }}
                title="Edit"
                onMouseOver={(e) => e.currentTarget.style.background = "#eff6ff"}
                onMouseOut={(e) => e.currentTarget.style.background = "none"}
              >
                <Edit2 style={{ width: 16, height: 16 }} />
              </button>
              <button
                onClick={() => onDelete(record._id)}
                style={{ padding: 6, borderRadius: 8, background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                title="Delete"
                onMouseOver={(e) => e.currentTarget.style.background = "#fef2f2"}
                onMouseOut={(e) => e.currentTarget.style.background = "none"}
              >
                <Trash2 style={{ width: 16, height: 16 }} />
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Date</p>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>{recordDate}</p>
          </div>

          {userRole === "doctor" && record.patientId && (
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", gridColumn: "span 2" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Patient</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {typeof record.patientId === "object" ? record.patientId.name : record.patientId || "Unknown"}
              </p>
            </div>
          )}

          {userRole === "patient" && (
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", gridColumn: "span 2" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Doctor</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {record.doctorId?.name || "Your Doctor"}
              </p>
            </div>
          )}
        </div>

        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Findings / Content
          </p>
          <div style={{ fontSize: 13.5, color: "#1e293b", lineHeight: 1.6, background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", whiteSpace: "pre-wrap" }}>
            {shortContent}
          </div>
        </div>

        {record.notes && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Doctor's Notes
            </p>
            <div style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.6, background: "#f8fafc", padding: 12, borderRadius: 8, fontStyle: "italic", whiteSpace: "pre-wrap" }}>
              {record.notes}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function RecordModal({ record, isOpen, onClose, onSubmit, formData, setFormData, userRole, patients }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(2px)" }} onClick={onClose}></div>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, position: "relative", zIndex: 51, display: "flex", flexDirection: "column", maxHeight: "90vh", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>
            {record ? "Edit Health Record" : "New Health Record"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: "auto" }}>
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {userRole === "doctor" && !record && (
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
                  Patient <span style={{ color: "#ef4444" }}>*</span>
                </label>
                {patients.length > 0 ? (
                  <PatientEmailSelector
                    patients={patients}
                    value={formData.patientId}
                    onChange={(patient) => setFormData({ ...formData, patientId: patient?._id || "" })}
                    required
                  />
                ) : (
                  <div style={{ padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", borderRadius: 10, fontSize: 13 }}>
                    No patients found. Patients appear here once they have had an appointment, prescription, or health record with you.
                  </div>
                )}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
                Title <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={inputStyle}
                onFocus={onFocus} onBlur={onBlur}
                placeholder="e.g., Blood Test Results, Annual Checkup"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
                  Record Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{ ...inputStyle, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 36 }}
                  onFocus={onFocus} onBlur={onBlur}
                >
                  {RECORD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
                  Severity
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  style={{ ...inputStyle, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 36 }}
                  onFocus={onFocus} onBlur={onBlur}
                >
                  {["normal", "mild", "moderate", "severe", "critical"].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={inputStyle}
                onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
                Content / Findings <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
                onFocus={onFocus} onBlur={onBlur}
                rows={4}
                placeholder="Describe the findings, results, or record details…"
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
                Doctor's Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
                onFocus={onFocus} onBlur={onBlur}
                rows={2}
                placeholder="Additional notes or recommendations for the patient…"
              />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ flex: 1, padding: "12px", background: "#f8fafc", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ flex: 1, padding: "12px", background: "#1db585", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              >
                {record ? "Update Record" : "Create Record"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default HealthRecords;
