import React, { useState, useEffect } from "react";
import apiClient from "../services/apiClient";
import websocketService from "../services/websocket";
import { SectionCard, Badge, Btn, EmptyState, Loader } from "./UI";
import { Stethoscope } from "lucide-react";

// TIME_SLOTS will be generated dynamically

export default function AppointmentBooking({ onBookingComplete }) {
  const [doctors, setDoctors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ date: "", time: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({ card: "", expiry: "", cvc: "" });
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    apiClient.get("/doctors").then(r => setDoctors(r.data)).catch(() => setError("Failed to load doctors.")).finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    if (selected && form.date) {
      setFetchingSlots(true);
      apiClient.get(`/appointments/booked-slots?doctorId=${selected._id}&date=${form.date}`)
        .then(r => {
          setBookedSlots(r.data);
          setForm(p => r.data.includes(p.time) ? { ...p, time: "" } : p);
        })
        .catch(() => setBookedSlots([]))
        .finally(() => setFetchingSlots(false));
    } else {
      setBookedSlots([]);
    }
  }, [selected, form.date]);

  useEffect(() => {
    const handleSlotBooked = (data) => {
      if (selected && data.doctorId === selected._id && data.date === form.date) {
        setBookedSlots(prev => [...prev, data.time]);
        setForm(p => {
          if (p.time === data.time) {
            setError("The slot you were looking at was just booked by someone else.");
            return { ...p, time: "" };
          }
          return p;
        });
      }
    };
    websocketService.onSlotBooked(handleSlotBooked);
    return () => websocketService.offSlotBooked(handleSlotBooked);
  }, [selected, form.date]);

  const minDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getDynamicSlots = () => {
    if (!selected) return [];
    const avail = selected.availability || { startTime: "09:00", endTime: "17:00", slotDuration: 30, daysOff: [0, 6] };
    if (form.date) {
      const dayOfWeek = new Date(form.date).getDay();
      if (avail.daysOff.includes(dayOfWeek)) return []; // Doctor is off
    }
    const slots = [];
    let [h, m] = avail.startTime.split(":").map(Number);
    const [eh, em] = avail.endTime.split(":").map(Number);
    const endMins = eh * 60 + em;
    
    while (h * 60 + m + avail.slotDuration <= endMins) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      m += avail.slotDuration;
      if (m >= 60) { h += Math.floor(m / 60); m %= 60; }
    }
    return slots;
  };

  const TIME_SLOTS = getDynamicSlots();

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    if (!selected) { setError("Please select a doctor."); return; }
    if (!form.date || !form.time) { setError("Please choose a date and time."); return; }
    
    const fee = selected.availability?.consultationFee ?? 50;
    if (fee > 0) {
      setShowPayment(true);
    } else {
      executeBooking();
    }
  };

  const executeBooking = async () => {
    setLoading(true); setError("");
    try {
      await apiClient.post("/appointments", { doctorId: selected._id, ...form });
      setSuccess(true); setForm({ date: "", time: "", reason: "" }); setSelected(null); setShowPayment(false);
      if (onBookingComplete) onBookingComplete();
      setTimeout(() => setSuccess(false), 6000);
    } catch (err) {
      setError(err.response?.data?.error || "Booking failed. Please try again.");
    } finally { setLoading(false); setPaying(false); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setPaying(true);
    // Simulate payment gateway delay
    setTimeout(() => {
      executeBooking();
    }, 2000);
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

  const avatarColors = ["#1db585","#3b82f6","#8b5cf6","#f59e0b","#f43f5e","#14b8a6"];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", width: "100%", overflowX: "hidden" }}>
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

      <div className="dm-grid-analysis">
        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Doctor select */}
          {/* Doctor select */}
          <SectionCard>
            <div className="dm-section-header" style={{ padding: "18px 20px", borderBottom: `1px solid ${document.body.classList.contains("dm") ? "#1e293b" : "#f8fafc"}` }}>
              <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: document.body.classList.contains("dm") ? "#f8fafc" : "#0f172a" }}>Choose a doctor</div>
              <div className="dm-soft-muted" style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>{doctors.length} available specialists</div>
            </div>
            <div style={{ padding: 16 }}>
              {fetching ? <Loader message="Loading doctors..." /> : doctors.length === 0 ? (
                <EmptyState icon={<Stethoscope size={24} color="#94a3b8" />} title="No doctors available" subtitle="Please check back later." />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                  {doctors.map((doc, i) => {
                    const isSelected = selected?._id === doc._id;
                    const isDark = document.body.classList.contains("dm");
                    const color = avatarColors[i % avatarColors.length];
                    return (
                      <div key={doc._id} onClick={() => { setSelected(doc); setError(""); }}
                        className="dm-select-card"
                        style={{ padding: "14px", border: isSelected ? "2px solid #1db585" : `1.5px solid ${isDark ? "#1e293b" : "#f1f5f9"}`, borderRadius: 12, cursor: "pointer", background: isSelected ? (isDark ? "rgba(29, 181, 133, 0.1)" : "#f0faf7") : (isDark ? "#111827" : "#fff"), transition: "all 0.15s", display: "flex", alignItems: "center", gap: 12 }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 15, flexShrink: 0 }}>{doc.name.charAt(0)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="dm-soft-text" style={{ fontSize: 13.5, fontWeight: 500, color: isSelected ? "#1db585" : (isDark ? "#e2e8f0" : "#1e293b"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
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
              <div className="dm-section-header" style={{ padding: "18px 20px", borderBottom: `1px solid ${document.body.classList.contains("dm") ? "#1e293b" : "#f8fafc"}` }}>
                <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: document.body.classList.contains("dm") ? "#f8fafc" : "#0f172a" }}>Appointment details</div>
                <div className="dm-soft-muted" style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>With Dr. {selected.name}</div>
              </div>
              <form onSubmit={handleInitialSubmit} style={{ padding: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: document.body.classList.contains("dm") ? "#94a3b8" : "#475569", marginBottom: 6 }}>Date *</label>
                  <input type="date" value={form.date} min={minDate()} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required
                    style={{ padding: "9px 12px", fontSize: 14, fontFamily: "inherit", color: document.body.classList.contains("dm") ? "#e2e8f0" : "#1e293b", background: document.body.classList.contains("dm") ? "#0f172a" : "#fff", border: `1.5px solid ${document.body.classList.contains("dm") ? "#1e293b" : "#e2e8f0"}`, borderRadius: 10, outline: "none", width: "100%", boxSizing: "border-box" }}
                  />
                  <p style={{ fontSize: 12, color: "#64748b", marginTop: 5 }}>Appointments can be booked from tomorrow onwards.</p>
                </div>

                {form.date && (
                  <div style={{ marginBottom: 20, animation: "fadeIn 0.25s ease" }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: document.body.classList.contains("dm") ? "#94a3b8" : "#475569", marginBottom: 8 }}>Time slot * {fetchingSlots && <span style={{ fontSize: 11, color: "#1db585" }}>(Checking availability...)</span>}</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(64px, 1fr))", gap: 6 }}>
                      {TIME_SLOTS.length === 0 ? (
                        <div style={{ gridColumn: "1/-1", padding: 12, background: document.body.classList.contains("dm") ? "#1e293b" : "#f1f5f9", borderRadius: 8, fontSize: 13, color: "#ef4444", textAlign: "center" }}>Doctor is not available on this day.</div>
                      ) : TIME_SLOTS.map(slot => {
                        const isSelected = form.time === slot;
                        const isBooked = bookedSlots.includes(slot);
                        const isDark = document.body.classList.contains("dm");
                        return (
                          <button key={slot} type="button" onClick={() => !isBooked && setForm(p => ({ ...p, time: slot }))} disabled={isBooked}
                            style={{ padding: "8px 2px", fontSize: 12, fontFamily: "inherit", fontWeight: isSelected ? 600 : 400, textAlign: "center", border: isSelected ? "2px solid #1db585" : `1.5px solid ${isDark ? "#1e293b" : "#e2e8f0"}`, borderRadius: 8, cursor: isBooked ? "not-allowed" : "pointer", background: isBooked ? (isDark ? "#1e293b" : "#f1f5f9") : isSelected ? (isDark ? "rgba(29, 181, 133, 0.1)" : "#f0faf7") : (isDark ? "#0f172a" : "#fff"), color: isBooked ? (isDark ? "#475569" : "#94a3b8") : isSelected ? "#1db585" : (isDark ? "#64748b" : "#475569"), transition: "all 0.15s", opacity: isBooked ? 0.6 : 1, textDecoration: isBooked ? "line-through" : "none" }}>
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: document.body.classList.contains("dm") ? "#94a3b8" : "#475569", marginBottom: 6 }}>Reason for visit <span style={{ fontWeight: 400, color: "#64748b" }}>(optional)</span></label>
                  <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={3} placeholder="Describe your symptoms or reason for this consultation..."
                    style={{ width: "100%", padding: "9px 12px", fontSize: 14, fontFamily: "inherit", color: document.body.classList.contains("dm") ? "#e2e8f0" : "#1e293b", background: document.body.classList.contains("dm") ? "#0f172a" : "#fff", border: `1.5px solid ${document.body.classList.contains("dm") ? "#1e293b" : "#e2e8f0"}`, borderRadius: 10, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }}
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
                <div style={{ fontSize: 11, fontWeight: 500, color: "#64748b", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.04em" }}>Selected doctor</div>
                <div className="dm-section-header" style={{ textAlign: "center", paddingBottom: 18, borderBottom: `1px solid ${document.body.classList.contains("dm") ? "#1e293b" : "#f8fafc"}`, marginBottom: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1db585", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 22, margin: "0 auto 10px" }}>{selected.name.charAt(0)}</div>
                  <div className="dm-page-title" style={{ fontSize: 15, fontWeight: 500, color: document.body.classList.contains("dm") ? "#f8fafc" : "#0f172a" }}>{selected.name}</div>
                  <div style={{ fontSize: 13, color: "#1db585", marginTop: 3 }}>{selected.specialization}</div>
                  {selected.email && <div className="dm-soft-muted" style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{selected.email}</div>}
                </div>
                {form.date && form.time && (
                  <div className="dm-soft-panel" style={{ background: document.body.classList.contains("dm") ? "rgba(29, 181, 133, 0.1)" : "#f0faf7", borderRadius: 10, padding: "12px 14px" }}>
                    <div className="dm-soft-muted" style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Booking summary</div>
                    <div className="dm-soft-muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#94a3b8", marginBottom: 4 }}>
                      <span>Date</span><span className="dm-soft-text" style={{ fontWeight: 600, color: document.body.classList.contains("dm") ? "#f8fafc" : "#1e293b" }}>{new Date(form.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <div className="dm-soft-muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#94a3b8" }}>
                      <span>Time</span><span className="dm-soft-text" style={{ fontWeight: 600, color: document.body.classList.contains("dm") ? "#f8fafc" : "#1e293b" }}>{form.time}</span>
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
              <div className="dm-page-title" style={{ fontSize: 13, fontWeight: 500, color: document.body.classList.contains("dm") ? "#f8fafc" : "#0f172a", marginBottom: 12 }}>Booking guidelines</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Appointments confirmed within 24 hours",
                  "Arrive 10 min before scheduled time",
                  "Email confirmation will be sent",
                  "Bring valid ID and previous records",
                  "Consultation: 15–30 minutes",
                ].map((tip, i) => (
                  <div key={i} className="dm-soft-muted" style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "#64748b" }}>
                    <div style={{ width: 16, height: 16, background: document.body.classList.contains("dm") ? "rgba(29, 181, 133, 0.15)" : "#f0faf7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
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

      {/* Payment Modal */}
      {showPayment && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: document.body.classList.contains("dm") ? "#1e293b" : "#fff", borderRadius: 20, width: "100%", maxWidth: 400, overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
            <div style={{ background: "#1db585", padding: "20px 24px", color: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Secure Checkout</h3>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>Pay the consultation fee to secure your booking.</p>
            </div>
            
            <form onSubmit={handlePayment} style={{ padding: 24 }}>
              <div style={{ marginBottom: 20, padding: 16, background: document.body.classList.contains("dm") ? "#0f172a" : "#f8fafc", borderRadius: 12, border: `1px solid ${document.body.classList.contains("dm") ? "#334155" : "#e2e8f0"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: document.body.classList.contains("dm") ? "#94a3b8" : "#64748b" }}>Consultation with Dr. {selected.name}</span>
                  <span style={{ fontWeight: 600, color: document.body.classList.contains("dm") ? "#f8fafc" : "#0f172a" }}>${selected.availability?.consultationFee ?? 50}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: document.body.classList.contains("dm") ? "#64748b" : "#94a3b8" }}>
                  <span>{new Date(form.date).toLocaleDateString()} at {form.time}</span>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: document.body.classList.contains("dm") ? "#cbd5e1" : "#475569" }}>Card Information</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" rx="2" fill="#1A1F36"/><path d="M9.135 11.23H7.425L8.52 4H10.155L9.135 11.23ZM14.94 4.21C14.64 4.105 14.175 4 13.62 4C11.955 4 10.8 4.885 10.785 6.13C10.77 7.045 11.61 7.565 12.24 7.865C12.885 8.18 13.11 8.39 13.11 8.675C13.11 9.11 12.585 9.305 12.015 9.305C11.34 9.305 10.95 9.125 10.425 8.87L10.05 10.61C10.575 10.85 11.34 11.045 12.135 11.06C13.92 11.06 15.06 10.175 15.075 8.87C15.09 8.15 14.61 7.61 13.635 7.145C13.065 6.875 12.72 6.695 12.72 6.38C12.705 6.095 13.035 5.78 13.635 5.78C14.16 5.765 14.535 5.885 14.835 6.005L14.94 4.21ZM19.26 11.23H20.73C20.895 11.23 21.03 11.14 21.09 10.99L22.86 4.015H21.255C21.03 4.015 20.865 4.135 20.79 4.345L17.76 11.23H19.26ZM16.32 4H14.88C14.685 4 14.535 4.09 14.445 4.285L12.33 11.23H14.07L14.415 10.27H16.53L16.725 11.23H18.285L16.32 4ZM14.925 8.86L15.795 6.43L16.29 8.86H14.925Z" fill="white"/></svg>
                    <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" rx="2" fill="#FF5F00"/><path d="M10.231 10.825c1.472-1.048 2.428-2.766 2.428-4.717 0-1.95-.956-3.668-2.428-4.716a5.576 5.576 0 00-2.023 6.942 5.576 5.576 0 002.023 2.491z" fill="#EB001B"/><path d="M16.53 11.684a5.576 5.576 0 01-6.3-8.083 5.577 5.577 0 016.3 8.083z" fill="#F79E1B"/></svg>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, border: `1px solid ${document.body.classList.contains("dm") ? "#334155" : "#e2e8f0"}`, borderRadius: 8, overflow: "hidden" }}>
                  <input type="text" required placeholder="Card number" value={paymentData.card} onChange={handleCardChange}
                    style={{ width: "100%", padding: "12px 14px", border: "none", borderBottom: `1px solid ${document.body.classList.contains("dm") ? "#334155" : "#e2e8f0"}`, background: document.body.classList.contains("dm") ? "#0f172a" : "#fff", color: document.body.classList.contains("dm") ? "#f1f5f9" : "#0f172a", outline: "none", fontSize: 14, fontFamily: "monospace" }} />
                  <div style={{ display: "flex" }}>
                    <input type="text" required placeholder="MM / YY" value={paymentData.expiry} onChange={handleExpiryChange}
                      style={{ flex: 1, padding: "12px 14px", border: "none", borderRight: `1px solid ${document.body.classList.contains("dm") ? "#334155" : "#e2e8f0"}`, background: document.body.classList.contains("dm") ? "#0f172a" : "#fff", color: document.body.classList.contains("dm") ? "#f1f5f9" : "#0f172a", outline: "none", fontSize: 14, fontFamily: "monospace" }} />
                    <input type="text" required placeholder="CVC" value={paymentData.cvc} onChange={handleCvcChange}
                      style={{ flex: 1, padding: "12px 14px", border: "none", background: document.body.classList.contains("dm") ? "#0f172a" : "#fff", color: document.body.classList.contains("dm") ? "#f1f5f9" : "#0f172a", outline: "none", fontSize: 14, fontFamily: "monospace", WebkitTextSecurity: "disc" }} />
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
                  ) : `Pay $${selected.availability?.consultationFee ?? 50}`}
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
