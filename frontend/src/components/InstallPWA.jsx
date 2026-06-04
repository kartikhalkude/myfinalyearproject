import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, ShieldCheck, Monitor } from 'lucide-react';
import storage from '../utils/storage';

const isBrowser = typeof window !== 'undefined';

const getStandaloneMode = () => {
  if (!isBrowser) return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true
  );
};

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(() => getStandaloneMode());
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => storage.getLocalItem('pwa-installed') === 'true');
  const promptRef = useRef(null);
  const dismissedThisSession = storage.getSessionItem('pwa-banner-dismissed') === 'true';

  useEffect(() => {
    if (!isBrowser) return undefined;

    const syncStandalone = () => setIsStandaloneMode(getStandaloneMode());
    syncStandalone();

    // If already installed, in standalone mode, or dismissed, do not register the install listener
    if (
      getStandaloneMode() ||
      storage.getLocalItem('pwa-installed') === 'true' ||
      storage.getSessionItem('pwa-banner-dismissed') === 'true'
    ) {
      if (getStandaloneMode()) {
        setIsInstalled(true);
        storage.setLocalItem('pwa-installed', 'true');
      }
      return undefined;
    }

    const showIfAllowed = () => {
      if (storage.getSessionItem('pwa-banner-dismissed') !== 'true') {
        setVisible(true);
      }
    };

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      promptRef.current = event;
      showIfAllowed();
    };

    const handleInstalled = () => {
      setIsStandaloneMode(true);
      setIsInstalled(true);
      setDeferredPrompt(null);
      promptRef.current = null;
      setVisible(true);
      storage.setLocalItem('pwa-installed', 'true');
      storage.removeSessionItem('pwa-banner-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('resize', syncStandalone);
    window.addEventListener('orientationchange', syncStandalone);

    const timer = window.setTimeout(() => {
      if (!promptRef.current && storage.getSessionItem('pwa-banner-dismissed') !== 'true') {
        setVisible(true);
      }
    }, 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('resize', syncStandalone);
      window.removeEventListener('orientationchange', syncStandalone);
      window.clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        storage.setLocalItem('pwa-installed', 'true');
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    } finally {
      setDeferredPrompt(null);
      promptRef.current = null;
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setIsAnimatingOut(true);
    window.setTimeout(() => {
      setVisible(false);
      setIsAnimatingOut(false);
      storage.setSessionItem('pwa-banner-dismissed', 'true');
    }, 350);
  }, []);

  const handleOpenApp = useCallback(() => {
    if (getStandaloneMode()) {
      handleDismiss();
      return;
    }

    const popup = window.open(
      window.location.origin + '/',
      'DrAssistAIPWA',
      'popup=yes,width=1280,height=800,resizable=yes,scrollbars=yes'
    );

    if (!popup) {
      window.location.assign('/');
    }
    handleDismiss();
  }, [handleDismiss]);

  const shouldRender = !dismissedThisSession && (visible || Boolean(deferredPrompt) || isStandaloneMode);
  if (!shouldRender) return null;

  const dark = isBrowser && document.body.classList.contains('dm');
  const title = isStandaloneMode ? 'Dr.AssistAI Open' : isInstalled ? 'Open Dr.AssistAI' : 'Install Dr.AssistAI';
  const subtitle = isStandaloneMode
    ? 'You are inside the app'
    : isInstalled
      ? 'Open the installed app on desktop'
      : 'Faster, full-screen access';
  const primaryLabel = deferredPrompt ? 'Install' : isStandaloneMode ? 'Close' : isInstalled ? 'Open App' : 'Install';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: dark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.45)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 9998,
          pointerEvents: 'auto',
          animation: isAnimatingOut ? 'pwa-fade-out 0.35s ease forwards' : 'pwa-fade-in 0.35s ease forwards',
        }}
        onClick={handleDismiss}
      />

      <div
        id="pwa-install-banner"
        className="pwa-install-banner-resp"
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: `translateX(-50%) translateY(${isAnimatingOut ? '120px' : '0'})`,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 20px 14px 16px',
          background: dark ? 'rgba(30, 41, 59, 0.96)' : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: 20,
          boxShadow: dark
            ? '0 20px 60px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)'
            : '0 20px 60px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          animation: isAnimatingOut
            ? 'pwa-slide-down 0.35s cubic-bezier(0.4, 0, 1, 1) forwards'
            : 'pwa-slide-up 0.45s cubic-bezier(0, 0, 0.2, 1) forwards',
          maxWidth: 'calc(100vw - 32px)',
          width: '540px',
          fontFamily: "'Inter', 'DM Sans', sans-serif",
        }}
      >
        <div
          className="pwa-icon-resp"
          style={{
            width: 44,
            height: 44,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          }}
        >
          <ShieldCheck size={22} color="#fff" strokeWidth={2.5} />
        </div>

        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: dark ? '#f8fafc' : '#0f172a', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: dark ? '#94a3b8' : '#64748b', fontWeight: 500, lineHeight: 1.3, marginTop: 2 }}>
            {subtitle}
          </div>
        </div>

        <div className="pwa-actions-wrap" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleDismiss}
            style={{
              background: dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
              border: dark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(15, 23, 42, 0.08)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: dark ? '#cbd5e1' : '#475569',
              padding: '10px 16px',
              borderRadius: 12,
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
          {isStandaloneMode ? 'Close' : 'Skip'}
          </button>

          <button
            onClick={deferredPrompt ? handleInstall : isStandaloneMode ? handleDismiss : isInstalled ? handleOpenApp : handleInstall}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: deferredPrompt || isStandaloneMode ? '#10b981' : isInstalled ? '#0284c7' : '#10b981',
              border: 'none',
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              color: '#fff',
              fontFamily: 'inherit',
              transition: 'all 0.25s',
              boxShadow: deferredPrompt || isStandaloneMode
                ? '0 4px 12px rgba(16, 185, 129, 0.25)'
                : '0 4px 12px rgba(2, 132, 199, 0.25)',
              letterSpacing: '-0.01em',
            }}
          >
            {deferredPrompt ? <Download size={15} strokeWidth={2.5} /> : <Monitor size={15} strokeWidth={2.5} />}
            {primaryLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pwa-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pwa-fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes pwa-slide-up {
          0% { opacity: 0; transform: translateX(-50%) translateY(80px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pwa-slide-down {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(80px); }
        }

        @media (max-width: 580px) {
          .pwa-install-banner-resp {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 18px 20px !important;
            gap: 12px !important;
            text-align: center;
            bottom: 16px !important;
          }
          .pwa-icon-resp {
            align-self: center !important;
            margin-bottom: 4px;
          }
          .pwa-actions-wrap {
            width: 100% !important;
            justify-content: space-between !important;
            gap: 12px !important;
          }
          .pwa-actions-wrap button {
            flex: 1 !important;
            justify-content: center !important;
            padding: 12px !important;
          }
        }
      `}</style>
    </>
  );
}
