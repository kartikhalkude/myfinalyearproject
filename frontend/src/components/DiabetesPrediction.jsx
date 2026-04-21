import React, { useState, useEffect } from "react";
import { jsPDF } from 'jspdf';
import apiClient from "../services/apiClient";
import { SectionCard, Loader, Badge } from "./UI";
import { CheckCircle, AlertTriangle, Info, Microscope, Download, Trash2 } from "lucide-react";

const FIELDS = [
  { name: "pregnancies", label: "Pregnancies", placeholder: "0", step: "1", min: "0", hint: "Number of times pregnant" },
  { name: "glucose", label: "Glucose (mg/dL)", placeholder: "120", step: "1", min: "0", hint: "Plasma glucose concentration" },
  { name: "bloodPressure", label: "Blood Pressure (mm Hg)", placeholder: "80", step: "1", min: "0", hint: "Diastolic blood pressure" },
  { name: "skinThickness", label: "Skin Thickness (mm)", placeholder: "20", step: "1", min: "0", hint: "Triceps skinfold thickness" },
  { name: "insulin", label: "Insulin (µU/mL)", placeholder: "80", step: "1", min: "0", hint: "2-Hour serum insulin" },
  { name: "bmi", label: "BMI", placeholder: "25.5", step: "0.1", min: "0", hint: "Body mass index" },
  { name: "diabetesPedigreeFunction", label: "Pedigree Function", placeholder: "0.5", step: "0.001", min: "0", hint: "Diabetes hereditary score" },
  { name: "age", label: "Age (years)", placeholder: "35", step: "1", min: "0", hint: "Patient age in years" },
];

const SAMPLES = {
  lowRisk:  { pregnancies: "1", glucose: "85",  bloodPressure: "66", skinThickness: "29", insulin: "0",  bmi: "26.6", diabetesPedigreeFunction: "0.351", age: "31" },
  highRisk: { pregnancies: "6", glucose: "148", bloodPressure: "72", skinThickness: "35", insulin: "0",  bmi: "33.6", diabetesPedigreeFunction: "0.627", age: "50" },
  moderate: { pregnancies: "2", glucose: "120", bloodPressure: "70", skinThickness: "20", insulin: "80", bmi: "25.5", diabetesPedigreeFunction: "0.5",   age: "35" },
};

const EMPTY = { pregnancies: "", glucose: "", bloodPressure: "", skinThickness: "", insulin: "", bmi: "", diabetesPedigreeFunction: "", age: "" };

