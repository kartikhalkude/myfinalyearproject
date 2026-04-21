// frontend/src/components/notifications/NotificationContainer.jsx
import React, { useState, useCallback, useRef } from 'react';
import { CloseIcon, AlertIcon, CheckIcon, InfoIcon, PhoneIcon } from '../icons/Icons';

const NotificationContext = React.createContext();

export const useNotification = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const autoCloseTimersRef = useRef({});

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const fullNotification = {
      id,
      type: 'info',
      autoClose: true,
      duration: 5000,
      ...notification,
    };

    setNotifications(prev => [...prev, fullNotification]);

    // Show browser notification if applicable
    if (['error', 'success', 'warning'].includes(fullNotification.type)) {
      showBrowserNotification(fullNotification);
    }

    // Auto-close handling
    if (fullNotification.autoClose && fullNotification.duration) {
      const timer = setTimeout(() => {
        removeNotification(id);
      }, fullNotification.duration);

      autoCloseTimersRef.current[id] = timer;
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    // Clear auto-close timer
    if (autoCloseTimersRef.current[id]) {
      clearTimeout(autoCloseTimersRef.current[id]);
      delete autoCloseTimersRef.current[id];
    }

    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleAction = useCallback((notificationId, actionType, actionData) => {
    if (notifications.find(n => n.id === notificationId)?.onAction) {
      notifications
        .find(n => n.id === notificationId)
        .onAction(actionType, actionData);
    }
    removeNotification(notificationId);
  }, [notifications, removeNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification, handleAction }}>
      {children}
      <NotificationContainer notifications={notifications} />
    </NotificationContext.Provider>
  );
};

const NotificationContainer = ({ notifications }) => {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50, display: "flex", flexDirection: "column", gap: 12, maxWidth: 400, width: "100%", pointerEvents: "none", fontFamily: "'DM Sans', sans-serif" }}>
      {notifications.map(notification => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
};

const NotificationItem = ({ notification }) => {
  const { removeNotification, handleAction } = useNotification();
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeNotification(notification.id), 300);
  };

  const getStyleParams = () => {
    switch (notification.type) {
      case 'success':
        return { bg: "#f0fdf4", border: "#4ade80", text: "#14532d", btn: "#16a34a" };
      case 'error':
        return { bg: "#fef2f2", border: "#f87171", text: "#7f1d1d", btn: "#dc2626" };
      case 'warning':
        return { bg: "#fffbeb", border: "#fbbf24", text: "#78350f", btn: "#d97706" };
      case 'call':
        return { bg: "#eff6ff", border: "#60a5fa", text: "#1e3a8a", btn: "#2563eb" };
      default:
        return { bg: "#f8fafc", border: "#94a3b8", text: "#0f172a", btn: "#475569" };
    }
  };

  const params = getStyleParams();

  const containerStyle = {
    background: params.bg,
    borderLeft: `4px solid ${params.border}`,
    color: params.text,
    padding: 16,
    borderRadius: 12,
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
    pointerEvents: "auto",
    transition: "all 0.3s ease",
    opacity: isExiting ? 0 : 1,
    transform: isExiting ? "translateX(100%)" : "translateX(0)",
    backdropFilter: "blur(4px)"
  };

  const getIcon = () => {
    const style = { width: 20, height: 20, color: params.border };
    switch (notification.type) {
      case 'success': return <div style={style}><CheckIcon /></div>;
      case 'error': return <div style={style}><AlertIcon /></div>;
      case 'warning': return <div style={style}><AlertIcon /></div>;
      case 'call': return <div style={style}><PhoneIcon /></div>;
      default: return <div style={style}><InfoIcon /></div>;
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          {getIcon()}
        </div>

        <div style={{ flex: 1 }}>
          {notification.title && (
            <p style={{ fontWeight: 600, fontSize: 14 }}>
              {notification.title}
            </p>
          )}
          {notification.message && (
            <p style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>
              {notification.message}
            </p>
          )}

          {notification.actions && notification.actions.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {notification.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAction(notification.id, action.type, action.data)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 6, cursor: "pointer", transition: "all 0.2s", border: "none", fontFamily: "inherit",
                    ...(action.primary
                      ? { background: params.btn, color: "#fff" }
                      : { background: "rgba(255,255,255,0.7)", color: params.text })
                  }}
                  onMouseOver={e => { if(action.primary) e.currentTarget.style.opacity = 0.9; else e.currentTarget.style.background = "#fff"; }}
                  onMouseOut={e => { if(action.primary) e.currentTarget.style.opacity = 1; else e.currentTarget.style.background = "rgba(255,255,255,0.7)"; }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleClose}
          style={{ flexShrink: 0, opacity: 0.5, background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", transition: "opacity 0.2s" }}
          onMouseOver={e => e.currentTarget.style.opacity = 1}
          onMouseOut={e => e.currentTarget.style.opacity = 0.5}
        >
          <div style={{ width: 16, height: 16 }}>
            <CloseIcon />
          </div>
        </button>
      </div>

      {notification.autoClose && (
        <div style={{ marginTop: 12, height: 4, background: "rgba(0,0,0,0.05)", borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{
              height: "100%", background: params.border, borderRadius: 2, opacity: 0.6,
              animation: `shrink ${notification.duration || 5000}ms linear forwards`
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

const showBrowserNotification = (notification) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(notification.title || 'Notification', {
      body: notification.message || '',
      icon: '/favicon.ico',
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(notification.title || 'Notification', {
          body: notification.message || '',
          icon: '/favicon.ico',
        });
      }
    });
  }
};

export default NotificationProvider;