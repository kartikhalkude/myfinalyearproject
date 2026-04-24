import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import apiClient from '../services/apiClient';
import { SectionCard } from './UI';
import { CheckCircle, AlertTriangle, Info, Image as ImageIcon, Download, Brain, Activity, ShieldCheck, Microscope, Trash2 } from "lucide-react";

export default function BrainTumorPrediction() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get('/brain-tumor-predictions');
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch prediction history:', err);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your entire brain tumor screening history?")) return;
    try {
      await apiClient.delete("/clear", { data: { type: 'tumor' } });
      setHistory([]);
    } catch (err) { setError("Failed to clear history."); }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const processFile = (selectedFile) => {
    setFile(selectedFile);
    setPrediction(null);
    setError('');

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select an MRI image first.'); return; }
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await apiClient.post('/predict-brain-tumor', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPrediction(response.data);
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setPrediction(null);
    setError('');
  };

  const downloadReport = () => {
    if (!prediction) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("MEDICAL SCREENING REPORT", 105, 20, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(124, 58, 237); // violet-600
    doc.text("Brain Tumor AI Analysis", 105, 30, { align: "center" });
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 35, 190, 35);
    
    // Patient Info
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 45);
    doc.text(`Report ID: BT-${new Date().getTime().toString().slice(-6)}`, 140, 45);
    
    // Assessment Section
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("ASSESSMENT SUMMARY", 20, 60);
    
    doc.setFontSize(12);
    doc.text(`Primary Finding:`, 20, 70);
    doc.setFont("helvetica", "bold");
    doc.text(prediction.prediction, 60, 70);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Confidence Score:`, 20, 80);
    doc.text(`${prediction.probability}%`, 60, 80);
    
    doc.text(`Risk Level:`, 20, 90);
    const riskRGB = hasTumor ? [220, 38, 38] : [22, 163, 74];
    doc.setTextColor(riskRGB[0], riskRGB[1], riskRGB[2]);
    doc.text(prediction.risk || (hasTumor ? "High Risk" : "Normal"), 60, 90);
    doc.setTextColor(15, 23, 42);
    
    // Add MRI Image if available
    if (preview) {
      try {
        // Find best fit for image
        const imgWidth = 80;
        const imgHeight = 80;
        doc.addImage(preview, 'JPEG', 110, 60, imgWidth, imgHeight);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("Analyzed MRI Scan", 150, 145, { align: "center" });
      } catch (e) {
        console.error("Failed to add image to PDF:", e);
      }
    }
    
    // Detailed Probabilities
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("DETAILED PROBABILITIES", 20, 110);
    let y = 120;
    doc.setFontSize(11);
    Object.entries(prediction.probabilities || {}).forEach(([label, prob]) => {
      doc.text(`${label}:`, 30, y);
      doc.text(`${prob}%`, 100, y);
      y += 10;
    });
    
    // Disclaimer
    doc.setDrawColor(254, 243, 199);
    doc.setFillColor(255, 251, 235);
    doc.rect(20, y + 10, 170, 30, "FD");
    
    doc.setFontSize(10);
    doc.setTextColor(146, 64, 14);
    doc.text("IMPORTANT DISCLAIMER:", 25, y + 20);
    doc.setFontSize(9);
    doc.text("This AI-generated report is for preliminary screening purposes only and should not be used as a", 25, y + 25);
    doc.text("final medical diagnosis. Please consult a qualified Neurologist for a definitive clinical assessment.", 25, y + 30);
    
    doc.save(`Brain_Tumor_Report_${new Date().getTime()}.pdf`);
  };

  const hasTumor = prediction?.prediction && !['No Tumor', 'Normal', 'Healthy'].includes(prediction.prediction);
  const riskColor = prediction ? (hasTumor ? "red" : "green") : "slate";
  const riskBg = { red: "#fff1f2", green: "#f0fdf4", slate: "#f8fafc" };
  const riskBorder = { red: "#fda4af", green: "#86efac", slate: "#e2e8f0" };
  const riskText = { red: "#9f1239", green: "#14532d", slate: "#475569" };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="dm-page-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em", marginBottom: 3 }}>Brain Tumor Detection</h1>
        <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b" }}>Upload a brain MRI image to get an AI-powered likelihood assessment.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Glioma", icon: <Brain size={18} />, color: "#ef4444", bg: "#fef2f2" },
          { label: "Meningioma", icon: <Microscope size={18} />, color: "#f59e0b", bg: "#fffbeb" },
          { label: "Pituitary", icon: <Activity size={18} />, color: "#8b5cf6", bg: "#f5f3ff" },
          { label: "Normal", icon: <ShieldCheck size={18} />, color: "#10b981", bg: "#f0fdf4" }
        ].map((item, idx) => (
          <div key={idx} style={{ background: item.bg, border: "1px solid", borderColor: item.color + "33", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
            <div style={{ width: 32, height: 32, background: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", color: item.color, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
              {item.icon}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div className="dm-info-banner" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span style={{ color: "#1e40af" }}>The model analyzes the MRI and estimates the likelihood of tumor presence.</span>
      </div>

      {error && <div className="dm-error-banner" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "11px 14px", marginBottom: 16, fontSize: 13.5, color: "#dc2626" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "flex-start" }}>
        <SectionCard>
          <div className="dm-section-header" style={{ padding: "18px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Upload MRI Image</div>
            </div>
            {file && (
              <span style={{ padding: "5px 11px", fontSize: 12, fontWeight: 500, background: "#eff6ff", color: "#1d4ed8", borderRadius: 999 }}>
                {file.name}
              </span>
            )}
          </div>
          <form onSubmit={handleSubmit} style={{ padding: 20 }}>
            <div 
              className={isDragging ? "dm-upload-zone dm-upload-zone-active" : "dm-upload-zone"}
              style={{ border: `2px dashed ${isDragging ? '#3b82f6' : '#cbd5e1'}`, borderRadius: 12, padding: 32, textAlign: "center", cursor: "pointer", transition: "border-color 0.2s", background: isDragging ? "#f8fafc" : "#fff" }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }}
            >
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleFileChange} style={{ display: 'none' }} id="image-upload" />
              <label htmlFor="image-upload" style={{ cursor: "pointer", display: "block" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 64, height: 64, background: "#eff6ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <div>
                    <div className="dm-soft-text" style={{ fontSize: 16, fontWeight: 500, color: "#475569" }}>Click or drag to upload brain MRI</div>
                    <div className="dm-soft-muted" style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>PNG, JPG, JPEG, or WEBP</div>
                  </div>
                </div>
              </label>
            </div>

            {preview && (
              <div className="dm-preview-panel" style={{ marginTop: 20, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div className="dm-soft-text" style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Image Preview</div>
                  <button type="button" onClick={resetForm} style={{ fontSize: 13, fontWeight: 500, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <img src={preview} alt="MRI preview" style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button type="submit" disabled={!file || loading} style={{ flex: 1, padding: "11px", background: (!file || loading) ? "#94a3b8" : "#3b82f6", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#fff", cursor: (!file || loading) ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}></div>Analyzing...</> : "Analyze MRI"}
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
                  <div style={{ fontSize: 20, fontWeight: 600, color: riskText[riskColor], letterSpacing: "-0.01em" }}>{prediction.prediction}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: riskText[riskColor], marginTop: 2 }}>{prediction.risk}</div>
                  {prediction.warning && (
                    <div style={{ marginTop: 12, padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12.5, color: "#92400e" }}>
                      {prediction.warning}
                    </div>
                  )}
                </div>
                <div className="dm-stat-strip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderRadius: 10, marginBottom: 8 }}>
                  <span className="dm-soft-muted" style={{ fontSize: 13, color: "#64748b" }}>Confidence Score</span>
                  <span className="dm-page-title" style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{prediction.probability}%</span>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                  {Object.entries(prediction.probabilities || {}).map(([label, prob]) => (
                    <div className="dm-prob-chip" key={label} style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                      <div className="dm-soft-muted" style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
                      <div className="dm-soft-text" style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{prob}%</div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={downloadReport}
                  style={{ width: "100%", marginTop: 16, padding: "10px", background: "#0f172a", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <Download size={16} />
                  Download Medical Report
                </button>
                
                <div className="dm-info-banner" style={{ marginTop: 14, padding: "10px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, fontSize: 12, color: "#1e40af", lineHeight: 1.5 }}>
                  <strong>Note:</strong> This prediction should support screening only and not replace a clinician's diagnosis.
                </div>
              </div>
            </SectionCard>
          ) : (
            <SectionCard>
              <div style={{ padding: 32, textAlign: "center" }}>
                <ImageIcon size={48} color="#cbd5e1" style={{ display: "block", margin: "0 auto 12px" }} />
                <div className="dm-soft-text" style={{ fontSize: 14, fontWeight: 500, color: "#475569", marginBottom: 4 }}>Ready to analyze</div>
                <div className="dm-soft-muted" style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>Upload an MRI image to see the model's prediction</div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <SectionCard style={{ marginTop: 24 }}>
          <div className="dm-section-header" style={{ padding: "18px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="dm-page-title" style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Prediction history</div>
              <div className="dm-soft-muted" style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 1 }}>Recent assessments</div>
            </div>
            <button onClick={handleClearHistory} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#991b1b", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.background="#fee2e2"}} onMouseLeave={e=>{e.currentTarget.style.background="#fef2f2"}}>
              <Trash2 size={14} />
              Clear History
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead className="dm-table-head"><tr style={{ background: "#f8fafc" }}>
                {["Date", "Result", "Confidence", "Risk"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #f1f5f9" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {history.map((r, i) => (
                  <tr className="dm-table-row" key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td className="dm-table-cell dm-soft-muted" style={{ padding: "11px 16px", color: "#475569" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ display: "inline-flex", padding: "3px 10px", fontSize: 12, fontWeight: 500, borderRadius: 999, background: (r.prediction && !['No Tumor', 'Normal', 'Healthy'].includes(r.prediction)) ? "#fee2e2" : "#dcfce7", color: (r.prediction && !['No Tumor', 'Normal', 'Healthy'].includes(r.prediction)) ? "#991b1b" : "#166534" }}>{r.prediction}</span>
                    </td>
                    <td className="dm-table-cell dm-soft-text" style={{ padding: "11px 16px", color: "#1e293b", fontWeight: 500 }}>{r.probability}%</td>
                    <td className="dm-table-cell dm-soft-muted" style={{ padding: "11px 16px", color: "#64748b" }}>{r.risk}</td>
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
