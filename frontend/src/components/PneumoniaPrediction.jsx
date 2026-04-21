import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import { SectionCard } from './UI';
import { CheckCircle, AlertTriangle, Info, Image as ImageIcon } from "lucide-react";

export default function PneumoniaPrediction() {
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
      const response = await apiClient.get('/pneumonia-predictions');
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch prediction history:', err);
    }
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
    if (!file) { setError('Please select a chest X-ray image first.'); return; }
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await apiClient.post('/predict-pneumonia', formData, {
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

  const isPneumonia = prediction?.prediction === 'PNEUMONIA';
  const riskColor = prediction ? (isPneumonia ? "red" : "green") : "slate";
  const riskBg = { red: "#fff1f2", green: "#f0fdf4", slate: "#f8fafc" };
  const riskBorder = { red: "#fda4af", green: "#86efac", slate: "#e2e8f0" };
  const riskText = { red: "#9f1239", green: "#14532d", slate: "#475569" };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em", marginBottom: 3 }}>Pneumonia Detection</h1>
        <p style={{ fontSize: 13.5, color: "#64748b" }}>Upload a chest X-ray image to get an AI-powered likelihood assessment.</p>
      </div>

      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span style={{ color: "#1e40af" }}>The model analyzes the X-ray and estimates the likelihood of pneumonia.</span>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "11px 14px", marginBottom: 16, fontSize: 13.5, color: "#dc2626" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "flex-start" }}>
        <SectionCard>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Upload X-ray Image</div>
            </div>
            {file && (
              <span style={{ padding: "5px 11px", fontSize: 12, fontWeight: 500, background: "#eff6ff", color: "#1d4ed8", borderRadius: 999 }}>
                {file.name}
              </span>
            )}
          </div>
          <form onSubmit={handleSubmit} style={{ padding: 20 }}>
            <div 
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
                    <div style={{ fontSize: 16, fontWeight: 500, color: "#475569" }}>Click or drag to upload chest X-ray</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>PNG, JPG, JPEG, or WEBP</div>
                  </div>
                </div>
              </label>
            </div>

            {preview && (
              <div style={{ marginTop: 20, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Image Preview</div>
                  <button type="button" onClick={resetForm} style={{ fontSize: 13, fontWeight: 500, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <img src={preview} alt="X-ray preview" style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button type="submit" disabled={!file || loading} style={{ flex: 1, padding: "11px", background: (!file || loading) ? "#94a3b8" : "#3b82f6", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#fff", cursor: (!file || loading) ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}></div>Analyzing...</> : "Analyze X-ray"}
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderRadius: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>Confidence</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{prediction.probability}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderRadius: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>Normal Probability</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{prediction.probabilities?.NORMAL ?? 0}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>Pneumonia Probability</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{prediction.probabilities?.PNEUMONIA ?? 0}%</span>
                </div>
                
                <div style={{ marginTop: 14, padding: "10px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, fontSize: 12, color: "#1e40af", lineHeight: 1.5 }}>
                  <strong>Note:</strong> This prediction should support screening only and not replace a clinician's diagnosis.
                </div>
              </div>
            </SectionCard>
          ) : (
            <SectionCard>
              <div style={{ padding: 32, textAlign: "center" }}>
                <ImageIcon size={48} color="#cbd5e1" style={{ display: "block", margin: "0 auto 12px" }} />
                <div style={{ fontSize: 14, fontWeight: 500, color: "#475569", marginBottom: 4 }}>Ready to analyze</div>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>Upload an X-ray image to see the model's prediction</div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <SectionCard style={{ marginTop: 24 }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f8fafc" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Prediction history</div>
            <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 1 }}>Recent assessments</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#f8fafc" }}>
                {["Date", "Result", "Confidence", "Risk"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #f1f5f9" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "11px 16px", color: "#475569" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ display: "inline-flex", padding: "3px 10px", fontSize: 12, fontWeight: 500, borderRadius: 999, background: r.prediction === 'PNEUMONIA' ? "#fee2e2" : "#dcfce7", color: r.prediction === 'PNEUMONIA' ? "#991b1b" : "#166534" }}>{r.prediction}</span>
                    </td>
                    <td style={{ padding: "11px 16px", color: "#1e293b", fontWeight: 500 }}>{r.probability}%</td>
                    <td style={{ padding: "11px 16px", color: "#64748b" }}>{r.risk}</td>
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