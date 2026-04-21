// frontend/src/components/dashboard/DashboardCard.jsx
import React from "react";
import { HomeIcon, CalendarIcon, UsersIcon, RefreshIcon } from "../icons/Icons";
import { SectionCard, StatCard as UIStatCard, Btn, Badge, EmptyState, Loader } from "../UI";

export const DashboardCard = ({
  title,
  subtitle,
  icon,
  children,
  footer,
  action,
  loading = false,
  error = null,
  isEmpty = false,
  emptyMessage = "No data available",
}) => {
  return (
    <SectionCard>
      <div style={{ padding: "24px", borderBottom: footer ? "1px solid #f8fafc" : "none" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: (loading || error || isEmpty || React.Children.count(children)) ? 20 : 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            {icon && (
              <div style={{ padding: 8, background: "#f0f9ff", color: "#0284c7", borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {icon}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{title}</h3>
              {subtitle && (
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{subtitle}</p>
              )}
            </div>
          </div>
          {action && (
            <button
              onClick={action.onClick}
              style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#475569", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", transition: "background 0.2s" }}
              onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"}
              onMouseOut={e => e.currentTarget.style.background = "#f8fafc"}
            >
              {action.label}
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", padding: "32px 0" }}>
            <Loader />
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ color: "#ef4444", fontSize: 14, fontWeight: 500 }}>{error}</p>
          </div>
        ) : isEmpty ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ color: "#64748b", fontSize: 14 }}>{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {footer && (
        <div style={{ padding: "16px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: 13, color: "#64748b" }}>
          {footer}
        </div>
      )}
    </SectionCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export const StatCard = ({ label, value, icon, trend, color = "blue" }) => {
  return <UIStatCard label={label} value={value} trend={trend} color={color} />;
};

// ─────────────────────────────────────────────────────────────────────────────

export const AppointmentListItem = ({
  appointment,
  onAction,
  actions = [],
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed": return "green";
      case "pending": return "yellow";
      case "completed": return "blue";
      case "cancelled": return "red";
      default: return "slate";
    }
  };

  return (
    <div style={{ padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", transition: "box-shadow 0.2s" }}
         onMouseOver={e => e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.05)"}
         onMouseOut={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: actions.length > 0 ? 12 : 0 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>
            {appointment.doctorName || appointment.patientName}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4, fontSize: 13, color: "#64748b" }}>
            <span>{new Date(appointment.date).toLocaleDateString()}</span>
            <span>{appointment.time}</span>
          </div>
          {appointment.reason && (
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>{appointment.reason}</p>
          )}
        </div>
        <Badge color={getStatusColor(appointment.status)}>
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </Badge>
      </div>

      {actions.length > 0 && (
        <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #f8fafc" }}>
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onAction(action.id, appointment._id)}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "background 0.2s", fontFamily: "inherit", border: "none",
                ...(action.primary
                  ? { background: "#1db585", color: "#fff" }
                  : { background: "#f1f5f9", color: "#475569" })
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export const DashboardOverview = ({ stats, appointments, onRefresh }) => {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>Dashboard</h1>
          <p style={{ color: "#64748b", marginTop: 4 }}>
            Welcome back! Here's your overview
          </p>
        </div>
        <Btn
          onClick={onRefresh}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", color: "#475569", border: "1px solid #e2e8f0" }}
        >
          <RefreshIcon style={{ width: 16, height: 16 }} />
          <span>Refresh</span>
        </Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24, marginBottom: 32 }}>
        <StatCard
          label="Total Appointments"
          value={stats?.totalAppointments || 0}
          icon={<CalendarIcon style={{ width: 24, height: 24, color: "#3b82f6" }} />}
          color="blue"
        />
        <StatCard
          label="Upcoming"
          value={stats?.upcomingAppointments || 0}
          icon={<HomeIcon style={{ width: 24, height: 24, color: "#10b981" }} />}
          color="green"
        />
        <StatCard
          label="Patients"
          value={stats?.totalPatients || 0}
          icon={<UsersIcon style={{ width: 24, height: 24, color: "#8b5cf6" }} />}
          color="slate"
        />
      </div>

      <DashboardCard
        title="Upcoming Appointments"
        subtitle="Next scheduled consultations"
        icon={<CalendarIcon style={{ width: 20, height: 20 }} />}
        isEmpty={!appointments || appointments.length === 0}
        emptyMessage="No upcoming appointments scheduled"
        action={{ label: "Book New", onClick: () => {} }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(appointments || []).slice(0, 5).map((appointment) => (
            <AppointmentListItem
              key={appointment._id}
              appointment={appointment}
              onAction={(actionId, appointmentId) => {
                console.log("Action:", actionId, "Appointment:", appointmentId);
              }}
              actions={
                appointment.status === "confirmed"
                  ? [
                      { id: "join", label: "Join Call", primary: true },
                      { id: "cancel", label: "Cancel" },
                    ]
                  : []
              }
            />
          ))}
        </div>
      </DashboardCard>
    </div>
  );
};
