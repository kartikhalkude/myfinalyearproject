import React, { useState, useEffect } from "react";
import apiClient from "../services/apiClient";
import { SectionCard, Badge, Btn, EmptyState, Loader } from "./UI";
import { Stethoscope } from "lucide-react";

const TIME_SLOTS = ["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00","15:30","16:00","16:30"];

export default function AppointmentBooking({ onBookingComplete }) {
  const [doctors, setDoctors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ date: "", time: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiClient.get("/doctors").then(r => setDoctors(r.data)).catch(() => setError("Failed to load doctors.")).finally(() => setFetching(false));
  }, []);

  const minDate = () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!selected) { setError("Please select a doctor."); return; }
    if (!form.date || !form.time) { setError("Please choose a date and time."); return; }
    setLoading(true); setError("");
    try {
      await apiClient.post("/appointments", { doctorId: selected._id, ...form });
      setSuccess(true); setForm({ date: "", time: "", reason: "" }); setSelected(null);
      if (onBookingComplete) onBookingComplete();
      setTimeout(() => setSuccess(false), 6000);
    } catch (err) {
      setError(err.response?.data?.error || "Booking failed. Please try again.");
    } finally { setLoading(false); }
  };

  const avatarColors = ["#1db585","#3b82f6","#8b5cf6","#f59e0b","#f43f5e","#14b8a6"];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em", marginBottom: 3 }}>Book an Appointment</h1>
        <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b" }}>Select a doctor and choose a time that works for you.</p>
      </div>

      {success && (
        <div className="dm-success-banner" style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "14px 16px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#166534" }}>Appointment booked</div>
            <div style={{ fontSize: 13, color: "#16a34a", marginTop: 2 }}>The doctor will review and confirm your appointment shortly.</div>
          </div>
        </div>
      )}

      {error && (
        <div className="dm-error-banner" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 13.5, color: "#dc2626", display: "flex", gap: 8, alignItems: "center" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "flex-start" }}>
        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Doctor select */}
          <SectionCard>
            <div className="dm-section-header" style={{ padding: "18px 20px", borderBottom: "1px solid #f8fafc" }}>
              <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Choose a doctor</div>
              <div className="dm-soft-muted" style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>{doctors.length} available specialists</div>
            </div>
            <div style={{ padding: 16 }}>
              {fetching ? <Loader message="Loading doctors..." /> : doctors.length === 0 ? (
                <EmptyState icon={<Stethoscope size={24} color="#94a3b8" />} title="No doctors available" subtitle="Please check back later." />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  {doctors.map((doc, i) => {
                    const isSelected = selected?._id === doc._id;
                    const color = avatarColors[i % avatarColors.length];
                    return (
                      <div key={doc._id} onClick={() => setSelected(doc)}
                        className="dm-select-card"
                        style={{ padding: "14px", border: isSelected ? "2px solid #1db585" : "1.5px solid #f1f5f9", borderRadius: 12, cursor: "pointer", background: isSelected ? "#f0faf7" : "#fff", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 12 }}
                        onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = "#d1f3ea"; e.currentTarget.style.background = "#fafffe"; } }}
                        onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = "#f1f5f9"; e.currentTarget.style.background = "#fff"; } }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 15, flexShrink: 0 }}>{doc.name.charAt(0)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="dm-soft-text" style={{ fontSize: 13.5, fontWeight: 500, color: isSelected ? "#0a7a57" : "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                          <div className="dm-soft-muted" style={{ fontSize: 12, color: isSelected ? "#1db585" : "#94a3b8", marginTop: 1 }}>{doc.specialization}</div>
                        </div>
                        {isSelected && (
                          <div style={{ marginLeft: "auto", width: 18, height: 18, background: "#1db585", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Appointment details */}
          {selected && (
            <SectionCard style={{ animation: "fadeIn 0.25s ease" }}>
              <div className="dm-section-header" style={{ padding: "18px 20px", borderBottom: "1px solid #f8fafc" }}>
                <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Appointment details</div>
                <div className="dm-soft-muted" style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>With Dr. {selected.name}</div>
              </div>
              <form onSubmit={handleSubmit} style={{ padding: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>Date *</label>
                  <input type="date" value={form.date} min={minDate()} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required
                    style={{ padding: "9px 12px", fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, outline: "none", width: "100%", boxSizing: "border-box" }}
                    onFocus={e => { e.target.style.borderColor = "#1db585"; e.target.style.boxShadow = "0 0 0 3px rgba(29,181,133,0.1)"; }}
                    onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                  />
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}>Appointments can be booked from tomorrow onwards.</p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 8 }}>Time slot *</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {TIME_SLOTS.map(slot => {
                      const isSelected = form.time === slot;
                      return (
                        <button key={slot} type="button" onClick={() => setForm(p => ({ ...p, time: slot }))}
                          style={{ padding: "8px 4px", fontSize: 13, fontFamily: "inherit", fontWeight: isSelected ? 500 : 400, textAlign: "center", border: isSelected ? "2px solid #1db585" : "1.5px solid #e2e8f0", borderRadius: 9, cursor: "pointer", background: isSelected ? "#f0faf7" : "#fff", color: isSelected ? "#0a7a57" : "#475569", transition: "all 0.15s" }}>
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>Reason for visit <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
                  <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={3} placeholder="Describe your symptoms or reason for this consultation..."
                    style={{ width: "100%", padding: "9px 12px", fontSize: 14, fontFamily: "inherit", color: "#1e293b", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }}
                    onFocus={e => { e.target.style.borderColor = "#1db585"; e.target.style.boxShadow = "0 0 0 3px rgba(29,181,133,0.1)"; }}
                    onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                <Btn type="submit" loading={loading} disabled={!form.date || !form.time || loading} style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
                  {loading ? "Booking..." : "Confirm appointment"}
                </Btn>
              </form>
            </SectionCard>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {selected ? (
            <SectionCard>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 11 }}>Selected doctor</div>
                <div className="dm-section-header" style={{ textAlign: "center", paddingBottom: 18, borderBottom: "1px solid #f8fafc", marginBottom: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1db585", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 22, margin: "0 auto 10px" }}>{selected.name.charAt(0)}</div>
                  <div className="dm-page-title" style={{ fontSize: 15, fontWeight: 500, color: "#0f172a" }}>{selected.name}</div>
                  <div style={{ fontSize: 13, color: "#1db585", marginTop: 3 }}>{selected.specialization}</div>
                  {selected.email && <div className="dm-soft-muted" style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{selected.email}</div>}
                </div>
                {form.date && form.time && (
                  <div className="dm-soft-panel" style={{ background: "#f0faf7", borderRadius: 10, padding: "12px 14px" }}>
                    <div className="dm-soft-muted" style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Booking summary</div>
                    <div className="dm-soft-muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 4 }}>
                      <span>Date</span><span className="dm-soft-text" style={{ fontWeight: 500, color: "#1e293b" }}>{new Date(form.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <div className="dm-soft-muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569" }}>
                      <span>Time</span><span className="dm-soft-text" style={{ fontWeight: 500, color: "#1e293b" }}>{form.time}</span>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          ) : (
            <SectionCard>
              <EmptyState icon={<Stethoscope size={24} color="#94a3b8" />} title="No doctor selected" subtitle="Pick a doctor from the list to continue booking." />
            </SectionCard>
          )}

          <SectionCard>
            <div style={{ padding: 18 }}>
              <div className="dm-page-title" style={{ fontSize: 13, fontWeight: 500, color: "#0f172a", marginBottom: 12 }}>Booking guidelines</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Appointments confirmed within 24 hours",
                  "Arrive 10 min before scheduled time",
                  "Email confirmation will be sent",
                  "Bring valid ID and previous records",
                  "Consultation: 15–30 minutes",
                ].map((tip, i) => (
                  <div key={i} className="dm-soft-muted" style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "#64748b" }}>
                    <div style={{ width: 16, height: 16, background: "#f0faf7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#1db585" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}
