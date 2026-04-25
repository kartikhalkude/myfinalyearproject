import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Stethoscope, User, Activity, ShieldCheck, HeartPulse, Mail, CheckCircle2 } from "lucide-react";
import { Modal, Btn } from "../components/UI";
import { authAPI } from "../services/apiClient";

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Forgot password states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleChange = e => { setFormData(p => ({ ...p, [e.target.name]: e.target.value })); setError(""); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.email || !formData.password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      if (result?.success) navigate(result.user.role === "doctor" ? "/doctor-dashboard" : "/patient-dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Invalid email or password.");
    } finally { setLoading(false); }
  };

  const fillDemo = (type) => {
    if (type === "doctor") setFormData({ email: "doctor@test.com", password: "doctor123" });
    else setFormData({ email: "patient@test.com", password: "patient123" });
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);
    
    try {
      await authAPI.forgotPassword(forgotEmail);
      setForgotSuccess(true);
    } catch (err) {
      setForgotError(err.error || "Failed to process request. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="dm-auth-layout">
      {/* Left panel - Decorative Branding */}
      <div className="dm-auth-left">
        {/* Abstract Background Elements */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }}></div>
        <div style={{ position: "absolute", bottom: -50, left: -50, width: 300, height: 300, background: "radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }}></div>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 10 }}>
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>Dr.AssistAI</span>
        </div>

        {/* Main Value Prop */}
        <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 480 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "#34d399", marginBottom: 24, width: "fit-content" }}>
            <HeartPulse size={14} />
            AI-Powered Healthcare
          </div>
          <h1 style={{ fontSize: "2.75rem", fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 24 }}>
            Experience the future of medical care today.
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: 40, fontWeight: 400 }}>
            Connect instantly with top specialists, manage your health records securely, and receive AI-assisted diagnoses in minutes.
          </p>
          
          {/* Testimonial Card */}
          <div style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 20, padding: 24 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <svg key={star} width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ))}
            </div>
            <blockquote style={{ fontSize: "1.05rem", color: "#e2e8f0", lineHeight: 1.6, marginBottom: 20, fontWeight: 400 }}>
              "The AI health screening caught early signs I would have missed for months. Dr.AssistAI changed the way I approach my proactive health."
            </blockquote>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>JS</div>
              <div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>James S.</div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Patient since 2023</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Links/Stats */}
        <div style={{ display: "flex", gap: 40, position: "relative", zIndex: 10 }}>
          {[
            { v: "50K+", l: "Patients", i: <User size={16} color="#10b981" /> },
            { v: "200+", l: "Doctors", i: <Stethoscope size={16} color="#10b981" /> },
            { v: "98%", l: "Satisfaction", i: <ShieldCheck size={16} color="#10b981" /> }
          ].map((stat) => (
            <div key={stat.l} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, background: "rgba(16, 185, 129, 0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {stat.i}
              </div>
              <div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{stat.v}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, fontWeight: 500 }}>{stat.l}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="dm-auth-right">
        
        <div style={{ maxWidth: 400, margin: "0 auto", width: "100%" }}>
          {/* Mobile Logo Header */}
          <div className="dm-auth-mobile-header">
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(16, 185, 129, 0.2)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>Dr.AssistAI</span>
          </div>

          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: 8 }}>Welcome back</h2>
            <p style={{ fontSize: "1rem", color: "#64748b" }}>Please enter your details to sign in.</p>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#dc2626", marginBottom: 24, display: "flex", gap: 10, alignItems: "center", boxShadow: "0 2px 8px rgba(220, 38, 38, 0.05)" }}>
              <div style={{ background: "#fee2e2", borderRadius: "50%", padding: 4, display: "flex" }}>
                <Activity size={16} color="#dc2626" />
              </div>
              <span style={{ fontWeight: 500 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" required disabled={loading}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15, fontFamily: "inherit", color: "#0f172a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, outline: "none", transition: "all 0.2s", boxSizing: "border-box" }}
                onFocus={e => { e.target.style.background = "#fff"; e.target.style.borderColor = "#10b981"; e.target.style.boxShadow = "0 0 0 4px rgba(16, 185, 129, 0.1)"; }}
                onBlur={e => { e.target.style.background = "#f8fafc"; e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Password</label>
                <button type="button" onClick={() => setShowForgotModal(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#10b981", transition: "color 0.2s" }} onMouseEnter={e=>e.target.style.color="#059669"} onMouseLeave={e=>e.target.style.color="#10b981"}>Forgot password?</button>
              </div>
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required disabled={loading}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15, fontFamily: "inherit", color: "#0f172a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, outline: "none", transition: "all 0.2s", boxSizing: "border-box" }}
                onFocus={e => { e.target.style.background = "#fff"; e.target.style.borderColor = "#10b981"; e.target.style.boxShadow = "0 0 0 4px rgba(16, 185, 129, 0.1)"; }}
                onBlur={e => { e.target.style.background = "#f8fafc"; e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", background: loading ? "#94a3b8" : "#10b981", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s", boxShadow: loading ? "none" : "0 4px 12px rgba(16, 185, 129, 0.25)" }}
              onMouseEnter={e => { if(!loading){ e.currentTarget.style.background = "#059669"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.3)"; } }}
              onMouseLeave={e => { if(!loading){ e.currentTarget.style.background = "#10b981"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.25)"; } }}
            >
              {loading ? (
                <><div style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTop: "2.5px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>Signing in...</>
              ) : "Sign in"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "32px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }}></div>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Or try a demo</span>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }}></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["Doctor", "doctor", <Stethoscope size={16} />], ["Patient", "patient", <User size={16} />]].map(([label, type, icon]) => (
              <button key={type} onClick={() => fillDemo(type)} style={{ padding: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.color = "#059669"; e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; e.currentTarget.style.background = "#fff"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {icon}
                Demo {label}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", marginTop: 40 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#10b981", fontWeight: 600, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e=>e.target.style.color="#059669"} onMouseLeave={e=>e.target.style.color="#10b981"}>Create one</Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal isOpen={showForgotModal} onClose={() => { setShowForgotModal(false); setForgotSuccess(false); setForgotEmail(""); setForgotError(""); }} title="Reset Password">
        {!forgotSuccess ? (
          <form onSubmit={handleForgotSubmit}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, background: "#f0fdf4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <ShieldCheck size={28} color="#10b981" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Password Recovery</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>Enter your email address and we'll send you a link to reset your password.</p>
            </div>

            {forgotError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 20, display: "flex", gap: 8, alignItems: "center" }}>
                <Activity size={14} />
                <span>{forgotError}</span>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="name@example.com" required disabled={forgotLoading}
                  style={{ width: "100%", padding: "12px 16px 12px 42px", fontSize: 15, fontFamily: "inherit", color: "#0f172a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, outline: "none", transition: "all 0.2s", boxSizing: "border-box" }}
                  onFocus={e => { e.target.style.background = "#fff"; e.target.style.borderColor = "#10b981"; e.target.style.boxShadow = "0 0 0 4px rgba(16, 185, 129, 0.1)"; }}
                  onBlur={e => { e.target.style.background = "#f8fafc"; e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <Btn onClick={() => setShowForgotModal(false)} variant="outline" style={{ flex: 1 }} disabled={forgotLoading}>Cancel</Btn>
              <Btn type="submit" loading={forgotLoading} style={{ flex: 1, justifyContent: "center" }}>Send Link</Btn>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ width: 64, height: 64, background: "#f0fdf4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle2 size={32} color="#10b981" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Check your email</h3>
            <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.6, marginBottom: 24 }}>
              We've sent a password reset link to <br /><strong style={{ color: "#0f172a" }}>{forgotEmail}</strong>.
            </p>
            <Btn onClick={() => { setShowForgotModal(false); setForgotSuccess(false); setForgotEmail(""); }} style={{ width: "100%", justifyContent: "center" }}>
              Back to Sign in
            </Btn>
          </div>
        )}
      </Modal>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dm-auth-mobile-header { display: none; align-items: center; gap: 10px; margin-bottom: 40px; }
        @media (max-width: 1024px) {
          .dm-auth-mobile-header { display: flex; }
        }
      `}</style>
    </div>
  );
}