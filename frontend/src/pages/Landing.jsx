import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Brain, Calendar, Pill, Folder, ArrowRight, ShieldCheck, Activity, Users, Star, CheckCircle, MessageSquare, ScanLine, Moon, Sun, ChevronDown, Quote } from "lucide-react";

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dark, setDark] = useState(() => document.body.classList.contains("dm"));
  const [activeFaq, setActiveFaq] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      
      // Calculate scroll progress
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", onScroll);
    
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  const toggleTheme = () => {
    const newVal = !dark;
    setDark(newVal);
    if (newVal) {
      document.body.classList.add("dm");
    } else {
      document.body.classList.remove("dm");
    }
    window.dispatchEvent(new CustomEvent("dm-change"));
  };

  const features = [
    { icon: <Video size={24} color="#1db585" />, tag: "Real-time", title: "Video Consultations", desc: "HD video calls with board-certified doctors from anywhere — no commute required." },
    { icon: <Brain size={24} color="#1db585" />, tag: "ML-powered", title: "AI Health Screening", desc: "Advanced diagnostics for Diabetes, Heart Disease, Pneumonia, and Brain Tumors." },
    { icon: <MessageSquare size={24} color="#1db585" />, tag: "Secure", title: "Chat Messaging", desc: "Directly communicate with your medical team for follow-ups and quick queries." },
    { icon: <ScanLine size={24} color="#1db585" />, tag: "New", title: "Medical Report Scanner", desc: "Upload lab reports to automatically extract and analyze your vital health metrics." },
    { icon: <Calendar size={24} color="#1db585" />, tag: "Instant", title: "Smart Scheduling", desc: "Book, reschedule, or cancel appointments with real-time slot availability." },
    { icon: <Pill size={24} color="#1db585" />, tag: "Digital", title: "E-Prescriptions", desc: "Receive and manage digital prescriptions with refill requests built in." },
    { icon: <Folder size={24} color="#1db585" />, tag: "Secure", title: "Health Records", desc: "All your medical history in one encrypted, HIPAA-compliant place." },
  ];

  const stats = [
    { icon: <Users size={20} color="#64748b" />, value: "50K+", label: "Patients served" },
    { icon: <ShieldCheck size={20} color="#64748b" />, value: "200+", label: "Expert doctors" },
    { icon: <Activity size={20} color="#64748b" />, value: "98%", label: "Satisfaction rate" },
    { icon: <Star size={20} color="#64748b" />, value: "4.9", label: "Average rating" },
  ];

  const steps = [
    { n: "01", title: "Create your account", desc: "Sign up in under 60 seconds as a patient or doctor." },
    { n: "02", title: "Choose a specialist", desc: "Browse profiles and book a slot that fits your schedule." },
    { n: "03", title: "Start your consultation", desc: "Connect via HD video and get care without leaving home." },
  ];

  const testimonials = [
    { name: "Sarah Mitchell", role: "Patient", text: "The AI screening was incredibly fast. It gave me peace of mind before my video consultation.", avatar: "SM" },
    { name: "Dr. James Wilson", role: "Cardiologist", text: "As a provider, the platform's record management and OCR scanner save me hours of manual data entry.", avatar: "JW" },
    { name: "Robert Chen", role: "Patient", text: "The video quality is crystal clear. It felt like being right there in the doctor's office.", avatar: "RC" },
  ];

  const faqs = [
    { q: "Is my medical data secure?", a: "Yes, all data is encrypted end-to-end and stored in HIPAA-compliant secure servers." },
    { q: "How accurate are the AI predictions?", a: "Our models are trained on validated medical datasets and achieve 95%+ accuracy for preliminary screening." },
    { q: "Can I use this for emergencies?", a: "No, Dr.AssistAI is for non-emergency consultations. In case of emergency, please call your local emergency number." },
    { q: "How do I receive my prescriptions?", a: "After your consultation, digital prescriptions are sent directly to your dashboard and can be shared with pharmacies." },
  ];

  const c = {
    bg: dark ? "#0f172a" : "#f8fafc",
    text: dark ? "#f8fafc" : "#0f172a",
    muted: dark ? "#94a3b8" : "#64748b",
    cardBg: dark ? "#1e293b" : "#fff",
    cardBorder: dark ? "rgba(255,255,255,0.1)" : "rgba(226, 232, 240, 0.6)",
    navBg: dark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)",
    navBorder: dark ? "rgba(255,255,255,0.05)" : "rgba(226, 232, 240, 0.8)",
  };

  return (
    <div style={{ fontFamily: "'Inter', 'DM Sans', sans-serif", background: c.bg, color: c.text, minHeight: "100vh", overflowX: "hidden", transition: "background 0.3s, color 0.3s" }}>
      {/* Scroll Progress Bar */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: `${scrollProgress}%`,
        height: "3px",
        background: "linear-gradient(90deg, #10b981 0%, #3ecba0 100%)",
        zIndex: 200,
        transition: "width 0.1s ease-out"
      }} />

      {/* Background ambient glows contained */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "800px", background: `radial-gradient(circle at 50% -20%, ${dark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(29, 181, 133, 0.15)'} 0%, rgba(248, 250, 252, 0) 70%)` }} />
        <div style={{ position: "absolute", top: "200px", right: "-100px", width: "500px", height: "500px", background: "radial-gradient(circle at center, rgba(56, 189, 248, 0.1) 0%, rgba(248, 250, 252, 0) 60%)" }} />
      </div>

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: scrolled ? "12px 0" : "20px 0",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        background: scrolled ? c.navBg : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? `1px solid ${c.navBorder}` : "1px solid transparent"
      }}>
        <div className="dm-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: c.text, letterSpacing: "-0.02em" }}>Dr.AssistAI</span>
          </div>

          <div className="landing-nav-links">
            {["Features", "How it works", "Testimonials", "FAQ"].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(" ", "-")}`} style={{ textDecoration: "none", color: c.muted, transition: "color 0.2s", fontSize: 14, fontWeight: 500 }}
                onMouseEnter={e => e.target.style.color = c.text}
                onMouseLeave={e => e.target.style.color = c.muted}
              >{l}</a>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={toggleTheme} style={{ width: 40, height: 40, borderRadius: "50%", border: `1px solid ${c.navBorder}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: c.text, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="landing-desktop-btns" style={{ display: "flex", gap: 12 }}>
              <button onClick={() => navigate("/login")} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${c.navBorder}`, borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer", color: c.text, transition: "all 0.2s", fontFamily: "inherit" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = dark ? "#475569" : "#94a3b8"; e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = c.navBorder; e.currentTarget.style.background = "transparent"; }}
              >Sign in</button>
              <button onClick={() => navigate("/register")} style={{ padding: "10px 24px", background: dark ? "#10b981" : "#0f172a", border: "none", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#fff", transition: "all 0.2s", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.opacity = 0.9; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.opacity = 1; }}
              >Get started</button>
            </div>
            
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="landing-mobile-toggle" style={{ display: "none", background: "none", border: "none", color: "#0f172a", cursor: "pointer", padding: 4 }}>
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: c.cardBg, borderBottom: `1px solid ${c.navBorder}`, padding: "24px", display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
            {["Features", "How it works", "Testimonials", "FAQ"].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(" ", "-")}`} onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: "none", color: c.muted, fontSize: 16, fontWeight: 500 }}>{l}</a>
            ))}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button onClick={() => navigate("/login")} style={{ flex: 1, padding: "12px", background: "transparent", border: `1px solid ${c.navBorder}`, borderRadius: 12, fontSize: 15, fontWeight: 600, color: c.text }}>Sign in</button>
              <button onClick={() => navigate("/register")} style={{ flex: 1, padding: "12px", background: "#10b981", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#fff" }}>Get started</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="dm-container reveal" style={{ position: "relative", padding: "160px 24px 100px", zIndex: 10 }}>
        <div className="hero-grid">
          <div style={{ position: "relative", zIndex: 2 }}>
<div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 999, padding: "6px 16px", fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 32 }}>
              <span style={{ position: "relative", display: "flex", width: 8, height: 8 }}>
                <span style={{ animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite", position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: "#10b981", opacity: 0.75 }}></span>
                <span style={{ position: "relative", width: 8, height: 8, background: "#10b981", borderRadius: "50%" }}></span>
              </span>
              Next-Gen AI Healthcare
            </div>

            
            <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 4.5rem)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.04em", color: c.text, marginBottom: 24 }}>
              Your health,<br />
              <span style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>intelligently managed</span>
            </h1>
            
            <p style={{ fontSize: "1.125rem", color: c.muted, lineHeight: 1.6, marginBottom: 40, maxWidth: 480, fontWeight: 400 }}>
              Connect with board-certified doctors via HD video, get AI-powered health risk assessments, and manage your medical records—all in one secure, unified platform.
            </p>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 56 }}>
              <button onClick={() => navigate("/register")} style={{ padding: "14px 32px", background: "#10b981", border: "none", borderRadius: 999, fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#fff", fontFamily: "inherit", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 20px rgba(16, 185, 129, 0.25)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#059669"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(16, 185, 129, 0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#10b981"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(16, 185, 129, 0.25)"; }}
              >
                Book appointment
                <ArrowRight size={18} />
              </button>
              <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} style={{ padding: "14px 32px", background: dark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.8)", border: `1px solid ${c.navBorder}`, borderRadius: 999, fontSize: 15, fontWeight: 600, cursor: "pointer", color: c.text, fontFamily: "inherit", transition: "all 0.2s", backdropFilter: "blur(8px)" }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.1)" : "#fff"; e.currentTarget.style.borderColor = dark ? "#475569" : "#cbd5e1"; }}
                onMouseLeave={e => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.8)"; e.currentTarget.style.borderColor = c.navBorder; }}
              >Explore platform</button>
            </div>

            <div className="hero-stats-grid" style={{ marginTop: 64 }}>
              {stats.map(s => (
                <div key={s.label} className="hero-stat-item">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }} className="hero-stat-header">
                    {React.cloneElement(s.icon, { color: dark ? "#3ecba0" : "#1db585" })}
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: c.text, letterSpacing: "-0.02em" }}>{s.value}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: c.muted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Visual */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center", zIndex: 2 }}>
            <div style={{ position: "absolute", top: "10%", left: "-10%", width: "120%", height: "80%", background: `radial-gradient(ellipse at center, ${dark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.15)'} 0%, rgba(248, 250, 252, 0) 70%)`, zIndex: -1, filter: "blur(40px)" }} />
            
            <div style={{ background: c.cardBg, borderRadius: "50%", padding: 12, boxShadow: dark ? "0 24px 50px -12px rgba(0,0,0,0.5)" : "0 24px 50px -12px rgba(15, 23, 42, 0.15)", border: `1px solid ${c.cardBorder}`, position: "relative", transform: "perspective(1000px) rotateY(-5deg) rotateX(2deg)", transformStyle: "preserve-3d", aspectRatio: "1/1", width: "100%", maxWidth: 460, margin: "0 auto" }}>
              <img src="/assets/doctorimage2.jpeg" alt="Professional female doctor smiling in a clinic" style={{ width: "100%", height: "100%", borderRadius: "50%", display: "block", objectFit: "cover", filter: dark ? "brightness(0.9) contrast(1.1)" : "brightness(1.05) contrast(1.02)" }} />
            </div>

            {/* Floating element 1 */}
            <div className="landing-floating" style={{ position: "absolute", top: "15%", right: "-2%", background: dark ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(16px)", border: `1px solid ${c.navBorder}`, borderRadius: 20, padding: "12px 16px", boxShadow: "0 16px 32px -8px rgba(0, 0, 0, 0.15)", display: "flex", alignItems: "center", gap: 12, animation: "float 6s ease-in-out infinite", zIndex: 10 }}>
              <div style={{ width: 36, height: 36, background: dark ? "rgba(22, 163, 74, 0.2)" : "#dcfce7", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ShieldCheck size={20} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Verified Doctors</div>
                <div style={{ fontSize: 11, color: c.muted, fontWeight: 500 }}>Top Specialists</div>
              </div>
            </div>

            {/* Floating element 2 */}
            <div className="landing-floating" style={{ position: "absolute", bottom: "15%", left: "-2%", background: dark ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(16px)", border: `1px solid ${c.navBorder}`, borderRadius: 20, padding: "12px 16px", boxShadow: "0 16px 32px -8px rgba(0, 0, 0, 0.15)", display: "flex", alignItems: "center", gap: 12, animation: "float 8s ease-in-out infinite reverse", zIndex: 10 }}>
              <div style={{ width: 36, height: 36, background: dark ? "rgba(2, 132, 199, 0.2)" : "#f0f9ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle size={20} color="#0284c7" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>AI Diagnosed</div>
                <div style={{ fontSize: 11, color: c.muted, fontWeight: 500 }}>98% Accuracy</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section id="features" style={{ background: dark ? "#111827" : "#fff", borderTop: `1px solid ${c.cardBorder}`, borderBottom: `1px solid ${c.cardBorder}`, padding: "100px 24px" }}>
        <div className="dm-container">
          <div style={{ textAlign: "center", marginBottom: 64 }} className="reveal">
            <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, background: "rgba(16, 185, 129, 0.1)", padding: "6px 16px", borderRadius: 999 }}>Features</div>
            <h2 style={{ fontSize: "2.75rem", fontWeight: 700, letterSpacing: "-0.03em", color: c.text, marginBottom: 16 }}>Everything you need for better health</h2>
            <p style={{ fontSize: "1.125rem", color: c.muted, maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>Our platform provides an integrated suite of advanced healthcare tools designed seamlessly for patients and providers.</p>
          </div>
          
          <div className="dm-grid-stats reveal">
            {features.map((f, i) => (
              <div key={i} style={{ background: c.cardBg, border: `1px solid ${c.cardBorder}`, borderRadius: 24, padding: "32px", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", cursor: "default", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = dark ? "0 20px 40px -10px rgba(0,0,0,0.3)" : "0 20px 40px -10px rgba(15,23,42,0.08)"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(29, 181, 133, 0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = c.cardBorder; }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: dark ? "rgba(16, 185, 129, 0.1)" : "#fff", border: "1px solid rgba(29, 181, 133, 0.2)", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#10b981", marginBottom: 24 }}>{f.tag}</div>
                <div style={{ width: 56, height: 56, background: dark ? "#111827" : "#fff", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)", border: `1px solid ${c.cardBorder}` }}>
                  {React.cloneElement(f.icon, { color: dark ? "#3ecba0" : "#1db585" })}
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: c.text, marginBottom: 12, letterSpacing: "-0.01em" }}>{f.title}</h3>
                <p style={{ fontSize: "0.95rem", color: c.muted, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{ background: c.bg, padding: "100px 24px" }}>
        <div className="dm-container">
          <div style={{ textAlign: "center", marginBottom: 64 }} className="reveal">
            <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, background: "rgba(16, 185, 129, 0.1)", padding: "6px 16px", borderRadius: 999 }}>Social Proof</div>
            <h2 style={{ fontSize: "2.75rem", fontWeight: 700, letterSpacing: "-0.03em", color: c.text }}>What our patients say</h2>
          </div>
          <div className="dm-grid-stats reveal">
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: c.cardBg, border: `1px solid ${c.cardBorder}`, borderRadius: 24, padding: "32px", position: "relative" }}>
                <Quote size={40} color="#10b981" style={{ opacity: 0.1, position: "absolute", top: 24, right: 24 }} />
                <p style={{ fontSize: "1.1rem", color: c.text, lineHeight: 1.6, marginBottom: 32, fontStyle: "italic" }}>"{t.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: c.text }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: c.muted }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ background: dark ? "#111827" : "#f8fafc", padding: "100px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }} className="reveal">
            <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, background: "rgba(16, 185, 129, 0.1)", padding: "6px 16px", borderRadius: 999 }}>Workflow</div>
            <h2 style={{ fontSize: "2.75rem", fontWeight: 700, letterSpacing: "-0.03em", color: c.text }}>Up and running in minutes</h2>
          </div>
          <div className="how-it-works-grid reveal">
            {/* Connecting line */}
            <div className="how-it-works-line" />
            
            {steps.map((s, i) => (
              <div key={i} style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                <div style={{ width: 64, height: 64, background: c.cardBg, border: "2px solid #10b981", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "1.25rem", fontWeight: 700, color: "#10b981", boxShadow: "0 8px 16px rgba(16, 185, 129, 0.15)" }}>{s.n}</div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: c.text, marginBottom: 12 }}>{s.title}</h3>
                <p style={{ fontSize: "0.95rem", color: c.muted, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ background: c.bg, padding: "100px 24px" }}>
        <div className="dm-container" style={{ maxWidth: 800 }}>
          <div style={{ textAlign: "center", marginBottom: 64 }} className="reveal">
            <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, background: "rgba(16, 185, 129, 0.1)", padding: "6px 16px", borderRadius: 999 }}>Questions</div>
            <h2 style={{ fontSize: "2.75rem", fontWeight: 700, letterSpacing: "-0.03em", color: c.text }}>Frequently Asked</h2>
          </div>
          <div className="reveal">
            {faqs.map((f, i) => (
              <div key={i} style={{ marginBottom: 16, background: c.cardBg, border: `1px solid ${c.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
                <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} style={{ width: "100%", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontWeight: 600, color: c.text, fontSize: 16 }}>{f.q}</span>
                  <ChevronDown size={20} color={c.muted} style={{ transform: activeFaq === i ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s" }} />
                </button>
                <div style={{ maxHeight: activeFaq === i ? 200 : 0, overflow: "hidden", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                  <div style={{ padding: "0 24px 20px", color: c.muted, fontSize: 15, lineHeight: 1.6 }}>{f.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px 100px" }}>
        <div className="reveal" style={{ background: dark ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: 32, padding: "80px 48px", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 24px 50px -12px rgba(0,0,0,0.25)" }}>
          <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, background: "radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)", borderRadius: "50%" }}></div>
          <div style={{ position: "absolute", bottom: -100, left: -100, width: 300, height: 300, background: "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)", borderRadius: "50%" }}></div>
          
          <div style={{ position: "relative", zIndex: 10 }}>
            <h2 style={{ fontSize: "3rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", marginBottom: 20 }}>Ready to take control of your health?</h2>
            <p style={{ fontSize: "1.125rem", color: "#94a3b8", marginBottom: 40, maxWidth: 500, margin: "0 auto 40px", lineHeight: 1.6 }}>Join thousands of patients and providers who trust Dr.AssistAI for their modern healthcare needs.</p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/register")} style={{ padding: "16px 40px", background: "#10b981", border: "none", borderRadius: 999, fontSize: 16, fontWeight: 600, cursor: "pointer", color: "#fff", fontFamily: "inherit", transition: "all 0.2s", boxShadow: "0 8px 20px rgba(16, 185, 129, 0.3)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#059669"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#10b981"; e.currentTarget.style.transform = "translateY(0)"; }}
              >Get started for free</button>
              <button onClick={() => navigate("/login")} style={{ padding: "16px 40px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: 999, fontSize: 16, fontWeight: 600, cursor: "pointer", color: "#fff", fontFamily: "inherit", transition: "all 0.2s", backdropFilter: "blur(8px)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; }}
              >Sign in</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: dark ? "#111827" : "#fff", borderTop: `1px solid ${c.navBorder}`, padding: "48px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Dr.AssistAI</span>
          </div>
          <p style={{ fontSize: 14, color: c.muted, fontWeight: 500 }}>© {new Date().getFullYear()} Dr.AssistAI. All rights reserved.</p>
          <div style={{ display: "flex", gap: 24, fontSize: 14, fontWeight: 500, color: c.muted }}>
            {["Privacy Policy", "Terms of Service", "HIPAA Compliance"].map(l => <a key={l} href="#" style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e=>e.target.style.color=c.text} onMouseLeave={e=>e.target.style.color=c.muted}>{l}</a>)}
          </div>
        </div>
      </footer>
      <style>{`
        @keyframes float { 0% { transform: translateY(0) translateZ(30px); } 50% { transform: translateY(-10px) translateZ(30px); } 100% { transform: translateY(0) translateZ(30px); } }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        
        .hero-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 24px;
        }

        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (max-width: 900px) {
          .landing-nav-links { display: none !important; }
        }

        @media (max-width: 640px) {
          .landing-desktop-btns { display: none !important; }
          .landing-mobile-toggle { display: block !important; }
          .landing-floating { display: none !important; }
          
          .hero-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 24px 16px !important;
            max-width: 340px;
            margin: 48px auto 0 !important;
          }
          .hero-stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 8px;
          }
          .hero-stat-header {
            justify-content: center;
            margin-bottom: 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
