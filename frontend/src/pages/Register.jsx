import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Video, Brain, FileText, Pill, User, Stethoscope, Activity } from "lucide-react";

export default function Register() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "patient", specialization: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => { setFormData(p => ({ ...p, [e.target.name]: e.target.value })); setError(""); };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (!formData.name || !formData.email || !formData.password) { setError("Please fill in all required fields."); return; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (formData.role === "doctor" && !formData.specialization) { setError("Specialization is required for doctors."); return; }
    setLoading(true);
    const { confirmPassword, ...data } = formData;
    const result = await register(data);
    if (result.success) navigate(result.user.role === "doctor" ? "/doctor-dashboard" : "/patient-dashboard");
    else setError(result.error || "Registration failed.");
    setLoading(false);
  };

  const inputStyle = { 
    width: "100%", padding: "12px 16px", fontSize: 14, fontFamily: "inherit", color: "#0f172a", 
    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, outline: "none", 
    transition: "all 0.2s", boxSizing: "border-box" 
  };
  
  const onFocus = e => { e.target.style.background = "#fff"; e.target.style.borderColor = "#10b981"; e.target.style.boxShadow = "0 0 0 4px rgba(16, 185, 129, 0.1)"; };
  const onBlur = e => { e.target.style.background = "#f8fafc"; e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };

  return (
    <div className="dm-auth-layout">
      {/* Left panel - Decorative Branding */}
      <div className="dm-auth-left">
        
        {/* Abstract Background Elements */}
        <div style={{ position: "absolute", top: -100, left: -100, width: 400, height: 400, background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }}></div>
        <div style={{ position: "absolute", bottom: "10%", right: -150, width: 350, height: 350, background: "radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }}></div>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 10 }}>
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>Dr.AssistAI</span>
        </div>

        <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#fff", marginBottom: 32, lineHeight: 1.1, letterSpacing: "-0.03em" }}>Join thousands of patients & doctors</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {[
              { icon: <Video size={20} color="#10b981" />, text: "HD video consultations with certified doctors" },
              { icon: <Brain size={20} color="#10b981" />, text: "AI-powered health screening tools" },
              { icon: <FileText size={20} color="#10b981" />, text: "Secure digital health records" },
              { icon: <Pill size={20} color="#10b981" />, text: "Prescription management & refills" },
            ].map(({ icon, text }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {icon}
                </div>
                <span style={{ fontSize: "1.05rem", color: "#e2e8f0", lineHeight: 1.5, fontWeight: 400 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 14, color: "#94a3b8", position: "relative", zIndex: 10 }}>
          Already registered? <Link to="/login" style={{ color: "#10b981", textDecoration: "none", fontWeight: 600, transition: "color 0.2s" }} onMouseEnter={e=>e.target.style.color="#059669"} onMouseLeave={e=>e.target.style.color="#10b981"}>Sign in here</Link>
        </p>
      </div>

      {/* Right panel — form */}
      <div className="dm-auth-right" style={{ overflowY: "auto" }}>
        
        {/* Mobile Logo Header */}
        <div style={{ display: "none", alignItems: "center", gap: 10, marginBottom: 32, "@media (maxWidth: 900px)": { display: "flex" } }}>
          <div style={{ width: 32, height: 32, background: "#10b981", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 16 }}>Dr.AssistAI</span>
        </div>

        <div style={{ maxWidth: 540, width: "100%", margin: "0 auto" }}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: 8 }}>Create your account</h1>
            <p style={{ fontSize: "1rem", color: "#64748b" }}>Join us today. It takes less than a minute to get started.</p>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#dc2626", marginBottom: 24, display: "flex", gap: 10, alignItems: "center", boxShadow: "0 2px 8px rgba(220, 38, 38, 0.05)" }}>
              <div style={{ background: "#fee2e2", borderRadius: "50%", padding: 4, display: "flex" }}>
                <Activity size={16} color="#dc2626" />
              </div>
              <span style={{ fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {/* Role selector */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 12 }}>Select your profile type</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["patient", <User size={24} />, "Patient", "Book appointments & track health"], 
                ["doctor", <Stethoscope size={24} />, "Doctor", "Manage consultations & patients"]
              ].map(([val, icon, title, desc]) => {
                const isActive = formData.role === val;
                return (
                  <button key={val} type="button" onClick={() => setFormData(p => ({ ...p, role: val }))}
                    style={{ 
                      padding: "16px", 
                      border: isActive ? "2px solid #10b981" : "1px solid #e2e8f0", 
                      borderRadius: 16, cursor: "pointer", 
                      background: isActive ? "#f0fdf4" : "#fff", 
                      textAlign: "left", fontFamily: "inherit", 
                      transition: "all 0.2s",
                      boxShadow: isActive ? "0 4px 12px rgba(16, 185, 129, 0.1)" : "none"
                    }}
                    onMouseEnter={e => { if(!isActive) { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#f8fafc"; } }}
                    onMouseLeave={e => { if(!isActive) { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#fff"; } }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, background: isActive ? "#10b981" : "#f1f5f9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: isActive ? "#fff" : "#64748b", transition: "all 0.2s" }}>
                        {icon}
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: isActive ? "6px solid #10b981" : "2px solid #cbd5e1", background: "#fff", transition: "all 0.2s" }} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isActive ? "#059669" : "#0f172a", marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Full name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required disabled={loading} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Phone number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 555 000 0000" disabled={loading} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Email address *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required disabled={loading} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            {formData.role === "doctor" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Specialization *</label>
                <input type="text" name="specialization" value={formData.specialization} onChange={handleChange} placeholder="e.g. Cardiology, Pediatrics" required={formData.role === "doctor"} disabled={loading} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Password *</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Min. 6 characters" required disabled={loading} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Confirm password *</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat password" required disabled={loading} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", background: loading ? "#94a3b8" : "#10b981", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s", boxShadow: loading ? "none" : "0 4px 12px rgba(16, 185, 129, 0.25)" }}
              onMouseEnter={e => { if(!loading){ e.currentTarget.style.background = "#059669"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.3)"; } }}
              onMouseLeave={e => { if(!loading){ e.currentTarget.style.background = "#10b981"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.25)"; } }}
            >
              {loading ? <><div style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTop: "2.5px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>Creating account...</> : `Create ${formData.role} account`}
            </button>
          </form>

          <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 24, lineHeight: 1.6, fontWeight: 500 }}>
            By registering, you agree to our <a href="#" style={{ color: "#10b981", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e=>e.target.style.color="#059669"} onMouseLeave={e=>e.target.style.color="#10b981"}>Terms of Service</a> and <a href="#" style={{ color: "#10b981", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e=>e.target.style.color="#059669"} onMouseLeave={e=>e.target.style.color="#10b981"}>Privacy Policy</a>.
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}