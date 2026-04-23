import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import apiClient from '../services/apiClient';
import { SectionCard, PageHeader, Loader } from './UI';
import { CheckCircle, AlertTriangle, Info, HeartPulse, Download, Trash2 } from "lucide-react";

export default function HeartDiseasePrediction() {
  const [formData, setFormData] = useState({
    age: '', sex: '1', chestPainType: '0', restingBP: '', cholesterol: '',
    fastingBS: '0', restingECG: '0', maxHeartRate: '', exerciseAngina: '0',
    oldpeak: '', stSlope: '2', ca: '0', thal: '2'
  });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get('/heart-predictions');
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch prediction history:', err);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your entire heart disease screening history?")) return;
    try {
      await apiClient.delete("/clear", { data: { type: 'heart' } });
      setHistory([]);
    } catch (err) { setError("Failed to clear history."); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const numericData = {};
      Object.keys(formData).forEach((key) => { numericData[key] = parseFloat(formData[key]); });
      const response = await apiClient.post('/predict-heart-disease', numericData);
      setPrediction(response.data);
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.error || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!prediction) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("MEDICAL SCREENING REPORT", 105, 20, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(220, 38, 38); // Red-600
    doc.text("Heart Disease Risk Assessment", 105, 30, { align: "center" });
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 35, 190, 35);
    
    // Info
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 45);
    doc.text(`Report ID: HD-${new Date().getTime().toString().slice(-6)}`, 140, 45);
    
    // Metrics Section
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("INPUT METRICS", 20, 60);
    
    doc.setFontSize(11);
    const metrics = [
      ["Age", `${formData.age} years`],
      ["Sex", formData.sex === '1' ? 'Male' : 'Female'],
      ["Resting BP", `${formData.restingBP} mm Hg`],
      ["Cholesterol", `${formData.cholesterol} mg/dl`],
      ["Max Heart Rate", `${formData.maxHeartRate} bpm`],
      ["ST Depression", formData.oldpeak]
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
    doc.text(`Primary Result:`, 20, y);
    doc.setFont("helvetica", "bold");
    doc.text(prediction.prediction_label, 60, y);
    doc.setFont("helvetica", "normal");
    y += 10;
    doc.text(`Risk Level:`, 20, y);
    doc.text(`${prediction.risk_level} Risk`, 60, y);
    y += 10;
    doc.text(`Probability:`, 20, y);
    doc.text(`${(prediction.probability_disease * 100).toFixed(1)}%`, 60, y);
    
    // Disclaimer
    doc.setDrawColor(254, 243, 199);
    doc.setFillColor(255, 251, 235);
    doc.rect(20, y + 20, 170, 30, "FD");
    
    doc.setFontSize(10);
    doc.setTextColor(146, 64, 14);
    doc.text("IMPORTANT DISCLAIMER:", 25, y + 30);
    doc.setFontSize(9);
    doc.text("This AI-generated report is for preliminary screening only. It does not replace a clinical diagnosis", 25, y + 35);
    doc.text("by a medical professional. Please consult a Cardiologist for definitive assessment.", 25, y + 40);
    
    doc.save(`Heart_Disease_Report_${new Date().getTime()}.pdf`);
  };

  const resetForm = () => {
    setFormData({ age: '', sex: '1', chestPainType: '0', restingBP: '', cholesterol: '', fastingBS: '0', restingECG: '0', maxHeartRate: '', exerciseAngina: '0', oldpeak: '', stSlope: '2', ca: '0', thal: '2' });
    setPrediction(null);
    setError('');
  };

  const testSamples = {
    lowRisk:  { age: '40', sex: '1', chestPainType: '0', restingBP: '120', cholesterol: '200', fastingBS: '0', restingECG: '0', maxHeartRate: '170', exerciseAngina: '0', oldpeak: '0',   stSlope: '2', ca: '2', thal: '3' },
    moderate: { age: '50', sex: '1', chestPainType: '1', restingBP: '135', cholesterol: '220', fastingBS: '0', restingECG: '1', maxHeartRate: '150', exerciseAngina: '0', oldpeak: '1.0', stSlope: '1', ca: '1', thal: '1' },
    highRisk: { age: '55', sex: '0', chestPainType: '2', restingBP: '140', cholesterol: '230', fastingBS: '0', restingECG: '0', maxHeartRate: '140', exerciseAngina: '1', oldpeak: '1.5', stSlope: '1', ca: '0', thal: '2' },
  };

  const fillTestData = (t) => { setFormData(testSamples[t]); setPrediction(null); setError(''); };

  const inputStyle = { width: "100%", padding: "9px 11px", fontSize: 13.5, fontFamily: "inherit", color: "#1e293b", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 9, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" };
  const onFocus = e => { e.target.style.borderColor = "#1db585"; e.target.style.boxShadow = "0 0 0 3px rgba(29,181,133,0.08)"; };
  const onBlur = e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };

  const riskColor = prediction ? (prediction.prediction === 1 ? "red" : prediction.probability_disease > 0.35 ? "yellow" : "green") : "slate";
  const riskBg = { red: "#fff1f2", yellow: "#fffbeb", green: "#f0fdf4", slate: "#f8fafc" };
  const riskBorder = { red: "#fda4af", yellow: "#fde68a", green: "#86efac", slate: "#e2e8f0" };
  const riskText = { red: "#9f1239", yellow: "#78350f", green: "#14532d", slate: "#475569" };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className='dm-page-title' style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em", marginBottom: 3 }}>Heart Disease Risk Prediction</h1>
        <p style={{ fontSize: 13.5, color: "#64748b" }}>Enter health metrics to get an AI-powered risk assessment. For educational use only.</p>
      </div>

      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span style={{ color: "#92400e" }}><strong>For educational/demonstration purposes only.</strong> Do NOT use for actual medical decisions. Always consult qualified healthcare professionals.</span>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "11px 14px", marginBottom: 16, fontSize: 13.5, color: "#dc2626" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "flex-start" }}>
        <SectionCard>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f8fafc", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Health metrics</div>
              <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 1 }}>All fields are required</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[["Low risk", "lowRisk", "#dcfce7", "#166534"], ["Moderate", "moderate", "#fef9c3", "#854d0e"], ["High risk", "highRisk", "#fee2e2", "#991b1b"]].map(([label, key, bg, color]) => (
                <button key={key} type="button" onClick={() => fillTestData(key)}
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
              {[
                { label: "Age (years)", name: "age", type: "number", min: "1", max: "120", placeholder: "e.g., 55" },
                { label: "Sex", name: "sex", type: "select", options: [{ v: "1", l: "Male" }, { v: "0", l: "Female" }] },
                { label: "Chest Pain Type", name: "chestPainType", type: "select", options: [{ v: "0", l: "Typical Angina" }, { v: "1", l: "Atypical Angina" }, { v: "2", l: "Non-Anginal Pain" }, { v: "3", l: "Asymptomatic" }] },
                { label: "Resting BP (mm Hg)", name: "restingBP", type: "number", min: "80", max: "200", placeholder: "e.g., 130" },
                { label: "Cholesterol (mg/dl)", name: "cholesterol", type: "number", min: "100", max: "600", placeholder: "e.g., 250" },
                { label: "Fasting Blood Sugar > 120", name: "fastingBS", type: "select", options: [{ v: "0", l: "No" }, { v: "1", l: "Yes" }] },
                { label: "Resting ECG Results", name: "restingECG", type: "select", options: [{ v: "0", l: "Normal" }, { v: "1", l: "ST-T Wave Abnormality" }, { v: "2", l: "LV Hypertrophy" }] },
                { label: "Max Heart Rate", name: "maxHeartRate", type: "number", min: "60", max: "220", placeholder: "e.g., 150" },
                { label: "Exercise Induced Angina", name: "exerciseAngina", type: "select", options: [{ v: "0", l: "No" }, { v: "1", l: "Yes" }] },
                { label: "ST Depression (Oldpeak)", name: "oldpeak", type: "number", min: "0", max: "10", step: "0.1", placeholder: "e.g., 1.0" },
                { label: "ST Slope", name: "stSlope", type: "select", options: [{ v: "0", l: "Downsloping" }, { v: "1", l: "Flat" }, { v: "2", l: "Upsloping" }] },
                { label: "Major Vessels (0-3)", name: "ca", type: "select", options: [{ v: "0", l: "0" }, { v: "1", l: "1" }, { v: "2", l: "2" }, { v: "3", l: "3" }] },
                { label: "Thalassemia", name: "thal", type: "select", options: [{ v: "0", l: "Unknown" }, { v: "1", l: "Normal" }, { v: "2", l: "Fixed Defect" }, { v: "3", l: "Reversible Defect" }] }
              ].map(f => (
                <div key={f.name}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "#475569", marginBottom: 4 }}>{f.label}</label>
                  {f.type === "select" ? (
                    <select name={f.name} value={formData[f.name]} onChange={handleChange} required style={{ ...inputStyle, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 11px center", paddingRight: 32 }} onFocus={onFocus} onBlur={onBlur}>
                      {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  ) : (
                    <input type="number" name={f.name} value={formData[f.name]} onChange={handleChange} placeholder={f.placeholder} step={f.step} min={f.min} max={f.max} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button type="submit" disabled={loading} style={{ flex: 1, padding: "11px", background: loading ? "#94a3b8" : "#1db585", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}></div>Analyzing...</> : "Run prediction"}
              </button>
              <button type="button" onClick={resetForm} style={{ padding: "11px 20px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>Reset</button>
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
                  <div style={{ fontSize: 20, fontWeight: 600, color: riskText[riskColor], letterSpacing: "-0.01em" }}>{prediction.prediction_label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: riskText[riskColor], marginTop: 2 }}>{prediction.risk_level} Risk</div>
                  <div style={{ fontSize: 13, color: riskText[riskColor], opacity: 0.8, marginTop: 6, lineHeight: 1.5 }}>{prediction.message}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderRadius: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>Disease Probability</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{(prediction.probability_disease * 100).toFixed(1)}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>No Disease Probability</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{(prediction.probability_no_disease * 100).toFixed(1)}%</span>
                </div>

                <button 
                  onClick={downloadReport}
                  style={{ width: "100%", marginTop: 16, padding: "10px", background: "#0f172a", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <Download size={16} />
                  Download Medical Report
                </button>
              </div>
            </SectionCard>
          ) : (
            <SectionCard>
              <div style={{ padding: 32, textAlign: "center" }}>
                <HeartPulse size={48} color="#cbd5e1" style={{ display: "block", margin: "0 auto 12px" }} />
                <div style={{ fontSize: 14, fontWeight: 500, color: "#475569", marginBottom: 4 }}>Ready to analyze</div>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>Fill in the health metrics and click "Run prediction"</div>
              </div>
            </SectionCard>
          )}

          {/* Quick reference */}
          <SectionCard>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a", marginBottom: 12 }}>Reference ranges</div>
              {[["Resting BP", "120/80 mm Hg (normal)"], ["Cholesterol", "< 200 mg/dl (desirable)"], ["Fasting BS", "< 100 mg/dl (normal)"], ["Max Heart Rate", "220 - age (estimated max)"]].map(([k, v]) => (
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
                {["Date", "Result", "Probability", "Age", "BP", "Cholesterol"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #f1f5f9" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "11px 16px", color: "#475569" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ display: "inline-flex", padding: "3px 10px", fontSize: 12, fontWeight: 500, borderRadius: 999, background: r.prediction === 1 ? "#fee2e2" : "#dcfce7", color: r.prediction === 1 ? "#991b1b" : "#166534" }}>{r.prediction === 1 ? "Disease" : "No Disease"}</span>
                    </td>
                    <td style={{ padding: "11px 16px", color: "#1e293b", fontWeight: 500 }}>{(r.probability * 100).toFixed(1)}%</td>
                    <td style={{ padding: "11px 16px", color: "#64748b" }}>{r.age}</td>
                    <td style={{ padding: "11px 16px", color: "#64748b" }}>{r.restingBP}</td>
                    <td style={{ padding: "11px 16px", color: "#64748b" }}>{r.cholesterol}</td>
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