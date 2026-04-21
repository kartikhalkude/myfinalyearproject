// frontend/src/components/status/StatusIndicator.jsx
import React from 'react';
import { EmptyState as UIEmptyState, Loader as UILoader, Badge as UIBadge } from '../UI';

export const OnlineIndicator = ({ isOnline, size = 'md' }) => {
  const sizes = {
    sm: 8,
    md: 12,
    lg: 16,
  };

  const dim = sizes[size] || sizes.md;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: dim,
          height: dim,
          borderRadius: "50%",
          transition: "all 0.3s",
          background: isOnline ? "#22c55e" : "#94a3b8",
          animation: isOnline ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none"
        }}
      />
      <span style={{ fontSize: 12, color: "#475569" }}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
};

export const ConnectionStatus = ({ connected }) => {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
      ...(connected
        ? { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }
        : { background: "#fefce8", color: "#a16207", border: "1px solid #fef08a" })
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: connected ? "#22c55e" : "#eab308",
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      }} />
      {connected ? 'Connected' : 'Reconnecting...'}
    </div>
  );
};

export const LoadingState = ({ message = 'Loading...' }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <UILoader />
      <p style={{ color: "#475569", fontSize: 14, marginTop: 16 }}>{message}</p>
    </div>
  );
};

export const ErrorState = ({ message = 'Something went wrong', onRetry }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ width: 64, height: 64, background: "#fef2f2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <svg style={{ width: 32, height: 32, color: "#dc2626" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p style={{ color: "#0f172a", fontWeight: 500, textAlign: "center", marginBottom: 16 }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, border: "none", transition: "background 0.2s" }}
          onMouseOver={e => e.currentTarget.style.background = "#1d4ed8"}
          onMouseOut={e => e.currentTarget.style.background = "#2563eb"}
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export const EmptyState = ({ title, message, icon, action }) => {
  return (
    <UIEmptyState
      title={title}
      message={message}
      icon={icon}
      action={action}
    />
  );
};

export const AppointmentStatusBadge = ({ status }) => {
  const getBadgeColor = (status) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'confirmed': return 'green';
      case 'completed': return 'blue';
      case 'cancelled': return 'red';
      case 'no-show': return 'slate';
      default: return 'slate';
    }
  };

  return (
    <UIBadge color={getBadgeColor(status)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </UIBadge>
  );
};

export const UserStatusBadge = ({ isOnline, name }) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: isOnline ? "#22c55e" : "#94a3b8" }} />
      <span style={{ fontSize: 14, color: "#334155" }}>{name}</span>
    </div>
  );
};