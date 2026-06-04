import React, { useState, useEffect, useRef } from "react";
import storage from "../utils/storage";

/* ══════════════════════════════════════════════════════════════════
   LANGUAGES
══════════════════════════════════════════════════════════════════ */
const LANGUAGES = [
  { code: "en",    label: "English" },
  { code: "hi",    label: "Hindi" },
  { code: "bn",    label: "Bengali" },
  { code: "gu",    label: "Gujarati" },
  { code: "kn",    label: "Kannada" },
  { code: "ml",    label: "Malayalam" },
  { code: "mr",    label: "Marathi" },
  { code: "ne",    label: "Nepali" },
  { code: "or",    label: "Odia" },
  { code: "pa",    label: "Punjabi" },
  { code: "ta",    label: "Tamil" },
  { code: "te",    label: "Telugu" },
  { code: "ur",    label: "Urdu" },
];

/* ══════════════════════════════════════════════════════════════════
   GOOGLE TRANSLATE — boot + aggressive banner kill
══════════════════════════════════════════════════════════════════ */
const GT_KILL_CSS = `
  .goog-te-banner-frame,
  .goog-te-banner-frame.skiptranslate,
  iframe.goog-te-banner-frame,
  .skiptranslate > iframe,
  iframe.skiptranslate { display:none!important; visibility:hidden!important; max-height:0!important; }
  body { top:0!important; position:static!important; margin-top:0!important; padding-top:0!important; min-height:100vh; }
  body.translated-ltr, body.translated-rtl { margin-top:0!important; padding-top:0!important; top:0!important; }
  #goog-gt-tt, .goog-tooltip, .goog-tooltip:hover, .goog-text-highlight { display:none!important; box-shadow:none!important; }
  #gt-hidden-host { display:none!important; }
`;

let _gtBooted = false;
function bootGoogleTranslate() {
  if (_gtBooted) return;
  _gtBooted = true;

  // inject kill CSS
  if (!document.getElementById("gt-kill-css")) {
    const s = document.createElement("style");
    s.id = "gt-kill-css";
    s.textContent = GT_KILL_CSS;
    document.head.appendChild(s);
  }

  // hidden mount point
  if (!document.getElementById("gt-hidden-host")) {
    const d = document.createElement("div");
    d.id = "gt-hidden-host";
    document.body.appendChild(d);
  }

  const killBanner = () => {
    document.body.style.top = "0px";
    document.body.style.marginTop = "0px";
    document.documentElement.style.top = "0px";
    document.querySelectorAll(".goog-te-banner-frame, iframe.goog-te-banner-frame, iframe.skiptranslate, .skiptranslate > iframe").forEach((node) => {
      node.style.setProperty("display", "none", "important");
      node.style.setProperty("visibility", "hidden", "important");
      node.style.setProperty("height", "0", "important");
      node.style.setProperty("max-height", "0", "important");
    });
  };

  window.googleTranslateElementInit = () => {
    new window.google.translate.TranslateElement(
      { pageLanguage: "en", includedLanguages: LANGUAGES.map((l) => l.code).join(","), autoDisplay: false },
      "gt-hidden-host"
    );
    killBanner();
    const observer = new MutationObserver(killBanner);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    window.__gtBannerObserver = observer;
    setInterval(killBanner, 400);
  };

  const sc = document.createElement("script");
  sc.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  sc.async = true;
  document.body.appendChild(sc);
}

