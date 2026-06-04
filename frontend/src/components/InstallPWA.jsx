import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, X, ShieldCheck, Monitor } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      localStorage.getItem('pwa-installed') === 'true'
    );
  });
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const promptRef = useRef(null);

  useEffect(() => {
    // Check if already installed as standalone
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
      localStorage.setItem('pwa-installed', 'true');
      return;
    }

    // Check if user previously dismissed (per session)
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed && localStorage.getItem('pwa-installed') !== 'true') return;

    // Listen for the native beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      promptRef.current = e;
      // Show banner immediately since we have a native prompt
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for successful install
    const handleInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem('pwa-installed', 'true');
      setShowBanner(true); // Keep banner open to show "Open App"
      setDeferredPrompt(null);
      promptRef.current = null;
    };
    window.addEventListener('appinstalled', handleInstalled);

    // If it's already installed, show banner so user can "Open App"
    if (localStorage.getItem('pwa-installed') === 'true') {
      setShowBanner(true);
    } else {
      // Fallback: if beforeinstallprompt doesn't fire within 2 seconds,
      // show a manual install banner anyway. This handles Edge and other
      // Chromium browsers that may delay or skip the event on localhost/dev.
      const fallbackTimer = setTimeout(() => {
        if (!promptRef.current) {
          // Just check that a manifest link exists in the document
          const hasManifest = !!document.querySelector('link[rel="manifest"]');
          if (hasManifest) {
            setShowBanner(true);
          }
        }
      }, 2000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleInstalled);
        clearTimeout(fallbackTimer);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    // If we have the native prompt, use it
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('pwa-installed', 'true');
          setShowBanner(true);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
      setDeferredPrompt(null);
      promptRef.current = null;
      return;
    }

    // Fallback: Guide user to browser's install option
    // Detect browser for specific instructions
    const isEdge = navigator.userAgent.includes('Edg');
    const isChrome = navigator.userAgent.includes('Chrome') && !isEdge;

    let message = '';
    if (isEdge) {
      message =
        'To install Dr.AssistAI:\n\n' +
        '1. Click the ⋯ (three dots) menu in the top-right corner\n' +
        '2. Go to "Apps"\n' +
        '3. Click "Install this site as an app"';
    } else if (isChrome) {
      message =
        'To install Dr.AssistAI:\n\n' +
        '1. Click the ⋮ (three dots) menu in the top-right corner\n' +
        '2. Click "Install Dr.AssistAI..." or "Install app"';
    } else {
      message =
        'To install Dr.AssistAI:\n\n' +
        'Look for an install or "Add to Home Screen" option in your browser\'s menu.';
    }

    alert(message);
  }, [deferredPrompt]);

  // Handle Dismiss
  const handleDismiss = useCallback(() => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setShowBanner(false);
      setIsAnimatingOut(false);
      sessionStorage.setItem('pwa-install-dismissed', 'true');
    }, 400);
  }, []);

  // Detect standalone mode
  const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  // If already running inside standalone app, do not show prompt banner
  if (isStandaloneMode) return null;

  // If user dismissed and we're not using the special "isInstalled" state override, hide
  if (!showBanner && !isInstalled) return null;

  const dark = document.body.classList.contains('dm');

  return (
    <>
      {/* Blurred overlay backdrop behind PWA prompt */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: dark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.45)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 9998,
          animation: isAnimatingOut
            ? 'pwa-fade-out 0.4s ease forwards'
            : 'pwa-fade-in 0.5s ease forwards',
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
          background: dark
            ? 'rgba(30, 41, 59, 0.96)'
            : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: 20,
          boxShadow: dark
            ? '0 20px 60px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)'
            : '0 20px 60px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          animation: isAnimatingOut
            ? 'pwa-slide-down 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
            : 'pwa-slide-up 0.6s cubic-bezier(0, 0, 0.2, 1) forwards',
          maxWidth: 'calc(100vw - 32px)',
          width: '540px',
          fontFamily: "'Inter', 'DM Sans', sans-serif",
        }}
      >
        {/* App Icon */}
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

        {/* Text Content */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: dark ? '#f8fafc' : '#0f172a',
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
            }}
          >
            {isInstalled ? 'Dr.AssistAI Installed' : 'Install Dr.AssistAI'}
          </div>
          <div
            style={{
              fontSize: 12,
              color: dark ? '#94a3b8' : '#64748b',
              fontWeight: 500,
              lineHeight: 1.3,
              marginTop: 2,
            }}
          >
            {isInstalled ? 'App is ready on your device' : 'Faster, full-screen access'}
          </div>
        </div>

        {/* Action Group wrapper for stacking on mobile */}
        <div className="pwa-actions-wrap" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Skip / Close Button */}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = dark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(15, 23, 42, 0.08)';
              e.currentTarget.style.color = dark ? '#fff' : '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)';
              e.currentTarget.style.color = dark ? '#cbd5e1' : '#475569';
            }}
          >
            {isInstalled ? 'Close' : 'Skip'}
          </button>

          {/* Action Button */}
          {isInstalled ? (
            <button
              onClick={() => {
                // To open PWA in its own standalone window app:
                // If it's already installed, launching the URL in a new window/tab
                // will trigger the browser's PWA launch/handling mechanism.
                window.open(window.location.origin + '/', '_blank');
                handleDismiss();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: '#0284c7',
                border: 'none',
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                color: '#fff',
                fontFamily: 'inherit',
                transition: 'all 0.25s',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                letterSpacing: '-0.01em',
              }}
            >
              <Monitor size={15} strokeWidth={2.5} />
              Open App
            </button>
          ) : (
            <button
              onClick={handleInstall}
              onMouseEnter={(e) => {
                setIsHovered(true);
                e.currentTarget.style.background = '#059669';
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.boxShadow =
                  '0 6px 16px rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                setIsHovered(false);
                e.currentTarget.style.background = '#10b981';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(16, 185, 129, 0.25)';
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: '#10b981',
                border: 'none',
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                color: '#fff',
                fontFamily: 'inherit',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                letterSpacing: '-0.01em',
              }}
            >
              <Download size={15} strokeWidth={2.5} />
              Install
            </button>
          )}
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
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(80px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes pwa-slide-down {
          0% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(80px);
          }
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
