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
} from "lucide-react";

// ─── Fetch fresh TURN credentials from Metered at runtime ───────────────────
const fetchIceServers = async () => {
  try {
    const appName = import.meta.env.VITE_METERED_APP_NAME;
    const apiKey = import.meta.env.VITE_METERED_API_KEY;

    if (!appName || !apiKey) throw new Error("Metered credentials missing from env");

    const res = await fetch(
      `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
    );

    if (!res.ok) throw new Error(`Metered API responded with ${res.status}`);

    const iceServers = await res.json();
    console.log("[WebRTC] Fetched ICE servers:", iceServers);
    return { iceServers };
  } catch (e) {
    console.warn("[WebRTC] TURN fetch failed, falling back to STUN only:", e.message);
    return {
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
      ],
    };
  }
};

// ─── Component ───────────────────────────────────────────────────────────────
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
  const [manualIncomingCall, setManualIncomingCall] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const mediaInitializationPromiseRef = useRef(null);
  const handlersRef = useRef({});
  const iceCandidateQueueRef = useRef([]);
  const incomingCallProcessedRef = useRef(false);
  const callStateRef = useRef(callState);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // ─── Media ────────────────────────────────────────────────────────────────
  const initializeMedia = async () => {
    if (localStreamRef.current && localStreamRef.current.active)
      return localStreamRef.current;
    if (mediaInitializationPromiseRef.current)
      return mediaInitializationPromiseRef.current;

    mediaInitializationPromiseRef.current = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => { });
        }
        return stream;
      } catch (err) {
        setError("Failed to access camera/microphone: " + err.message);
        return null;
      } finally {
        mediaInitializationPromiseRef.current = null;
      }
    })();

    return mediaInitializationPromiseRef.current;
  };

  // ─── Peer Connection (fetches TURN credentials each time) ────────────────
  const createPeerConnection = async (stream) => {
    try {
      const iceConfig = await fetchIceServers();
      const peerConnection = new RTCPeerConnection(iceConfig);
      peerConnectionRef.current = peerConnection;

      if (stream) {
        stream.getTracks().forEach((track) =>
          peerConnection.addTrack(track, stream)
        );
      }

      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams.length > 0) {
          const remoteStream = event.streams[0];
          remoteStreamRef.current = remoteStream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(() => { });
          }
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection state:", peerConnection.connectionState);
        if (
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "disconnected"
        ) {
          setError("Connection lost");
          endCall();
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE state:", peerConnection.iceConnectionState);
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          websocketService.emit("call:ice-candidate", {
            appointmentId,
            candidate: event.candidate,
            senderId: user.id,
          });
        }
      };

      return peerConnection;
    } catch (err) {
      setError("Failed to create peer connection: " + err.message);
      return null;
    }
  };

  // ─── ICE Queue ────────────────────────────────────────────────────────────
  const processIceCandidateQueue = async () => {
    if (
      !peerConnectionRef.current ||
      !peerConnectionRef.current.remoteDescription
    )
      return;
    const queue = iceCandidateQueueRef.current;
    if (queue.length === 0) return;
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (!candidate) continue;
      try {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch { }
    }
  };

  // ─── Call Flow ────────────────────────────────────────────────────────────
  const initiateCall = async () => {
    try {
      setCallState("ringing");
      const stream = await initializeMedia();
      if (!stream) return;
      const peerConnection = await createPeerConnection(stream);
      if (!peerConnection) return;

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await peerConnection.setLocalDescription(offer);

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

  const handleIncomingCall = async (data) => {
    try {
      if (data.appointmentId !== appointmentId) return;
      if (incomingCallProcessedRef.current || peerConnectionRef.current) return;
      
      console.log("[VideoCall] Handling incoming call:", data);
      incomingCallProcessedRef.current = true;

      const { offer } = data;
      
      // If we're accepting from a toast (prop) or already in the waiting room (idle),
      // we go to "active" immediately. This mounts the video elements so they're
      // ready when the stream arrives, preventing the "black screen" race condition.
      const shouldAutoAccept = (incomingCallData && data.appointmentId === incomingCallData.appointmentId) || 
                              (callStateRef.current === "idle" && !isDoctor);

      if (shouldAutoAccept) {
        console.log("[VideoCall] Auto-accepting incoming call");
        setCallState("active");
        startCallTimer();
      } else {
        setCallState("ringing");
      }

      const stream = await initializeMedia();
      if (!stream) return;
      const peerConnection = await createPeerConnection(stream);
      if (!peerConnection) return;

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      await processIceCandidateQueue();

      const answer = await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await peerConnection.setLocalDescription(answer);

      console.log("[VideoCall] Sending answer to doctor");
      websocketService.emit("call:answer", { appointmentId, answer });

      // If we were in ringing state, we stay there until the user clicks Accept
      // or the auto-accept timer (for props) kicks in. 
      // If we already set to active above, we're done.
    } catch (err) {
      console.error("[VideoCall] Error in handleIncomingCall:", err);
      setError("Failed to handle incoming call: " + err.message);
      incomingCallProcessedRef.current = false;
    }
  };

  const handleCallAnswered = async (data) => {
    try {
      const { answer } = data;
      if (!peerConnectionRef.current) return;
      if (peerConnectionRef.current.signalingState === "stable") return;

      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      await processIceCandidateQueue();
      setCallState("active");
      startCallTimer();
    } catch (err) {
      setError("Failed to process answer: " + err.message);
    }
  };

  const handleICECandidate = async (data) => {
    try {
      const { candidate } = data;
      if (
        !peerConnectionRef.current ||
        !peerConnectionRef.current.remoteDescription
      ) {
        iceCandidateQueueRef.current.push(candidate);
        return;
      }
      if (candidate) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    } catch { }
  };

  const acceptCall = async () => {
    setCallState("active");
    startCallTimer();
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

  const handleCallEnded = () => {
    cleanup();
    setCallState("ended");
  };

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  const cleanup = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    incomingCallProcessedRef.current = false;
  };

  // ─── Timer ────────────────────────────────────────────────────────────────
  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(
      () => setCallDuration((prev) => prev + 1),
      1000
    );
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0)
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ─── A/V Toggles ─────────────────────────────────────────────────────────
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleIncomingCallWrapper = (data) => handleIncomingCall(data);
    const handleCallAnsweredWrapper = (data) => handleCallAnswered(data);
    const handleICECandidateWrapper = (data) => handleICECandidate(data);
    const handleCallEndedWrapper = () => handleCallEnded();
    const handleCallRejectedWrapper = () => {
      setError("Call was declined");
      cleanup();
      setCallState("idle");
    };

    handlersRef.current = {
      handleIncomingCallWrapper,
      handleCallAnsweredWrapper,
      handleICECandidateWrapper,
      handleCallEndedWrapper,
      handleCallRejectedWrapper,
    };

    websocketService.on("call:incoming", handleIncomingCallWrapper);
    websocketService.on("call:answered", handleCallAnsweredWrapper);
    websocketService.on("call:ice-candidate", handleICECandidateWrapper);
    websocketService.on("call:ended", handleCallEndedWrapper);
    websocketService.on("call:rejected", handleCallRejectedWrapper);

    return () => {
      websocketService.off("call:incoming", handleIncomingCallWrapper);
      websocketService.off("call:answered", handleCallAnsweredWrapper);
      websocketService.off("call:ice-candidate", handleICECandidateWrapper);
      websocketService.off("call:ended", handleCallEndedWrapper);
      websocketService.off("call:rejected", handleCallRejectedWrapper);
    };
  }, [user.id, appointmentId, otherUserId, isDoctor]);

  useEffect(() => {
    if (
      incomingCallData &&
      !incomingCallProcessedRef.current &&
      !isDoctor
    ) {
      handleIncomingCall(incomingCallData);
    }
  }, [incomingCallData, isDoctor]);

  useEffect(() => {
    if (
      incomingCallData &&
      callState === "ringing" &&
      !isDoctor &&
      peerConnectionRef.current
    ) {
      const timer = setTimeout(() => acceptCall(), 500);
      return () => clearTimeout(timer);
    }
  }, [incomingCallData, callState, isDoctor]);

  useEffect(() => {
    return () => cleanup();
  }, []);

  useEffect(() => {
    const attach = () => {
      if (callState === "active") {
        if (localStreamRef.current && localVideoRef.current) {
          if (localVideoRef.current.srcObject !== localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play().catch(() => { });
          }
        }
        if (remoteStreamRef.current && remoteVideoRef.current) {
          if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
            remoteVideoRef.current.play().catch(() => { });
          }
        }
      }
    };
    attach();
    // A secondary check after a short delay to handle any missed race conditions
    const t = setTimeout(attach, 1000);
    return () => clearTimeout(t);
  }, [callState]);

  // ─── Styles ───────────────────────────────────────────────────────────────
  const ctrlBtn = (active, danger) => ({
    width: 52,
    height: 52,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.1)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    background: danger
      ? "linear-gradient(135deg, #ef4444, #b91c1c)"
      : active
        ? "rgba(255,255,255,0.1)"
        : "rgba(239, 68, 68, 0.2)",
    color: danger || !active ? "#fff" : "#cbd5e1",
    boxShadow: danger ? "0 8px 20px rgba(239,68,68,0.3)" : "none",
    backdropFilter: "blur(12px)",
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "#020617",
        color: "#f8fafc",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes vc-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes vc-pulse { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 70% { box-shadow: 0 0 0 20px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }
        @keyframes vc-ring { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16,185,129,0.5); } 50% { transform: scale(1.05); } 100% { transform: scale(1); box-shadow: 0 0 0 30px rgba(16,185,129,0); } }
        @keyframes vc-glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes vc-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .vc-glass { background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
      `}</style>

      {/* Background */}
      <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "40%", height: "40%", background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)", filter: "blur(60px)", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "40%", height: "40%", background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)", filter: "blur(60px)", zIndex: 0 }} />

      {/* Error Notification */}
      {error && (
        <div style={{
          position: "absolute", top: 32, left: "50%", transform: "translateX(-50%)",
          zIndex: 1100, background: "rgba(239, 68, 68, 0.9)", backdropFilter: "blur(8px)",
          borderRadius: 16, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)", animation: "vc-slide-up 0.3s ease",
          minWidth: 320, border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <AlertCircle size={20} color="#fff" />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#fff" }}>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Top Header HUD */}
      <div
        className="vc-glass"
        style={{
          position: "absolute", top: 24, left: 24, right: 24, height: 72,
          borderRadius: 20, zIndex: 50, display: "flex", alignItems: "center",
          padding: "0 24px", justifyContent: "space-between",
          visibility: callState === "active" ? "visible" : "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.2)", padding: "8px 16px", borderRadius: 12 }}>
            <Clock size={16} color="#94a3b8" />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", fontFamily: "monospace", letterSpacing: "1px" }}>
              {formatDuration(callDuration)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8" }}>
            <Users size={18} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>2 Participants</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* IDLE */}
        {callState === "idle" && (
          <div style={{ textAlign: "center", maxWidth: 440, padding: 40, animation: "vc-slide-up 0.6s ease" }}>
            <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 40px" }}>
              <div style={{ position: "absolute", inset: -20, borderRadius: "50%", border: "2px dashed rgba(16,185,129,0.2)" }} />
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: "linear-gradient(135deg, #1e293b, #0f172a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 48, fontWeight: 700, color: "#10b981",
              }}>
                {otherUserName?.charAt(0)?.toUpperCase() || <Users size={48} />}
              </div>
            </div>

            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>
              {isDoctor ? "Ready to Consult?" : "Welcome to the Clinic"}
            </h2>
            <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.6, marginBottom: 40 }}>
              {isDoctor
                ? `Initiate a secure high-definition video call with ${otherUserName} to begin the appointment.`
                : `Please wait here. Dr. ${otherUserName} will join the consultation shortly. Ensure your camera and mic are ready.`}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {isDoctor ? (
                <button
                  onClick={initiateCall}
                  style={{
                    padding: "18px 36px", background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#fff", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 700,
                    cursor: "pointer", boxShadow: "0 10px 25px rgba(16,185,129,0.4)", transition: "all 0.3s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <Video size={20} /> Start Secure Call
                </button>
              ) : (
                <div className="vc-glass" style={{ padding: "16px 24px", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", animation: "vc-pulse 2s infinite" }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>Waiting for Host to Join...</span>
                </div>
              )}

              <button
                onClick={() => onCallEnd && onCallEnd()}
                style={{
                  padding: "16px", background: "rgba(255,255,255,0.05)", color: "#94a3b8",
                  border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, fontSize: 14,
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                Exit Waiting Room
              </button>
            </div>

            <div style={{ marginTop: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 24, opacity: 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <ShieldCheck size={14} /> End-to-End Encrypted
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <Video size={14} /> HD Quality Enabled
              </div>
            </div>
          </div>
        )}

        {/* RINGING */}
        {callState === "ringing" && (
          <div style={{ textAlign: "center", animation: "vc-slide-up 0.5s ease" }}>
            <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 40px" }}>
              <div style={{ position: "absolute", inset: -20, borderRadius: "50%", border: "2px solid #10b981", animation: "vc-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
              <div style={{ position: "absolute", inset: -40, borderRadius: "50%", border: "1px solid rgba(16,185,129,0.3)", animation: "vc-ring 2.5s cubic-bezier(0, 0, 0.2, 1) 0.5s infinite" }} />
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981, #059669)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 30px 60px rgba(16,185,129,0.4)", position: "relative", zIndex: 2,
                fontSize: 56, fontWeight: 800, color: "#fff",
              }}>
                {otherUserName?.charAt(0)?.toUpperCase()}
              </div>
            </div>

            <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>
              {isDoctor ? "Calling Patient..." : "Incoming Call..."}
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: "#f8fafc", marginBottom: 40 }}>{otherUserName}</h1>

            <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
              {!isDoctor ? (
                <>
                  <button
                    onClick={rejectCall}
                    style={{
                      width: 72, height: 72, borderRadius: "50%", background: "#ef4444",
                      color: "#fff", border: "none", display: "flex", alignItems: "center",
                      justifyContent: "center", cursor: "pointer",
                      boxShadow: "0 10px 25px rgba(239,68,68,0.4)", transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    <PhoneOff size={28} />
                  </button>
                  <button
                    onClick={acceptCall}
                    style={{
                      width: 72, height: 72, borderRadius: "50%", background: "#10b981",
                      color: "#fff", border: "none", display: "flex", alignItems: "center",
                      justifyContent: "center", cursor: "pointer",
                      boxShadow: "0 10px 25px rgba(16,185,129,0.4)", transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    <Phone size={28} style={{ animation: "vc-float 1s infinite" }} />
                  </button>
                </>
              ) : (
                <button
                  onClick={endCall}
                  style={{
                    padding: "16px 32px", background: "rgba(239,68,68,0.1)", color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, fontSize: 16,
                    fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                  }}
                >
                  <PhoneOff size={20} /> Cancel Call
                </button>
              )}
            </div>
          </div>
        )}

        {/* ACTIVE CALL */}
        {callState === "active" && (
          <div style={{ position: "absolute", inset: 0, background: "#000" }}>
            {/* Remote video — onClick unblocks autoplay on mobile */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              onClick={(e) => e.target.play()}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />

            {!isVideoOn && (
              <div style={{
                position: "absolute", inset: 0, background: "#020617",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: 20,
              }}>
                <div style={{ width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <VideoOff size={48} color="#475569" />
                </div>
                <div style={{ fontSize: 18, color: "#94a3b8", fontWeight: 500 }}>
                  Participant's camera is off
                </div>
              </div>
            )}

            {/* Local PIP */}
            <div style={{
              position: "absolute",
              bottom: isPipMinimized ? 32 : 120,
              right: 32,
              width: isPipMinimized ? 120 : 280,
              height: isPipMinimized ? 80 : 180,
              borderRadius: 20, overflow: "hidden",
              border: "2px solid rgba(255,255,255,0.15)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              zIndex: 100,
            }}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div style={{ position: "absolute", top: 0, inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 40%)" }} />
              <div style={{ position: "absolute", bottom: 12, left: 12, fontSize: 12, fontWeight: 700, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                You
              </div>
              <button
                onClick={() => setIsPipMinimized(!isPipMinimized)}
                style={{
                  position: "absolute", top: 8, right: 8, width: 28, height: 28,
                  borderRadius: 8, background: "rgba(15,23,42,0.8)", border: "none",
                  color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {isPipMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* ENDED */}
        {callState === "ended" && (
          <div style={{ textAlign: "center", animation: "vc-slide-up 0.5s ease" }}>
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
              <PhoneOff size={40} color="#94a3b8" />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f8fafc", marginBottom: 12 }}>
              Consultation Ended
            </h1>
            <p style={{ fontSize: 16, color: "#94a3b8", marginBottom: 32 }}>
              Your session with {otherUserName} has concluded safely.
            </p>

            <div className="vc-glass" style={{ padding: "24px 32px", borderRadius: 24, display: "inline-flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
                <span style={{ fontSize: 14, color: "#94a3b8" }}>Duration</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", fontFamily: "monospace" }}>
                  {formatDuration(callDuration)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
                <span style={{ fontSize: 14, color: "#94a3b8" }}>Connection</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#10b981", display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={16} /> Secure
                </span>
              </div>
              <button
                onClick={() => onCallEnd && onCallEnd()}
                style={{
                  marginTop: 8, padding: "14px 32px", background: "#f8fafc", color: "#020617",
                  border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      {callState === "active" && (
        <div style={{
          position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
          zIndex: 100, display: "flex", alignItems: "center", gap: 16,
          padding: "16px 24px", borderRadius: 24,
          background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}>
          <button onClick={toggleAudio} style={ctrlBtn(isAudioOn, false)} title={isAudioOn ? "Mute" : "Unmute"}>
            {isAudioOn ? <Mic size={22} /> : <MicOff size={22} color="#fff" />}
          </button>

          <button onClick={toggleVideo} style={ctrlBtn(isVideoOn, false)} title={isVideoOn ? "Stop Video" : "Start Video"}>
            {isVideoOn ? <Video size={22} /> : <VideoOff size={22} color="#fff" />}
          </button>

          <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)", margin: "0 8px" }} />

          <button onClick={endCall} style={ctrlBtn(true, true)} title="End Consultation">
            <PhoneOff size={24} />
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoCall;