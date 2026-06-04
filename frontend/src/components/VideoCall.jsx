// frontend/src/components/VideoCall.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import websocketService from "../services/websocket";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  Users,
  Minimize2,
  Maximize2,
  AlertCircle,
  Activity,
  ShieldCheck,
  X,
  Clock,
  Loader,
} from "lucide-react";

// ─── Fetch TURN credentials from Metered at runtime ─────────────────────────
const fetchIceServers = async () => {
  try {
    const appName = import.meta.env.VITE_METERED_APP_NAME;
    const apiKey = import.meta.env.VITE_METERED_API_KEY;
    if (!appName || !apiKey) throw new Error("Metered env vars missing");
    const res = await fetch(
      `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
    );
    if (!res.ok) throw new Error(`Metered API ${res.status}`);
    const iceServers = await res.json();
    console.log("[WebRTC] ICE servers:", iceServers);
    return { iceServers };
  } catch (e) {
    console.warn("[WebRTC] TURN fetch failed – STUN only:", e.message);
    return {
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
      ],
    };
  }
};

// ─── Module-level ICE candidate buffer ──────────────────────────────────────
// Captures candidates that arrive BEFORE the component mounts (toast path).
// The buffer starts at import time so nothing is missed during navigation.
const _candidateBuffer = new Map();    // appointmentId → candidate[]
const _activeAppointments = new Set();  // appointmentIds with a live component

const _moduleIceHandler = ({ appointmentId, candidate }) => {
  if (!_activeAppointments.has(appointmentId)) {
    if (!_candidateBuffer.has(appointmentId)) _candidateBuffer.set(appointmentId, []);
    _candidateBuffer.get(appointmentId).push(candidate);
  }
};
websocketService.on("call:ice-candidate", _moduleIceHandler);

// ─── Component ───────────────────────────────────────────────────────────────
// callState values: "idle" | "ringing" | "connecting" | "active" | "ended"
//
// "connecting" is used when the patient auto-accepts from the waiting room.
// ICE negotiation runs in the background; we transition to "active" only when
// the ICE state reaches "connected" / "completed".  This ensures the <video>
// elements are in the DOM before ontrack fires.
//
// KEY FIX: <video> elements are ALWAYS mounted (just hidden when not needed).
// This means remoteVideoRef.current is always valid, so ontrack() can safely
// set srcObject regardless of whether React has re-rendered yet.

function VideoCall({
  appointmentId,
  otherUserId,
  otherUserName,
  isDoctor,
  incomingCallData,
  onCallEnd,
}) {
  const { user } = useAuth();
  const [callState, setCallState] = useState("idle");
  const [error, setError] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isPipMinimized, setIsPipMinimized] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [isRequestingMedia, setIsRequestingMedia] = useState(false);

  // Video refs — always in DOM so ontrack always has a valid element
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const mediaInitializationPromiseRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const incomingCallProcessedRef = useRef(false);
  const callStateRef = useRef(callState);

  useEffect(() => { callStateRef.current = callState; }, [callState]);

  // ─── Register instance & drain pre-mount buffer ───────────────────────────
  useEffect(() => {
    _activeAppointments.add(appointmentId);

    const buffered = _candidateBuffer.get(appointmentId) || [];
    _candidateBuffer.delete(appointmentId);
    if (buffered.length > 0) {
      console.log(`[WebRTC] Draining ${buffered.length} pre-mount ICE candidates`);
      iceCandidateQueueRef.current.push(...buffered);
    }

    return () => { _activeAppointments.delete(appointmentId); };
  }, [appointmentId]);

  // ─── Media ────────────────────────────────────────────────────────────────
  const initializeMedia = async () => {
    if (localStreamRef.current?.active) return localStreamRef.current;
    if (mediaInitializationPromiseRef.current) return mediaInitializationPromiseRef.current;

    mediaInitializationPromiseRef.current = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        localStreamRef.current = stream;
        setMediaReady(true);
        // localVideoRef is always mounted, so this always works
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => { });
        }
        return stream;
      } catch (err) {
        setError("Failed to access camera/microphone: " + err.message);
        setMediaReady(false);
        return null;
      } finally {
        mediaInitializationPromiseRef.current = null;
        setIsRequestingMedia(false);
      }
    })();

    return mediaInitializationPromiseRef.current;
  };

  // ─── Peer Connection ──────────────────────────────────────────────────────
  const createPeerConnection = async (stream) => {
    try {
      const iceConfig = await fetchIceServers();
      const pc = new RTCPeerConnection(iceConfig);
      peerConnectionRef.current = pc;

      stream?.getTracks().forEach((t) => pc.addTrack(t, stream));

      // ontrack: remoteVideoRef is ALWAYS mounted, so srcObject always works
      pc.ontrack = (event) => {
        const remoteStream = event.streams?.[0];
        if (!remoteStream) return;
        remoteStreamRef.current = remoteStream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => { });
        }
        console.log("[WebRTC] ontrack – remote stream attached");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          websocketService.emit("call:ice-candidate", {
            appointmentId,
            candidate: event.candidate,
            senderId: user.id,
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        console.log("[WebRTC] ICE state:", s);

        if (s === "connected" || s === "completed") {
          // Transition from "connecting" → "active" for the waiting-room path.
          // Also re-attach video in case ontrack fired while we were still in
          // a state where the overlay was visible.
          if (callStateRef.current === "connecting" || callStateRef.current === "ringing") {
            setCallState("active");
            startCallTimer();
          }
          // Ensure video is playing (mobile autoplay)
          if (remoteVideoRef.current && remoteStreamRef.current) {
            if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
              remoteVideoRef.current.srcObject = remoteStreamRef.current;
            }
            remoteVideoRef.current.play().catch(() => { });
          }
        }

        if (s === "failed") {
          setError("Connection failed – please try again.");
          endCall();
        }

        if (s === "disconnected") {
          setTimeout(() => {
            if (peerConnectionRef.current?.iceConnectionState === "disconnected") {
              setError("Connection lost");
              endCall();
            }
          }, 5000);
        }
      };

      pc.onconnectionstatechange = () =>
        console.log("[WebRTC] Peer state:", pc.connectionState);

      return pc;
    } catch (err) {
      setError("Failed to create peer connection: " + err.message);
      return null;
    }
  };

  // ─── ICE Queue ────────────────────────────────────────────────────────────
  const processIceCandidateQueue = async () => {
    const pc = peerConnectionRef.current;
    if (!pc?.remoteDescription) return;
    const queued = iceCandidateQueueRef.current.splice(0);
    for (const candidate of queued) {
      if (!candidate) continue;
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { }
    }
  };

  // ─── Call Initiation (doctor) ─────────────────────────────────────────────
  const initiateCall = async () => {
    try {
      setCallState("ringing");
      const stream = await initializeMedia();
      if (!stream) return;
      const pc = await createPeerConnection(stream);
      if (!pc) return;

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);

      websocketService.emit("call:initiate", {
        appointmentId,
        callerId: user.id,
        callerName: user.name,
        receiverId: otherUserId,
        offer,
      });
    } catch (err) {
      setError("Failed to initiate call: " + err.message);
    }
  };

  const requestMediaAccess = async () => {
    setError("");
    setIsRequestingMedia(true);
    await initializeMedia();
  };

  // ─── Incoming Call Handler ────────────────────────────────────────────────
  const handleIncomingCall = async (data) => {
    try {
      if (data.appointmentId !== appointmentId) return;
      if (incomingCallProcessedRef.current || peerConnectionRef.current) return;
      incomingCallProcessedRef.current = true;

      const { offer } = data;
      const isWaitingInRoom = callStateRef.current === "idle" && !isDoctor;

      // Waiting room → "connecting" (ICE runs in background, no user action needed)
      // Toast / elsewhere → "ringing" (patient sees accept/reject UI)
      setCallState(isWaitingInRoom ? "connecting" : "ringing");

      const stream = await initializeMedia();
      if (!stream) return;
      const pc = await createPeerConnection(stream);
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // Drain queue — includes pre-mount buffer (toast) AND any that arrived
      // while handleIncomingCall was running asynchronously (waiting room)
      await processIceCandidateQueue();

      const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(answer);

      websocketService.emit("call:answer", { appointmentId, answer });

      // "connecting" state: oniceconnectionstatechange will fire setCallState("active")
      // "ringing" state:    patient taps Accept → acceptCall() → setCallState("active")
      if (!isWaitingInRoom) {
        setTimeout(() => {
          if (callStateRef.current === "idle") incomingCallProcessedRef.current = false;
        }, 10000);
      }
    } catch (err) {
      setError("Failed to handle incoming call: " + err.message);
    }
  };

  // ─── Call Answered (doctor receives patient's answer) ────────────────────
  const handleCallAnswered = async (data) => {
    try {
      const { answer } = data;
      const pc = peerConnectionRef.current;
      if (!pc) return;
      if (pc.signalingState === "stable") return;

      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await processIceCandidateQueue();
      // Doctor's "active" state is set by oniceconnectionstatechange
    } catch (err) {
      setError("Failed to process answer: " + err.message);
    }
  };

  // ─── ICE Candidate (component-level handler) ─────────────────────────────
  const handleICECandidate = async ({ candidate }) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc?.remoteDescription) {
        iceCandidateQueueRef.current.push(candidate);
        return;
      }
      if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch { }
  };

  // ─── Accept / Reject / End ────────────────────────────────────────────────
  const acceptCall = () => {
    // ICE is already running; just show the active UI.
    // oniceconnectionstatechange will also fire, but setting active here gives
    // instant feedback on tap.
    setCallState("active");
    startCallTimer();
    // Re-attach remote stream in case ontrack already fired
    if (remoteStreamRef.current && remoteVideoRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(() => { });
    }
  };

  const rejectCall = () => {
    websocketService.emit("call:reject", { appointmentId, userId: user.id });
    cleanup();
    setCallState("idle");
  };

  const endCall = () => {
    websocketService.emit("call:end", { appointmentId, userId: user.id });
    cleanup();
    setCallState("ended");
    if (onCallEnd) setTimeout(onCallEnd, 1000);
  };

  const handleCallEnded = () => { cleanup(); setCallState("ended"); };

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  const cleanup = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
      peerConnectionRef.current.close();
    }
    peerConnectionRef.current = null;
    incomingCallProcessedRef.current = false;
  };

  // ─── Timer ────────────────────────────────────────────────────────────────
  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
  };

  const formatDuration = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  // ─── A/V Toggles ─────────────────────────────────────────────────────────
  const toggleAudio = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsAudioOn(t.enabled); }
  };
  const toggleVideo = () => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsVideoOn(t.enabled); }
  };

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onIncoming = (d) => handleIncomingCall(d);
    const onAnswered = (d) => handleCallAnswered(d);
    const onIce = (d) => handleICECandidate(d);
    const onEnded = () => handleCallEnded();
    const onRejected = () => { setError("Call was declined"); cleanup(); setCallState("idle"); };

    websocketService.on("call:incoming", onIncoming);
    websocketService.on("call:answered", onAnswered);
    websocketService.on("call:ice-candidate", onIce);
    websocketService.on("call:ended", onEnded);
    websocketService.on("call:rejected", onRejected);

    return () => {
      websocketService.off("call:incoming", onIncoming);
      websocketService.off("call:answered", onAnswered);
      websocketService.off("call:ice-candidate", onIce);
      websocketService.off("call:ended", onEnded);
      websocketService.off("call:rejected", onRejected);
    };
  }, [user.id, appointmentId, otherUserId, isDoctor]);

  // Toast path: incomingCallData prop carries the offer
  useEffect(() => {
    if (incomingCallData && !incomingCallProcessedRef.current && !isDoctor) {
      handleIncomingCall(incomingCallData);
    }
  }, [incomingCallData, isDoctor]);

  // Auto-accept shortcut for toast path once peer connection is ready
  useEffect(() => {
    if (incomingCallData && callState === "ringing" && !isDoctor && peerConnectionRef.current) {
      const t = setTimeout(() => acceptCall(), 500);
      return () => clearTimeout(t);
    }
  }, [incomingCallData, callState, isDoctor]);

  useEffect(() => () => cleanup(), []);

  // ─── Styles ───────────────────────────────────────────────────────────────
  const ctrlBtn = (active, danger) => ({
    width: 52, height: 52, borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.1)",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
    background: danger
      ? "linear-gradient(135deg,#ef4444,#b91c1c)"
      : active ? "rgba(255,255,255,0.1)" : "rgba(239,68,68,0.2)",
    color: danger || !active ? "#fff" : "#cbd5e1",
    boxShadow: danger ? "0 8px 20px rgba(239,68,68,0.3)" : "none",
    backdropFilter: "blur(12px)",
  });

  const isCallActive = callState === "active";
  const isMobilePwa =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "#020617", color: "#f8fafc",
      fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <style>{`
        @keyframes vc-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes vc-pulse    { 0%{box-shadow:0 0 0 0 rgba(16,185,129,.4)} 70%{box-shadow:0 0 0 20px rgba(16,185,129,0)} 100%{box-shadow:0 0 0 0 rgba(16,185,129,0)} }
        @keyframes vc-ring     { 0%{transform:scale(1);box-shadow:0 0 0 0 rgba(16,185,129,.5)} 50%{transform:scale(1.05)} 100%{transform:scale(1);box-shadow:0 0 0 30px rgba(16,185,129,0)} }
        @keyframes vc-glow     { 0%,100%{opacity:.3} 50%{opacity:.6} }
        @keyframes vc-slide-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes vc-spin     { to{transform:rotate(360deg)} }
        .vc-glass { background:rgba(15,23,42,.65); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,.08); }
      `}</style>

      {/* Background glows */}
      <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "40%", height: "40%", background: "radial-gradient(circle,rgba(16,185,129,.15) 0%,transparent 70%)", filter: "blur(60px)", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "40%", height: "40%", background: "radial-gradient(circle,rgba(16,185,129,.1) 0%,transparent 70%)", filter: "blur(60px)", zIndex: 0 }} />

      {/* ── Video elements – ALWAYS in DOM so refs are always valid ────────
          Visibility is controlled by opacity/zIndex, not conditional rendering.
          This is the core fix: ontrack() can always write to remoteVideoRef.   */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 10,
        opacity: isCallActive ? 1 : 0,
        pointerEvents: isCallActive ? "auto" : "none",
        transition: "opacity 0.3s ease",
        background: "#000",
      }}>
        {/* Remote (full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay playsInline
          onClick={(e) => e.target.play()}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* Camera-off overlay */}
        {!isVideoOn && (
          <div style={{ position: "absolute", inset: 0, background: "#020617", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
            <div style={{ width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <VideoOff size={48} color="#475569" />
            </div>
            <div style={{ fontSize: 18, color: "#94a3b8", fontWeight: 500 }}>Participant's camera is off</div>
          </div>
        )}

        {/* Local PIP */}
        {(() => {
          const pipW = Math.min(280, window.innerWidth * 0.45);
          const pipH = Math.round(pipW * (9/16));
          const miniW = 120;
          const miniH = 80;
          
          return (
            <div style={{
              position: "absolute", 
              bottom: isPipMinimized ? 32 : (window.innerWidth < 768 ? pipH + 80 : 120), 
              right: window.innerWidth < 768 ? 16 : 32,
              width: isPipMinimized ? miniW : pipW, 
              height: isPipMinimized ? miniH : pipH,
              borderRadius: 20, overflow: "hidden", border: "2px solid rgba(255,255,255,.15)",
              boxShadow: "0 20px 40px rgba(0,0,0,.6)",
              transition: "all .4s cubic-bezier(.4,0,.2,1)", zIndex: 100,
            }}>
              <video ref={localVideoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", top: 0, inset: 0, background: "linear-gradient(to top,rgba(0,0,0,.4) 0%,transparent 40%)" }} />
              <div style={{ position: "absolute", bottom: 12, left: 12, fontSize: 12, fontWeight: 700, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,.5)" }}>You</div>
              <button
                onClick={() => setIsPipMinimized(!isPipMinimized)}
                style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 8, background: "rgba(15,23,42,.8)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {isPipMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
            </div>
          );
        })()}
      </div>

      {/* Error */}
      {error && (
        <div style={{ position: "absolute", top: 32, left: "50%", transform: "translateX(-50%)", zIndex: 1100, background: "rgba(239,68,68,.9)", backdropFilter: "blur(8px)", borderRadius: 16, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 20px 40px rgba(0,0,0,.4)", animation: "vc-slide-up .3s ease", minWidth: 320, border: "1px solid rgba(255,255,255,.1)" }}>
          <AlertCircle size={20} color="#fff" />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#fff" }}>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer" }}><X size={18} /></button>
        </div>
      )}

      {/* Top HUD (only when active) */}
      <div className="vc-glass" style={{
        position: "absolute", top: 24, left: 24, right: 24, height: 72,
        borderRadius: 20, zIndex: 50, display: "flex", alignItems: "center",
        padding: "0 24px", justifyContent: "space-between",
        visibility: isCallActive ? "visible" : "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={20} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>{otherUserName}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "vc-glow 1.5s infinite" }} />
              Live Consultation
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,.2)", padding: "8px 16px", borderRadius: 12 }}>
            <Clock size={16} color="#94a3b8" />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", fontFamily: "monospace", letterSpacing: "1px" }}>{formatDuration(callDuration)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8" }}>
            <Users size={18} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>2 Participants</span>
          </div>
        </div>
      </div>

      {/* ── Overlay states (rendered on top of the always-mounted video) ─── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: isCallActive ? "none" : "auto" }}>

        {/* IDLE */}
        {callState === "idle" && (
          <div style={{ textAlign: "center", maxWidth: 440, padding: 40, animation: "vc-slide-up .6s ease" }}>
            <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 40px" }}>
              <div style={{ position: "absolute", inset: -20, borderRadius: "50%", border: "2px dashed rgba(16,185,129,.2)" }} />
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "linear-gradient(135deg,#1e293b,#0f172a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 50px rgba(0,0,0,.5)", border: "1px solid rgba(255,255,255,.08)", fontSize: 48, fontWeight: 700, color: "#10b981" }}>
                {otherUserName?.charAt(0)?.toUpperCase() || <Users size={48} />}
              </div>
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-.02em" }}>
              {isDoctor ? "Ready to Consult?" : "Welcome to the Clinic"}
            </h2>
            <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.6, marginBottom: 40 }}>
              {isDoctor
                ? `Initiate a secure HD video call with ${otherUserName} to begin the appointment.`
                : `Please wait here. Dr. ${otherUserName} will join shortly. Ensure your camera and mic are ready.`}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {isDoctor ? (
                <button
                  onClick={initiateCall}
                  style={{ padding: "18px 36px", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 10px 25px rgba(16,185,129,.4)", transition: "all .3s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <Video size={20} /> Start Secure Call
                </button>
              ) : (
                <div className="vc-glass" style={{ padding: "16px 24px", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", animation: "vc-pulse 2s infinite" }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>Waiting for Host to Join…</span>
                </div>
              )}
              {isMobilePwa && !mediaReady && (
                <button
                  onClick={requestMediaAccess}
                  disabled={isRequestingMedia}
                  style={{
                    padding: "16px 24px",
                    background: isRequestingMedia ? "rgba(16,185,129,.55)" : "linear-gradient(135deg,#10b981,#059669)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 16,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: isRequestingMedia ? "wait" : "pointer",
                    boxShadow: "0 10px 25px rgba(16,185,129,.35)",
                  }}
                >
                  {isRequestingMedia ? "Requesting Access..." : "Enable Camera & Mic"}
                </button>
              )}
              <button
                onClick={() => onCallEnd?.()}
                style={{ padding: 16, background: "rgba(255,255,255,.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,.05)", borderRadius: 16, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Exit Waiting Room
              </button>
            </div>
            <div style={{ marginTop: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 24, opacity: .5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><ShieldCheck size={14} /> End-to-End Encrypted</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><Video size={14} /> HD Quality Enabled</div>
            </div>
          </div>
        )}

        {/* CONNECTING — patient in waiting room, ICE running in background */}
        {callState === "connecting" && (
          <div style={{ textAlign: "center", animation: "vc-slide-up .5s ease" }}>
            <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 40px" }}>
              <div style={{ position: "absolute", inset: -20, borderRadius: "50%", border: "2px solid rgba(16,185,129,.4)", animation: "vc-ring 1.8s cubic-bezier(0,0,.2,1) infinite" }} />
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "linear-gradient(135deg,#1e293b,#0f172a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 50px rgba(0,0,0,.5)", border: "1px solid rgba(255,255,255,.08)", fontSize: 48, fontWeight: 700, color: "#10b981" }}>
                {otherUserName?.charAt(0)?.toUpperCase()}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
              <Loader size={16} color="#10b981" style={{ animation: "vc-spin 1s linear infinite" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "2px" }}>Connecting…</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f8fafc", marginBottom: 8 }}>{otherUserName}</h1>
            <p style={{ fontSize: 14, color: "#94a3b8" }}>Setting up your secure consultation</p>
          </div>
        )}

        {/* RINGING */}
        {callState === "ringing" && (
          <div style={{ textAlign: "center", animation: "vc-slide-up .5s ease" }}>
            <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 40px" }}>
              <div style={{ position: "absolute", inset: -20, borderRadius: "50%", border: "2px solid #10b981", animation: "vc-ring 2s cubic-bezier(0,0,.2,1) infinite" }} />
              <div style={{ position: "absolute", inset: -40, borderRadius: "50%", border: "1px solid rgba(16,185,129,.3)", animation: "vc-ring 2.5s cubic-bezier(0,0,.2,1) .5s infinite" }} />
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 30px 60px rgba(16,185,129,.4)", position: "relative", zIndex: 2, fontSize: 56, fontWeight: 800, color: "#fff" }}>
                {otherUserName?.charAt(0)?.toUpperCase()}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>
              {isDoctor ? "Calling Patient…" : "Incoming Call…"}
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: "#f8fafc", marginBottom: 40 }}>{otherUserName}</h1>
            <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
              {!isDoctor ? (
                <>
                  <button onClick={rejectCall} style={{ width: 72, height: 72, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 10px 25px rgba(239,68,68,.4)", transition: "all .2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>
                    <PhoneOff size={28} />
                  </button>
                  <button onClick={acceptCall} style={{ width: 72, height: 72, borderRadius: "50%", background: "#10b981", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 10px 25px rgba(16,185,129,.4)", transition: "all .2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>
                    <Phone size={28} style={{ animation: "vc-float 1s infinite" }} />
                  </button>
                </>
              ) : (
                <button onClick={endCall} style={{ padding: "16px 32px", background: "rgba(239,68,68,.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,.2)", borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <PhoneOff size={20} /> Cancel Call
                </button>
              )}
            </div>
          </div>
        )}

        {/* ENDED */}
        {callState === "ended" && (
          <div style={{ textAlign: "center", animation: "vc-slide-up .5s ease" }}>
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
              <PhoneOff size={40} color="#94a3b8" />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f8fafc", marginBottom: 12 }}>Consultation Ended</h1>
            <p style={{ fontSize: 16, color: "#94a3b8", marginBottom: 32 }}>Your session with {otherUserName} has concluded safely.</p>
            <div className="vc-glass" style={{ padding: "24px 32px", borderRadius: 24, display: "inline-flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
                <span style={{ fontSize: 14, color: "#94a3b8" }}>Duration</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", fontFamily: "monospace" }}>{formatDuration(callDuration)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
                <span style={{ fontSize: 14, color: "#94a3b8" }}>Connection</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#10b981", display: "flex", alignItems: "center", gap: 6 }}><ShieldCheck size={16} /> Secure</span>
              </div>
              <button onClick={() => onCallEnd?.()} style={{ marginTop: 8, padding: "14px 32px", background: "#f8fafc", color: "#020617", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all .2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      {isCallActive && (
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 100, display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", borderRadius: 24, background: "rgba(15,23,42,.75)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 25px 50px -12px rgba(0,0,0,.5)" }}>
          <button onClick={toggleAudio} style={ctrlBtn(isAudioOn, false)} title={isAudioOn ? "Mute" : "Unmute"}>
            {isAudioOn ? <Mic size={22} /> : <MicOff size={22} color="#fff" />}
          </button>
          <button onClick={toggleVideo} style={ctrlBtn(isVideoOn, false)} title={isVideoOn ? "Stop Video" : "Start Video"}>
            {isVideoOn ? <Video size={22} /> : <VideoOff size={22} color="#fff" />}
          </button>
          <div style={{ width: 1, height: 32, background: "rgba(255,255,255,.1)", margin: "0 8px" }} />
          <button onClick={endCall} style={ctrlBtn(true, true)} title="End Consultation">
            <PhoneOff size={24} />
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoCall;
