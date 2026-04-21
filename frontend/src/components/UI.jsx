import React from "react";

const S = {
  sidebar: { width: 220, background: "#fff", borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" },
  logoArea: { padding: "20px 16px 16px", borderBottom: "1px solid #f1f5f9" },
  logoRow: { display: "flex", alignItems: "center", gap: 9, marginBottom: 14 },
  logoMark: { width: 30, height: 30, background: "#1db585", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  logoText: { fontSize: 15, fontWeight: 600, color: "#0f172a", letterSpacing: "-0.01em" },
  role: { fontSize: 11, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 500 },
  connRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 8 },
  connDot: { width: 6, height: 6, borderRadius: "50%" },
  connText: { fontSize: 12 },
  userCard: { margin: "12px 12px 0", padding: "10px 12px", background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: "#1db585", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600, flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 500, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  userSub: { fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  nav: { flex: 1, overflowY: "auto", padding: "16px 10px" },
  navSection: { fontSize: 10, fontWeight: 600, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 6px", marginBottom: 6, marginTop: 18 },
  navItem: { display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, cursor: "pointer", fontSize: 13.5, fontWeight: 400, color: "#64748b", border: "none", background: "transparent", width: "100%", textAlign: "left", transition: "all 0.15s", marginBottom: 2, fontFamily: "'DM Sans', sans-serif" },
  footer: { padding: "14px 10px", borderTop: "1px solid #f1f5f9" },
  logoutBtn: { display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, cursor: "pointer", fontSize: 13.5, color: "#ef4444", border: "none", background: "transparent", width: "100%", textAlign: "left", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" },
};

export function Sidebar({ user, navItems, activeTab, onTabChange, onLogout, wsConnected }) {
  const avatarColors = ["#1db585", "#3b82f6", "#8b5cf6", "#f59e0b", "#f43f5e"];
  const color = avatarColors[(user?.name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div style={S.sidebar}>
      {/* Logo + connection */}
      <div style={S.logoArea}>
        <div style={S.logoRow}>
          <div style={S.logoMark}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={S.logoText}>Dr.AssistAI</div>
            <div style={S.role}>{user?.role === "doctor" ? "Doctor Portal" : "Patient Portal"}</div>
          </div>
        </div>
        <div style={S.connRow}>
          <div style={{ ...S.connDot, background: wsConnected ? "#1db585" : "#94a3b8", animation: wsConnected ? "pulse 2s infinite" : "none" }}></div>
          <span style={{ ...S.connText, color: wsConnected ? "#0a7a57" : "#94a3b8" }}>{wsConnected ? "Connected" : "Offline"}</span>
        </div>
      </div>

      {/* User card */}
      <div style={S.userCard}>
        <div style={{ ...S.avatar, background: color }}>{user?.name?.charAt(0)?.toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <div style={S.userName}>{user?.name}</div>
          <div style={S.userSub}>{user?.specialization || user?.email}</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={S.nav}>
        {navItems.map((item, i) => {
          if (item.section) return (
            <div key={i} style={{ ...S.navSection, ...(i === 0 ? { marginTop: 0 } : {}) }}>{item.section}</div>
          );
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => onTabChange(item.id)}
              style={{ ...S.navItem, background: isActive ? "#f0faf7" : "transparent", color: isActive ? "#0a7a57" : "#64748b", fontWeight: isActive ? 500 : 400 }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#1e293b"; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; } }}
            >
              <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: isActive ? "#1db585" : "#ef4444", color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, minWidth: 18, textAlign: "center" }}>{item.badge}</span>
              )}
              {item.tag && (
                <span style={{ background: "#f0faf7", color: "#0a7a57", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, border: "1px solid #a3e7d4" }}>{item.tag}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={S.footer}>
        <button onClick={onLogout} style={S.logoutBtn}
          onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Sign out
        </button>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.01em", marginBottom: 3 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13.5, color: "#64748b" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub, color = "#1db585", icon }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
        {icon && <div style={{ width: 32, height: 32, background: color + "18", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>}
      </div>
      <div style={{ fontSize: "1.875rem", fontWeight: 500, letterSpacing: "-0.02em", color: "#0f172a", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{sub}</div>}
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
  const colors = {
    green:  { bg: "#dcfce7", color: "#166534" },
    yellow: { bg: "#fef9c3", color: "#854d0e" },
    red:    { bg: "#fee2e2", color: "#991b1b" },
    blue:   { bg: "#dbeafe", color: "#1e40af" },
    slate:  { bg: "#f1f5f9", color: "#475569" },
    brand:  { bg: "#f0faf7", color: "#0a7a57" },
    purple: { bg: "#f3e8ff", color: "#6b21a8" },
    orange: { bg: "#fff7ed", color: "#9a3412" },
  };
  const c = colors[color] || colors.slate;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", fontSize: 12, fontWeight: 500, borderRadius: 999, background: c.bg, color: c.color }}>{children}</span>
  );
}

export function Btn({ onClick, disabled, loading, variant = "primary", size = "md", children, style = {} }) {
  const sizes = { sm: { padding: "6px 14px", fontSize: 13 }, md: { padding: "9px 18px", fontSize: 14 }, lg: { padding: "12px 28px", fontSize: 15 } };
  const variants = {
    primary: { background: "#1db585", color: "#fff", border: "none" },
    outline: { background: "#fff", color: "#475569", border: "1.5px solid #e2e8f0" },
    ghost:   { background: "transparent", color: "#64748b", border: "none" },
    danger:  { background: "#fff", color: "#dc2626", border: "1.5px solid #fca5a5" },
    success: { background: "#16a34a", color: "#fff", border: "none" },
  };
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{ ...v, ...s, borderRadius: 10, cursor: disabled || loading ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 7, transition: "all 0.15s", ...style }}>
      {loading && <div style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.1)", borderTop: "2px solid currentColor", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}></div>}
      {children}
    </button>
  );
}

export function SectionCard({ children, style = {} }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, boxShadow: "0 1px 3px rgba(15,23,42,0.04)", ...style }}>{children}</div>
  );
}

export function Loader({ message = "Loading..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 14 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #f1f5f9", borderTop: "3px solid #1db585", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}></div>
      <span style={{ fontSize: 14, color: "#94a3b8" }}>{message}</span>
    </div>
  );
}