export default function DiabetesPrediction() {
  const [form, setForm] = useState(EMPTY);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => { apiClient.get("/predictions").then(r => setHistory(r.data)).catch(() => {}); }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const numeric = {}; Object.keys(form).forEach(k => numeric[k] = parseFloat(form[k]));
      const res = await apiClient.post("/predict-diabetes", numeric);
      setPrediction(res.data);
      apiClient.get("/predictions").then(r => setHistory(r.data)).catch(() => {});
    } catch (err) { setError(err.response?.data?.error || "Prediction failed."); }
    finally { setLoading(false); }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your entire diabetes screening history?")) return;
    try {
      await apiClient.delete("/clear", { data: { type: 'diabetes' } });
      setHistory([]);
    } catch (err) { setError("Failed to clear history."); }
  };

  const downloadReport = () => {
    if (!prediction) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("MEDICAL SCREENING REPORT", 105, 20, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(29, 181, 133); // Emerald-600
    doc.text("Diabetes Risk Assessment", 105, 30, { align: "center" });
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 35, 190, 35);
    
    // Info
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 45);
    doc.text(`Report ID: DB-${new Date().getTime().toString().slice(-6)}`, 140, 45);
    
    // Metrics Section
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("INPUT METRICS", 20, 60);
    
    doc.setFontSize(11);
    const metrics = [
      ["Glucose", `${form.glucose} mg/dL`],
      ["Blood Pressure", `${form.bloodPressure} mm Hg`],
      ["BMI", form.bmi],
      ["Age", `${form.age} years`],
      ["Insulin", `${form.insulin} uU/mL`],
      ["Pregnancies", form.pregnancies]
    ];
    
    let y = 70;
    metrics.forEach(([label, val]) => {
      doc.text(label + ":", 30, y);
      doc.text(val, 100, y);
      y += 8;
    });
    
    // Result
    y += 10;
    doc.setFontSize(14);
    doc.text("ASSESSMENT SUMMARY", 20, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Risk Level:`, 20, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${prediction.risk_level} Risk`, 60, y);
    doc.setFont("helvetica", "normal");
    y += 10;
    doc.text(`Probability:`, 20, y);
    doc.text(`${(prediction.probability * 100).toFixed(1)}%`, 60, y);
    
    // Disclaimer
    doc.setDrawColor(254, 243, 199);
    doc.setFillColor(255, 251, 235);
    doc.rect(20, y + 20, 170, 30, "FD");
    
    doc.setFontSize(10);
    doc.setTextColor(146, 64, 14);
    doc.text("IMPORTANT DISCLAIMER:", 25, y + 30);
    doc.setFontSize(9);
    doc.text("This AI-generated report is for preliminary screening only. It does not replace a clinical diagnosis", 25, y + 35);
    doc.text("by a medical professional. Please consult your physician for further tests.", 25, y + 40);
    
    doc.save(`Diabetes_Report_${new Date().getTime()}.pdf`);
  };

  const inputStyle = { width: "100%", padding: "9px 11px", fontSize: 13.5, fontFamily: "inherit", color: "#1e293b", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 9, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" };

  const riskColor = prediction ? (prediction.prediction === 1 ? "red" : prediction.probability > 0.35 ? "yellow" : "green") : "slate";
  const riskBg = { red: "#fff1f2", yellow: "#fffbeb", green: "#f0fdf4", slate: "#f8fafc" };
  const riskBorder = { red: "#fda4af", yellow: "#fde68a", green: "#86efac", slate: "#e2e8f0" };
  const riskText = { red: "#9f1239", yellow: "#78350f", green: "#14532d", slate: "#475569" };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em", marginBottom: 3 }}>Diabetes Risk Screening</h1>
        <p style={{ fontSize: 13.5, color: "#64748b" }}>Enter health metrics to get an AI-powered risk assessment. For educational use only.</p>
      </div>

      {/* Info banner */}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span style={{ color: "#1e40af" }}>Use the sample buttons to auto-fill with example data for different risk profiles.</span>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "11px 14px", marginBottom: 16, fontSize: 13.5, color: "#dc2626" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "flex-start" }}>
        <SectionCard>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f8fafc", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Health metrics</div>
              <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 1 }}>All 8 fields are required</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[["Low risk", "lowRisk", "#dcfce7", "#166534"], ["Moderate", "moderate", "#fef9c3", "#854d0e"], ["High risk", "highRisk", "#fee2e2", "#991b1b"]].map(([label, key, bg, color]) => (
                <button key={key} onClick={() => { setForm(SAMPLES[key]); setPrediction(null); setError(""); }}
                  style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, background: bg, color, border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {FIELDS.map(f => (
                <div key={f.name}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "#475569", marginBottom: 4 }}>{f.label}</label>
                  <input type="number" name={f.name} value={form[f.name]} onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))} placeholder={f.placeholder} step={f.step} min={f.min} required style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "#1db585"; e.target.style.boxShadow = "0 0 0 3px rgba(29,181,133,0.08)"; }}
                    onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                  />
                  <p style={{ fontSize: 11, color: "#cbd5e1", marginTop: 3 }}>{f.hint}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button type="submit" disabled={loading} style={{ flex: 1, padding: "11px", background: loading ? "#94a3b8" : "#1db585", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}></div>Analyzing...</> : "Run prediction"}
              </button>
              <button type="button" onClick={() => { setForm(EMPTY); setPrediction(null); setError(""); }} style={{ padding: "11px 20px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>Reset</button>
            </div>
          </form>
        </SectionCard>

        {/* Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {prediction ? (
            <SectionCard style={{ animation: "fadeIn 0.25s ease" }}>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Result</div>
                <div style={{ background: riskBg[riskColor], border: `1.5px solid ${riskBorder[riskColor]}`, borderRadius: 14, padding: "24px 16px", textAlign: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                    {riskColor === "green" ? <CheckCircle size={36} color="#166534" /> : riskColor === "red" ? <AlertTriangle size={36} color="#991b1b" /> : <Info size={36} color="#854d0e" />}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: riskText[riskColor], letterSpacing: "-0.01em" }}>{prediction.risk_level} Risk</div>
                  <div style={{ fontSize: 13, color: riskText[riskColor], opacity: 0.8, marginTop: 6, lineHeight: 1.5 }}>{prediction.message}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>Probability</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{(prediction.probability * 100).toFixed(1)}%</span>
                </div>
                {/* Probability bar */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(prediction.probability * 100).toFixed(1)}%`, background: riskColor === "green" ? "#22c55e" : riskColor === "red" ? "#ef4444" : "#eab308", borderRadius: 999, transition: "width 0.8s ease" }}></div>
                  </div>
                </div>

                <button 
                  onClick={downloadReport}
                  style={{ width: "100%", marginTop: 16, padding: "10px", background: "#0f172a", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <Download size={16} />
                  Download Medical Report
                </button>

                <div style={{ marginTop: 14, padding: "10px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                  <AlertTriangle size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }} /> This is not a medical diagnosis. Always consult a qualified healthcare provider.
                </div>
              </div>
            </SectionCard>
          ) : (
            <SectionCard>
              <div style={{ padding: 32, textAlign: "center" }}>
                <Microscope size={48} color="#cbd5e1" style={{ display: "block", margin: "0 auto 12px" }} />
                <div style={{ fontSize: 14, fontWeight: 500, color: "#475569", marginBottom: 4 }}>Ready to analyze</div>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>Fill in the health metrics and click "Run prediction"</div>
              </div>
            </SectionCard>
          )}

          {/* Quick reference */}
          <SectionCard>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a", marginBottom: 12 }}>Reference ranges</div>
              {[["Glucose", "70–99 mg/dL (normal)"], ["Blood pressure", "< 80 mm Hg (normal)"], ["BMI", "18.5–24.9 (healthy)"], ["Pedigree", "< 0.5 (lower hereditary risk)"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#64748b", paddingBottom: 7, marginBottom: 7, borderBottom: "1px solid #f8fafc" }}>
                  <span style={{ fontWeight: 500, color: "#475569" }}>{k}</span><span>{v}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <SectionCard style={{ marginTop: 24 }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Prediction history</div>
              <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 1 }}>Last {history.length} assessments</div>
            </div>
            <button onClick={handleClearHistory} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#991b1b", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.background="#fee2e2"}} onMouseLeave={e=>{e.currentTarget.style.background="#fef2f2"}}>
              <Trash2 size={14} />
              Clear History
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#f8fafc" }}>
                {["Date", "Result", "Probability", "Glucose", "BMI", "Age"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #f1f5f9" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "11px 16px", color: "#475569" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ display: "inline-flex", padding: "3px 10px", fontSize: 12, fontWeight: 500, borderRadius: 999, background: r.prediction === 1 ? "#fee2e2" : "#dcfce7", color: r.prediction === 1 ? "#991b1b" : "#166534" }}>{r.prediction === 1 ? "High risk" : "Low risk"}</span>
                    </td>
                    <td style={{ padding: "11px 16px", color: "#1e293b", fontWeight: 500 }}>{(r.probability * 100).toFixed(1)}%</td>
                    <td style={{ padding: "11px 16px", color: "#64748b" }}>{r.glucose}</td>
                    <td style={{ padding: "11px 16px", color: "#64748b" }}>{r.bmi}</td>
                    <td style={{ padding: "11px 16px", color: "#64748b" }}>{r.age}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}