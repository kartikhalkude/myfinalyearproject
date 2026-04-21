import React, { useEffect, useState } from "react";
import apiClient from "../services/apiClient";
import { AlertCircle, CheckCircle, Clock3, Pill, Trash2 } from "lucide-react";
import { SectionCard, StatCard, EmptyState, Loader, Btn, Badge } from "./UI";

export default function MedicineReminderPanel() {
  const [reminders, setReminders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingId, setLoggingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      setError("");
      const [remindersRes, prescriptionsRes] = await Promise.all([
        apiClient.get("/reminders").then((res) => res.data).catch(() => []),
        apiClient
          .get("/prescriptions")
          .then((res) => res.data?.prescriptions || [])
          .catch(() => []),
      ]);

      setReminders(remindersRes || []);
      setPrescriptions(
        (prescriptionsRes || []).filter((p) => p.status === "active"),
      );
    } catch (err) {
      setError(err?.error || "Could not fetch your medicines.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogMedicine = async (id, skipped = false) => {
    try {
      setLoggingId(id);
      setError("");
      setSuccess("");
      await apiClient.post(`/reminders/${id}/log`, { skipped });
      setSuccess(skipped ? "Dose marked as skipped." : "Medicine intake recorded.");
      setReminders((prev) =>
        prev.map((r) =>
          r._id === id
            ? {
                ...r,
                logs: [...(r.logs || []), { takenAt: new Date(), skipped }],
              }
            : r,
        ),
      );
    } catch (err) {
      setError(err?.error || "Could not record this dose.");
    } finally {
      setLoggingId(null);
    }
  };

  const handleDeleteReminder = async (id) => {
    if (!window.confirm("Delete this medicine reminder?")) return;

    try {
      setError("");
      setSuccess("");
      await apiClient.delete(`/reminders/${id}`);
      setReminders((prev) => prev.filter((r) => r._id !== id));
      setSuccess("Medicine reminder deleted.");
    } catch (err) {
      setError(err?.error || "Could not delete this reminder.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 250 }}>
        <Loader />
        <p style={{ marginTop: 16, color: "#64748b", fontWeight: 500 }}>Loading your medicines...</p>
      </div>
    );
  }

  const activePrescriptions = prescriptions.filter((p) => p.status === "active");
  const totalMedicines = activePrescriptions.reduce(
    (sum, prescription) => sum + (prescription.medicines?.length || 0),
    0,
  );
  const recentLogs = reminders.reduce(
    (sum, reminder) => sum + Math.min(reminder.logs?.length || 0, 3),
    0,
  );

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a", letterSpacing: "-0.01em", marginBottom: 4 }}>Medicine Reminders</h2>
        <p style={{ fontSize: 13.5, color: "#64748b" }}>
          Review your active medicines and keep track of scheduled doses more clearly.
        </p>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 12, display: "flex", alignItems: "flex-start", marginBottom: 20 }}>
          <AlertCircle style={{ width: 20, height: 20, marginRight: 12, flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 14 }}>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ padding: "12px 16px", background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d", borderRadius: 12, display: "flex", alignItems: "flex-start", marginBottom: 20 }}>
          <CheckCircle style={{ width: 20, height: 20, marginRight: 12, flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 14 }}>{success}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard
          label="Active Prescriptions"
          value={activePrescriptions.length}
        />
        <StatCard
          label="Prescribed Medicines"
          value={totalMedicines}
        />
        <StatCard
          label="Custom Reminders"
          value={reminders.length}
        />
      </div>

      {activePrescriptions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a", marginBottom: 16 }}>Active Prescriptions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {activePrescriptions.map((prescription) => (
              <SectionCard key={prescription._id}>
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
                        Dr. <span style={{ color: "#1db585" }}>{prescription.doctorId?.name || prescription.doctorName || "Your Doctor"}</span>
                      </h4>
                      <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                        <span style={{ fontWeight: 600, color: "#475569" }}>Diagnosis:</span> {prescription.diagnosis || "Not specified"}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <Badge color="blue">{(prescription.medicines?.length || 0)} medicines</Badge>
                      {prescription.validUntil && (
                        <Badge color="slate">Valid until {new Date(prescription.validUntil).toLocaleDateString()}</Badge>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                      Prescribed medicines
                    </p>
                    {prescription.medicines?.length ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {prescription.medicines.map((med, idx) => (
                          <div key={idx} style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: 16 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Pill style={{ width: 18, height: 18 }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{med.name}</p>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginTop: 12 }}>
                                  <InfoTile label="Dosage" value={med.dosage || "As prescribed"} />
                                  <InfoTile label="Frequency" value={med.frequency || "Not specified"} />
                                  <InfoTile label="Duration" value={med.duration || "Not specified"} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: "#64748b" }}>No medicines specified</p>
                    )}
                  </div>

                  {prescription.advice && (
                    <div style={{ fontSize: 13, color: "#0f172a", background: "#f0fdfa", padding: 12, borderRadius: 10, border: "1px solid #ccfbf1" }}>
                      <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0f766e", marginBottom: 4 }}>
                        Advice
                      </p>
                      <p style={{ lineHeight: 1.5 }}>{prescription.advice}</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      )}

      {reminders.length > 0 && (
        <div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a", marginBottom: 16 }}>Custom Medicine Reminders</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {reminders.map((reminder) => (
              <SectionCard key={reminder._id}>
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{reminder.medicineName}</h4>
                      <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                        {reminder.dosage || "As prescribed"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteReminder(reminder._id)}
                      style={{ display: "flex", alignItems: "center", gap: 4, color: "#ef4444", background: "none", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                      Delete
                    </button>
                  </div>

                  {reminder.instructions && (
                    <div style={{ fontSize: 13, color: "#475569", background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                        Instructions
                      </p>
                      <p style={{ lineHeight: 1.5 }}>{reminder.instructions}</p>
                    </div>
                  )}

                  {reminder.times?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                        Scheduled times
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {reminder.times.map((time, idx) => (
                          <span
                            key={idx}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#e0f2fe", color: "#0369a1", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500 }}
                          >
                            <Clock3 style={{ width: 12, height: 12 }} />
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    <Btn
                      onClick={() => handleLogMedicine(reminder._id)}
                      disabled={loggingId === reminder._id}
                      style={{ background: "#1db585", color: "#fff", borderColor: "#1db585" }}
                    >
                      {loggingId === reminder._id ? "..." : "Mark as Taken"}
                    </Btn>
                    <Btn
                      onClick={() => handleLogMedicine(reminder._id, true)}
                      disabled={loggingId === reminder._id}
                    >
                      {loggingId === reminder._id ? "..." : "Skip"}
                    </Btn>
                  </div>

                  {reminder.logs?.length > 0 && (
                    <div style={{ fontSize: 12, color: "#64748b", paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
                      <p style={{ fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                        Recent logs
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {reminder.logs
                          .slice(-3)
                          .reverse()
                          .map((log, idx) => (
                            <div
                              key={idx}
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#f8fafc", borderRadius: 6, padding: "8px 12px" }}
                            >
                              <span style={{ fontWeight: 600, color: log.skipped ? "#94a3b8" : "#1db585" }}>
                                {log.skipped ? "Skipped" : "Taken"}
                              </span>
                              <span style={{ textAlign: "right" }}>
                                {new Date(log.takenAt).toLocaleDateString()}{" "}
                                {new Date(log.takenAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      )}

      {activePrescriptions.length === 0 && reminders.length === 0 && (
        <EmptyState 
          icon={<Pill style={{ width: 32, height: 32, color: "#94a3b8" }} />} 
          title="No medicines assigned yet" 
          message="Your doctor will add prescriptions here. Custom reminders will also appear here once they are created." 
        />
      )}
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", padding: "8px 12px" }}>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{value}</p>
    </div>
  );
}
