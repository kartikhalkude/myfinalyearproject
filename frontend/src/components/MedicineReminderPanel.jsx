import React, { useEffect, useState } from "react";
import apiClient from "../services/apiClient";
import { AlertCircle, CheckCircle, Clock3, Pill, Trash2 } from "lucide-react";

function MedicineReminderPanel() {
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
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-600 mb-4" />
        <p className="text-gray-600 font-medium">Loading your medicines...</p>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Medicine Reminders</h2>
        <p className="text-gray-600 text-sm">
          Review your active medicines and keep track of scheduled doses more clearly.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-start">
          <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Active Prescriptions"
          value={activePrescriptions.length}
          subtitle="Current doctor-issued prescriptions"
        />
        <SummaryCard
          title="Prescribed Medicines"
          value={totalMedicines}
          subtitle="Medicines across active prescriptions"
          accent="cyan"
        />
        <SummaryCard
          title="Custom Reminders"
          value={reminders.length}
          subtitle={`Recent tracked logs: ${recentLogs}`}
          accent="green"
        />
      </div>

      {activePrescriptions.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800">Active Prescriptions</h3>
          <div className="grid gap-4">
            {activePrescriptions.map((prescription) => (
              <div
                key={prescription._id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Dr.{" "}
                      <span className="text-blue-600">
                        {prescription.doctorId?.name || prescription.doctorName || "Your Doctor"}
                      </span>
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-semibold text-gray-700">Diagnosis:</span>{" "}
                      {prescription.diagnosis || "Not specified"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                      {(prescription.medicines?.length || 0)} medicines
                    </span>
                    {prescription.validUntil && (
                      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                        Valid until {new Date(prescription.validUntil).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Prescribed medicines
                  </p>
                  {prescription.medicines?.length ? (
                    <ul className="space-y-3">
                      {prescription.medicines.map((med, idx) => (
                        <li key={idx} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center flex-shrink-0">
                              <Pill className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900">{med.name}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-sm">
                                <InfoTile label="Dosage" value={med.dosage || "As prescribed"} />
                                <InfoTile label="Frequency" value={med.frequency || "Not specified"} />
                                <InfoTile label="Duration" value={med.duration || "Not specified"} />
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600 text-sm">No medicines specified</p>
                  )}
                </div>

                {prescription.advice && (
                  <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">
                      Advice
                    </p>
                    <p>{prescription.advice}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {reminders.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800">Custom Medicine Reminders</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {reminders.map((reminder) => (
              <div
                key={reminder._id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{reminder.medicineName}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {reminder.dosage || "As prescribed"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteReminder(reminder._id)}
                    className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 font-medium text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>

                {reminder.instructions && (
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Instructions
                    </p>
                    <p>{reminder.instructions}</p>
                  </div>
                )}

                {reminder.times?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Scheduled times
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {reminder.times.map((time, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-xs font-medium"
                        >
                          <Clock3 className="w-3 h-3" />
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => handleLogMedicine(reminder._id)}
                    disabled={loggingId === reminder._id}
                    className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                  >
                    {loggingId === reminder._id ? "..." : "Mark as Taken"}
                  </button>
                  <button
                    onClick={() => handleLogMedicine(reminder._id, true)}
                    disabled={loggingId === reminder._id}
                    className="px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium text-sm disabled:opacity-50"
                  >
                    {loggingId === reminder._id ? "..." : "Skip"}
                  </button>
                </div>

                {reminder.logs?.length > 0 && (
                  <div className="text-xs text-gray-600 pt-4 border-t border-gray-200">
                    <p className="font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      Recent logs
                    </p>
                    <div className="space-y-2">
                      {reminder.logs
                        .slice(-3)
                        .reverse()
                        .map((log, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 bg-gray-50 rounded-md px-3 py-2"
                          >
                            <span className={`font-semibold ${log.skipped ? "text-gray-500" : "text-green-600"}`}>
                              {log.skipped ? "Skipped" : "Taken"}
                            </span>
                            <span className="text-right">
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
            ))}
          </div>
        </section>
      )}

      {activePrescriptions.length === 0 && reminders.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600 text-lg mb-2">No medicines assigned yet</p>
          <p className="text-gray-500 text-sm">
            Your doctor will add prescriptions here. Custom reminders will also
            appear here once they are created.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, subtitle, accent = "gray" }) {
  const accentStyles = {
    gray: "border-gray-200 text-gray-800",
    cyan: "border-cyan-200 text-cyan-700",
    green: "border-green-200 text-green-700",
  };

  return (
    <div className={`bg-white rounded-xl border p-4 ${accentStyles[accent] || accentStyles.gray}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="bg-white rounded-md border border-gray-200 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="text-sm text-gray-800 mt-1">{value}</p>
    </div>
  );
}