function applyLanguage(code) {
  if (code === "en") {
    // clear GT cookies and reload
    ["", "." + location.hostname].forEach((d) => {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/${d ? "; domain=" + d : ""}`;
    });
    window.location.reload();
    return;
  }
  // try the hidden select first
  const sel = document.querySelector(".goog-te-combo");
  if (sel) {
    sel.value = code;
    sel.dispatchEvent(new Event("change"));
  } else {
    // fallback: set cookie + reload
    ["", "." + location.hostname].forEach((d) => {
      document.cookie = `googtrans=/en/${code}; path=/${d ? "; domain=" + d : ""}`;
    });
    window.location.reload();
  }
}

/* ══════════════════════════════════════════════════════════════════
   DARK-MODE CSS
══════════════════════════════════════════════════════════════════ */
const DM_CSS = `
  body.dm { background:#0b1120!important; color:#e2e8f0!important; }
  body.dm .dm-page-content { background:#0b1120!important; color:#e2e8f0!important; }
  body.dm .dm-page-title { color:#f8fafc!important; }
  body.dm .dm-page-subtitle,
  body.dm .dm-soft-muted { color:#94a3b8!important; }
  body.dm .dm-soft-text { color:#cbd5e1!important; }
  body.dm .dm-stat-card-shell { background:#111827!important; border-color:#334155!important; box-shadow:0 10px 28px rgba(2,6,23,0.35)!important; }
  body.dm .dm-stat-label { color:#94a3b8!important; }
  body.dm .dm-stat-value { color:#f8fafc!important; }
  body.dm .dm-stat-sub { color:#94a3b8!important; }
  body.dm .dm-stat-icon-wrap { background:#0f172a!important; border:1px solid #334155!important; }
  body.dm .dm-card-row { background:#0f172a!important; border-color:#1e293b!important; }
  body.dm .dm-card-row:hover { background:#111827!important; }
  body.dm .dm-schedule-card { background:rgba(29,181,133,0.14)!important; border-color:rgba(52,211,153,0.28)!important; }
  body.dm .dm-mini-panel { background:#0f172a!important; border-color:#334155!important; }
  body.dm .dm-sidebar   { background:#111827!important; border-right-color:#1e293b!important; }
  body.dm .dm-divider   { border-color:#1e293b!important; }
  body.dm .dm-user-card { background:#1e293b!important; border-color:#263148!important; }
  body.dm .dm-logo-text { color:#f1f5f9!important; }
  body.dm .dm-user-name { color:#f1f5f9!important; }
  body.dm .dm-section-label { color:#334155!important; }
  body.dm .dm-nav-default   { color:#94a3b8!important; background:transparent!important; }
  body.dm .dm-nav-default:hover { background:#1e293b!important; color:#e2e8f0!important; }
  body.dm .dm-nav-active    { background:#0e3d2c!important; color:#34d399!important; }
  body.dm .dm-toggle-btn    { background:#1e293b!important; border-color:#334155!important; color:#94a3b8!important; }
  body.dm .dm-lang-wrap     { background:#1e293b!important; border-color:#334155!important; }
  body.dm .dm-lang-btn      { background:#1e293b!important; border-color:#334155!important; color:#cbd5e1!important; }
  body.dm .dm-lang-panel    { background:#1a2236!important; border-color:#334155!important; }
  body.dm .dm-lang-search   { background:#111827!important; border-color:#2d3e55!important; color:#e2e8f0!important; }
  body.dm .dm-toast         { background:#111827!important; border-color:#334155!important; box-shadow:0 10px 30px rgba(2,6,23,0.45)!important; }
  body.dm .dm-toast-title   { color:#f8fafc!important; }
  body.dm .dm-toast-message { color:#94a3b8!important; }
  body.dm .dm-toast-secondary { background:#1e293b!important; border-color:#334155!important; color:#cbd5e1!important; }
  body.dm .dm-outline-btn   { background:#0f172a!important; border-color:#334155!important; color:#cbd5e1!important; }
  body.dm .dm-outline-btn:hover { background:#1e293b!important; border-color:#475569!important; }
  body.dm .dm-danger-btn    { background:#2d1a1a!important; border-color:#ef444466!important; color:#f87171!important; }
  body.dm .dm-ghost-btn     { background:transparent!important; color:#94a3b8!important; }
  body.dm .dm-ghost-btn:hover { background:#1e293b!important; color:#e2e8f0!important; }
  body.dm .dm-surface-card,
  body.dm .dm-list-surface,
  body.dm .dm-modal-surface,
  body.dm .dm-search-surface,
  body.dm .dm-search-trigger,
  body.dm .dm-med-card { background:#111827!important; border-color:#334155!important; color:#e2e8f0!important; }
  body.dm .dm-search-trigger-active { background:#0f172a!important; border-color:#10b981!important; }
  body.dm .dm-modal-header,
  body.dm .dm-modal-footer { background:#111827!important; border-color:#1e293b!important; }
  body.dm .dm-stat-card { background:#111827!important; border-color:#334155!important; box-shadow:0 6px 18px rgba(2,6,23,0.28)!important; }
  body.dm .dm-icon-chip { background:#0f172a!important; border-color:#334155!important; }
  body.dm .dm-record-row:hover,
  body.dm .dm-rx-row:hover { background:#0f172a!important; }
  body.dm .dm-detail-panel { background:#0f172a!important; border-color:#334155!important; color:#e2e8f0!important; }
  body.dm .dm-feedback-panel { background:rgba(34,197,94,0.14)!important; border-color:rgba(134,239,172,0.4)!important; }
  body.dm .dm-warning-panel { background:rgba(245,158,11,0.12)!important; border-color:rgba(253,230,138,0.35)!important; }
  body.dm .dm-file-panel { background:rgba(37,99,235,0.14)!important; border-color:rgba(147,197,253,0.35)!important; }
  body.dm .dm-section-header,
  body.dm .dm-table-head th,
  body.dm .dm-table-row,
  body.dm .dm-table-row td { border-color:#1e293b!important; }
  body.dm .dm-table-head { background:#0f172a!important; }
  body.dm .dm-table-cell,
  body.dm .dm-table-row td,
  body.dm .dm-table-row span,
  body.dm .dm-table-row div { color:inherit; }
  body.dm .dm-soft-panel,
  body.dm .dm-muted-panel,
  body.dm .dm-preview-panel,
  body.dm .dm-stat-strip,
  body.dm .dm-prob-chip,
  body.dm .dm-select-card,
  body.dm .dm-upload-zone { background:#0f172a!important; border-color:#1e293b!important; }
  body.dm .dm-upload-zone-active { background:#0f172a!important; border-color:#60a5fa!important; }
  body.dm .dm-info-banner { background:rgba(37,99,235,0.14)!important; border-color:rgba(96,165,250,0.35)!important; }
  body.dm .dm-success-banner { background:rgba(34,197,94,0.14)!important; border-color:rgba(134,239,172,0.4)!important; }
  body.dm .dm-error-banner { background:rgba(239,68,68,0.12)!important; border-color:rgba(248,113,113,0.4)!important; }
  body.dm .dm-info-banner span,
  body.dm .dm-info-banner strong { color:#bfdbfe!important; }
  body.dm .dm-success-banner div { color:#bbf7d0!important; }
  body.dm .dm-error-banner { color:#fca5a5!important; }
  body.dm .dm-logout-btn    { color:#f87171!important; }
  body.dm .dm-logout-btn:hover { background:#2d1a1a!important; }
  body.dm .dm-section-card  { background:#111827!important; border-color:#1e293b!important; }
  body.dm .dm-appointment-card { background:#111827!important; border-color:#1e293b!important; }
  body.dm input, body.dm select, body.dm textarea {
    background:#1a2236!important; border-color:#2d3e55!important; color:#e2e8f0!important;
  }
  body.dm input:focus, body.dm select:focus, body.dm textarea:focus {
    background:#1e293b!important; border-color:#1db585!important;
  }
  body.dm input::placeholder { color:#475569!important; }
  body.dm th, body.dm thead tr { background:#1a2236!important; }
  body.dm td { border-color:#1e293b!important; }
  body.dm tr:hover td { background:#1a2236!important; }
`;

export function useDarkMode() {
  const [dark, setDark] = useState(document.body.classList.contains("dm"));
  useEffect(() => {
    const handler = (e) => setDark(e.detail.dark);
    window.addEventListener("darkmodechange", handler);
    return () => window.removeEventListener("darkmodechange", handler);
  }, []);
  return dark;
}

function injectDM() {
  if (document.getElementById("dm-css")) return;
  const s = document.createElement("style");
  s.id = "dm-css";
  s.textContent = DM_CSS;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════════════════════ */
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const GlobeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const ChevronDownIcon = ({ flipped }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    style={{ transition: "transform 0.2s", transform: flipped ? "rotate(180deg)" : "rotate(0deg)" }}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const TickIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════
   CUSTOM LANGUAGE DROPDOWN
══════════════════════════════════════════════════════════════════ */
function LangDropdown({ dark }) {
  const [open, setOpen]       = useState(false);
  const [lang, setLang]       = useState("en");
  const [query, setQuery]     = useState("");
  const wrapRef               = useRef(null);
  const searchRef             = useRef(null);

  // restore from cookie on mount
  useEffect(() => {
    const m = document.cookie.match(/googtrans=\/en\/([^;]+)/);
    if (m) setLang(decodeURIComponent(m[1]));
  }, []);

  // close on outside click
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // focus search on open
  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 50); }, [open]);

  const current  = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const filtered = query.trim()
    ? LANGUAGES.filter((l) => l.label.toLowerCase().includes(query.toLowerCase()))
    : LANGUAGES;

  const pick = (code) => {
    setLang(code);
    setOpen(false);
    setQuery("");
    applyLanguage(code);
  };

  /* colour tokens */
  const wrapBg  = dark ? "#1e293b" : "#f8fafc";
  const wrapBd  = dark ? "#334155" : "#e2e8f0";
  const btnTxt  = dark ? "#cbd5e1" : "#334155";
  const panelBg = dark ? "#1a2236" : "#ffffff";
  const panelBd = dark ? "#334155" : "#e2e8f0";
  const srchBg  = dark ? "#111827" : "#f8fafc";
  const srchBd  = dark ? "#2d3e55" : "#e2e8f0";
  const optTxt  = dark ? "#e2e8f0" : "#1e293b";
  const hoverBg = dark ? "#263148" : "#f1f5f9";
  const actBg   = dark ? "#0e3d2c" : "#f0fdf4";
  const labelC  = dark ? "#64748b" : "#94a3b8";

  return (
    <div ref={wrapRef} className="dm-lang-wrap"
      style={{ position: "relative", borderRadius: 10, background: wrapBg, border: `1px solid ${wrapBd}`, padding: "8px 10px", transition: "all 0.2s" }}>

      {/* label row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <span style={{ color: labelC, display: "flex" }}><GlobeIcon /></span>
        <span style={{ fontSize: 10, fontWeight: 700, color: labelC, textTransform: "uppercase", letterSpacing: "0.07em" }}>Language</span>
      </div>

      {/* trigger */}
      <button className="dm-lang-btn" onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 8, border: `1px solid ${wrapBd}`, background: wrapBg, color: btnTxt, fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", transition: "border-color 0.15s" }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = "#1db585"}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = wrapBd}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 4 }}>{current.label}</span>
        <span style={{ color: "#94a3b8", display: "flex", flexShrink: 0 }}><ChevronDownIcon flipped={open} /></span>
      </button>

      {/* panel — opens UPWARD so it doesn't get clipped */}
      {open && (
        <div className="dm-lang-panel"
          style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0, background: panelBg, border: `1px solid ${panelBd}`, borderRadius: 12, boxShadow: "0 -16px 40px rgba(0,0,0,0.18)", zIndex: 9999, overflow: "hidden", animation: "langUp 0.14s ease" }}>

          {/* search box */}
          <div style={{ padding: "8px 8px 4px" }}>
            <input ref={searchRef} className="dm-lang-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…"
              style={{ width: "100%", padding: "7px 10px", fontSize: 12.5, fontFamily: "'DM Sans', sans-serif", color: optTxt, background: srchBg, border: `1px solid ${srchBd}`, borderRadius: 7, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
              onFocus={(e) => e.target.style.borderColor = "#1db585"}
              onBlur={(e) => e.target.style.borderColor = srchBd} />
          </div>

          {/* options */}
          <div style={{ maxHeight: 216, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px", fontSize: 13, color: "#94a3b8", textAlign: "center" }}>No results</div>
            ) : filtered.map((l) => {
              const active = l.code === lang;
              return (
                <button key={l.code} onClick={() => pick(l.code)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "none", background: active ? actBg : "transparent", color: active ? "#1db585" : optTxt, fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                  {l.label}
                  {active && <span style={{ color: "#1db585", display: "flex" }}><TickIcon /></span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes langUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .dm-lang-panel div::-webkit-scrollbar{width:4px}
        .dm-lang-panel div::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MOBILE HEADER
══════════════════════════════════════════════════════════════════ */
export function MobileHeader({ onMenuClick, user }) {
  const [dark, setDark] = useState(() => storage.getLocalItem("dm") === "1");
  
  useEffect(() => {
    const sync = () => setDark(document.body.classList.contains('dm'));
    window.addEventListener('dm-change', sync);
    return () => window.removeEventListener('dm-change', sync);
  }, []);

  const avatarColors = ["#1db585", "#3b82f6", "#8b5cf6", "#f59e0b", "#f43f5e"];
  const aColor = avatarColors[(user?.name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div className="dm-mobile-header" style={{
      display: "none",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px",
      background: dark ? "#111827" : "#fff",
      borderBottom: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 145
    }}>
      <button onClick={onMenuClick} style={{
        background: "none",
        border: "none",
        color: dark ? "#f1f5f9" : "#0f172a",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 4
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="dm-logo-text" style={{ fontSize: 14, fontWeight: 700, color: "#1db585" }}>Dr.AssistAI</div>
      </div>

      <div style={{ width: 32, height: 32, borderRadius: "50%", background: aColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600 }}>
        {user?.name?.charAt(0)?.toUpperCase()}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════════════════ */
export function Sidebar({ user, navItems, activeTab, onTabChange, onLogout, wsConnected, mobileOpen, onMobileClose }) {
  const [dark, setDark] = useState(() => storage.getLocalItem("dm") === "1");
  const gtBooted = useRef(false);

  useEffect(() => { injectDM(); document.body.classList.toggle("dm", dark); }, []); // eslint-disable-line
  useEffect(() => { if (!gtBooted.current) { gtBooted.current = true; bootGoogleTranslate(); } }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.body.classList.toggle("dm", next);
    storage.setLocalItem("dm", next ? "1" : "0");
    window.dispatchEvent(new CustomEvent("darkmodechange", { detail: { dark: next } }));
  };

  const avatarColors = ["#1db585", "#3b82f6", "#8b5cf6", "#f59e0b", "#f43f5e"];
  const aColor = avatarColors[(user?.name?.charCodeAt(0) || 0) % avatarColors.length];

  const dividerC = dark ? "#1e293b" : "#f1f5f9";

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div onClick={onMobileClose} style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.4)",
          backdropFilter: "blur(4px)",
          zIndex: 140,
          display: "none"
        }} className="dm-mobile-backdrop" />
      )}

      <div className={`dm-sidebar ${mobileOpen ? 'mobile-open' : ''}`} style={{ 
        width: 220, 
        background: dark ? "#111827" : "#fff", 
        borderRight: `1px solid ${dividerC}`, 
        display: "grid", 
        gridTemplateRows: "auto auto 1fr auto",
        height: "100dvh", 
        position: "sticky", 
        top: 0, 
        flexShrink: 0, 
        fontFamily: "'DM Sans', sans-serif", 
        transition: "background 0.25s, border-color 0.25s, transform 0.3s ease", 
        overflow: "hidden" 
      }}>

        {/* Mobile Close Button */}
        <div className="dm-sidebar-mobile-close" style={{ display: "none", justifyContent: "flex-end", padding: "12px 12px 0" }}>
          <button onClick={onMobileClose} style={{ background: "none", border: "none", color: dark ? "#94a3b8" : "#64748b", cursor: "pointer" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

      {/* Logo */}
      <div className="dm-divider" style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${dividerC}`, transition: "border-color 0.25s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
          <div style={{ width: 30, height: 30, background: "#1db585", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="dm-logo-text" style={{ fontSize: 15, fontWeight: 600, color: dark ? "#f1f5f9" : "#0f172a", letterSpacing: "-0.01em", transition: "color 0.25s" }}>Dr.AssistAI</div>
            <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 500 }}>{user?.role === "doctor" ? "Doctor Portal" : "Patient Portal"}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: wsConnected ? "#1db585" : "#94a3b8", animation: wsConnected ? "pulse 2s infinite" : "none" }} />
          <span style={{ fontSize: 12, color: wsConnected ? "#0a7a57" : "#94a3b8" }}>{wsConnected ? "Connected" : "Offline"}</span>
        </div>
      </div>

      {/* User card */}
      <div className="dm-user-card" style={{ margin: "12px 12px 0", padding: "10px 12px", background: dark ? "#1e293b" : "#f8fafc", borderRadius: 12, border: `1px solid ${dark ? "#263148" : "#f1f5f9"}`, display: "flex", alignItems: "center", gap: 10, transition: "all 0.25s" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: aColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{user?.name?.charAt(0)?.toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <div className="dm-user-name" style={{ fontSize: 13, fontWeight: 500, color: dark ? "#f1f5f9" : "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.25s" }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.specialization || user?.email}</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ minHeight: 0, overflowY: "auto", padding: "16px 10px" }} className="dm-hide-scrollbar">
        {navItems.map((item, i) => {
          if (item.section) return (
            <div key={i} className="dm-section-label" style={{ fontSize: 10, fontWeight: 600, color: dark ? "#334155" : "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 6px", marginBottom: 6, marginTop: i === 0 ? 0 : 18, transition: "color 0.25s" }}>{item.section}</div>
          );
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => { onTabChange(item.id); if (onMobileClose) onMobileClose(); }}
              className={isActive ? "dm-nav-active" : "dm-nav-default"}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, cursor: "pointer", fontSize: 13.5, fontWeight: isActive ? 500 : 400, color: isActive ? (dark ? "#34d399" : "#0a7a57") : (dark ? "#94a3b8" : "#64748b"), border: "none", background: isActive ? (dark ? "#0e3d2c" : "#f0faf7") : "transparent", width: "100%", textAlign: "left", transition: "all 0.15s", marginBottom: 2, fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = dark ? "#1e293b" : "#f8fafc"; e.currentTarget.style.color = dark ? "#e2e8f0" : "#1e293b"; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = dark ? "#94a3b8" : "#64748b"; } }}>
              <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, minWidth: 18, textAlign: "center" }}>{item.badge}</span>}
              {item.tag && <span style={{ background: dark ? "#1e293b" : "#f0faf7", color: dark ? "#34d399" : "#0a7a57", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, border: `1px solid ${dark ? "#1a5c42" : "#a3e7d4"}` }}>{item.tag}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="dm-divider" style={{ padding: "12px 10px", borderTop: `1px solid ${dividerC}`, display: "flex", flexDirection: "column", gap: 8, transition: "border-color 0.25s", flexShrink: 0 }}>

        {/* Dark mode toggle */}
        <button className="dm-toggle-btn" onClick={toggleDark}
          style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 500, color: dark ? "#94a3b8" : "#64748b", background: dark ? "#1e293b" : "#f8fafc", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, width: "100%", textAlign: "left", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1db585"; e.currentTarget.style.color = "#1db585"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = dark ? "#334155" : "#e2e8f0"; e.currentTarget.style.color = dark ? "#94a3b8" : "#64748b"; }}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, opacity: 0.85 }}>{dark ? <SunIcon /> : <MoonIcon />}</span>
          <span style={{ flex: 1 }}>{dark ? "Light Mode" : "Dark Mode"}</span>
          {/* pill */}
          <span style={{ width: 32, height: 18, borderRadius: 999, background: dark ? "#1db585" : "#cbd5e1", position: "relative", flexShrink: 0, transition: "background 0.25s", display: "inline-block" }}>
            <span style={{ position: "absolute", top: 2, left: dark ? 14 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.25s" }} />
          </span>
        </button>

        {/* Language picker */}
        <LangDropdown dark={dark} />

        {/* Logout */}
        <button className="dm-logout-btn" onClick={onLogout}
          style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, cursor: "pointer", fontSize: 13.5, color: "#ef4444", border: "none", background: "transparent", width: "100%", textAlign: "left", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" }}
          onMouseEnter={(e) => e.currentTarget.style.background = dark ? "#2d1a1a" : "#fef2f2"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Sign out
        </button>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
══════════════════════════════════════════════════════════════════ */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
      <div style={{ minWidth: 200, flex: 1 }}>
        <h1 className='dm-page-title' style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em", marginBottom: 3 }}>{title}</h1>
        {subtitle && <p className="dm-page-subtitle" style={{ fontSize: 13.5, color: "#64748b" }}>{subtitle}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {action}
      </div>
    </div>
  );
}

export function StatCard({ label, value, sub, color = "#1db585", icon }) {
  return (
    <div className="dm-stat-card-shell" style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="dm-stat-label" style={{ fontSize: 12.5, fontWeight: 500, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
        {icon && <div className="dm-stat-icon-wrap" style={{ width: 32, height: 32, background: color + "18", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>}
      </div>
      <div className="dm-stat-value" style={{ fontSize: "1.875rem", fontWeight: 500, letterSpacing: "-0.02em", color: "#0f172a", lineHeight: 1 }}>{value}</div>
      {sub && <div className="dm-stat-sub" style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px" }}>
      <div style={{ width: 52, height: 52, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: "#475569", marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#94a3b8", maxWidth: 320, margin: "0 auto", lineHeight: 1.6 }}>{subtitle}</div>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

export function Badge({ children, color = "slate" }) {
  const colors = { green:{bg:"#dcfce7",color:"#166534"}, yellow:{bg:"#fef9c3",color:"#854d0e"}, red:{bg:"#fee2e2",color:"#991b1b"}, blue:{bg:"#dbeafe",color:"#1e40af"}, slate:{bg:"#f1f5f9",color:"#475569"}, brand:{bg:"#f0faf7",color:"#0a7a57"}, purple:{bg:"#f3e8ff",color:"#6b21a8"}, orange:{bg:"#fff7ed",color:"#9a3412"} };
  const c = colors[color] || colors.slate;
  return <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px", fontSize:12, fontWeight:500, borderRadius:999, background:c.bg, color:c.color }}>{children}</span>;
}

export function Btn({ onClick, disabled, loading, variant="primary", size="md", children, style={} }) {
  const sizes = { sm:{padding:"6px 14px",fontSize:13}, md:{padding:"9px 18px",fontSize:14}, lg:{padding:"12px 28px",fontSize:15} };
  const variants = { primary:{background:"#1db585",color:"#fff",border:"none"}, outline:{background:"#fff",color:"#475569",border:"1.5px solid #e2e8f0"}, ghost:{background:"transparent",color:"#64748b",border:"none"}, danger:{background:"#fff",color:"#dc2626",border:"1.5px solid #fca5a5"}, success:{background:"#16a34a",color:"#fff",border:"none"} };
  const cls = `dm-${variant}-btn`;
  return (
    <button onClick={onClick} disabled={disabled||loading} className={cls} style={{...(variants[variant]||variants.primary),...(sizes[size]||sizes.md),borderRadius:10,cursor:disabled||loading?"not-allowed":"pointer",opacity:disabled?0.5:1,fontFamily:"'DM Sans',sans-serif",fontWeight:500,display:"inline-flex",alignItems:"center",gap:7,transition:"all 0.15s",...style}}>
      {loading && <div style={{width:14,height:14,border:"2px solid rgba(0,0,0,0.1)",borderTop:"2px solid currentColor",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>}
      {children}
    </button>
  );
}

export function SectionCard({ children, style={} }) {
  return <div className="dm-section-card" style={{background:"#fff",border:"1px solid #f1f5f9",borderRadius:16,boxShadow:"0 1px 3px rgba(15,23,42,0.04)",...style}}>{children}</div>;
}

export function Loader({ message="Loading..." }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"64px 24px",gap:14}}>
      <div style={{width:36,height:36,border:"3px solid #f1f5f9",borderTop:"3px solid #1db585",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
      <span style={{fontSize:14,color:"#94a3b8"}}>{message}</span>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease" }} />
      <div className="dm-modal-surface" style={{ position: "relative", width: "100%", maxWidth: 500, background: "#fff", borderRadius: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.1)", overflow: "hidden", animation: "modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div className="dm-modal-header" style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
        {footer && <div className="dm-modal-footer" style={{ padding: "16px 24px", background: "#f8fafc", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 12 }}>{footer}</div>}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", variant = "danger" }) {
  if (!isOpen) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Btn variant="outline" onClick={onClose}>{cancelText}</Btn>
          <Btn variant={variant} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</Btn>
        </>
      }
    >
      <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>{message}</div>
    </Modal>
  );
}
