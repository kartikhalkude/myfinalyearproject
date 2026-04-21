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
  PhoneCall,
  Users,
  Minimize2,
  Maximize2,
  AlertCircle,
  X
} from "lucide-react";

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
  const [debugInfo, setDebugInfo] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [isPipMinimized, setIsPipMinimized] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const handlersRef = useRef({});
  const iceCandidateQueueRef = useRef([]);
  const incomingCallProcessedRef = useRef(false);

  const iceServers = {
    iceServers: [
      {
        urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
      },
    ],
  };

  const addDebugInfo = (msg) => {
    console.log("[DEBUG]", msg);
    setDebugInfo((prev) => prev + "\n" + msg);
  };

  const initializeMedia = async () => {
    try {
      addDebugInfo("Requesting media access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      addDebugInfo(
        `✓ Media stream acquired. Video: ${stream.getVideoTracks().length}, Audio: ${stream.getAudioTracks().length}`,
      );

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        addDebugInfo("Setting local video stream on ref...");
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch((e) => addDebugInfo("⚠ Local video play error: " + e.message));
        addDebugInfo("✓ Local video stream set");
      } else {
        addDebugInfo("Local video ref not ready yet, will be set when call becomes active.");
      }

      return stream;
    } catch (error) {
      const errorMsg = "Failed to access camera/microphone: " + error.message;
      addDebugInfo("✗ " + errorMsg);
      setError(errorMsg);
      return null;
    }
  };

  const createPeerConnection = async (stream) => {
    try {
      addDebugInfo("Creating RTCPeerConnection...");
      const peerConnection = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = peerConnection;

      if (stream) {
        stream.getTracks().forEach((track, index) => {
          addDebugInfo(`Adding ${track.kind} track (${index})`);
          peerConnection.addTrack(track, stream);
        });
      }

      peerConnection.ontrack = (event) => {
        addDebugInfo(
          `✓ Remote track received: ${event.track.kind}, streams: ${event.streams.length}`,
        );

        try {
          if (event.streams && event.streams.length > 0) {
            const remoteStream = event.streams[0];
            addDebugInfo(
              `Stream available with ${remoteStream.getTracks().length} tracks`,
            );

            remoteStreamRef.current = remoteStream;
            if (remoteVideoRef.current) {
              addDebugInfo(`Setting remote video stream on ref`);
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play().catch((e) => addDebugInfo("⚠ Play error: " + e.message));
            } else {
              addDebugInfo("Remote video ref not ready yet, will be set when call becomes active.");
            }
          } else {
            addDebugInfo("⚠ No streams in ontrack event");
          }
        } catch (err) {
          addDebugInfo("✗ Error in ontrack handler: " + err.message);
        }
      };

      peerConnection.onconnectionstatechange = () => {
        addDebugInfo(
          `Connection state changed: ${peerConnection.connectionState}`,
        );
        if (
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "disconnected"
        ) {
          addDebugInfo("✗ Connection failed or disconnected");
          setError("Connection lost");
          endCall();
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        addDebugInfo(
          `ICE connection state: ${peerConnection.iceConnectionState}`,
        );
      };

      peerConnection.onicegatheringstatechange = () => {
        addDebugInfo(
          `ICE gathering state: ${peerConnection.iceGatheringState}`,
        );
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          addDebugInfo(
            `Sending ICE candidate: ${event.candidate.candidate.substring(0, 50)}...`,
          );
          websocketService.emit("call:ice-candidate", {
            appointmentId,
            candidate: event.candidate,
            senderId: user.id,
          });
        } else {
          addDebugInfo("✓ All ICE candidates sent");
        }
      };

      addDebugInfo(
        `Processing ${iceCandidateQueueRef.current.length} queued ICE candidates`,
      );
      while (iceCandidateQueueRef.current.length > 0) {
        const queuedCandidate = iceCandidateQueueRef.current.shift();
        try {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(queuedCandidate),
          );
          addDebugInfo(`✓ Added queued ICE candidate`);
        } catch (error) {
          addDebugInfo(`⚠ Failed to add queued candidate: ${error.message}`);
        }
      }

      return peerConnection;
    } catch (error) {
      const errorMsg = "Failed to create peer connection: " + error.message;
      addDebugInfo("✗ " + errorMsg);
      setError(errorMsg);
      return null;
    }
  };

  const initiateCall = async () => {
    try {
      addDebugInfo(`>>> Initiating call to ${otherUserName} (${otherUserId})`);
      setCallState("ringing");

      const stream = await initializeMedia();
      if (!stream) {
        addDebugInfo("✗ Failed to get local media");
        return;
      }

      const peerConnection = await createPeerConnection(stream);
      if (!peerConnection) {
        addDebugInfo("✗ Failed to create peer connection");
        return;
      }

      addDebugInfo("Creating offer...");
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      addDebugInfo("Setting local description...");
      await peerConnection.setLocalDescription(offer);

      addDebugInfo(`Sending call:initiate event to ${otherUserId}`);
      websocketService.emit("call:initiate", {
        appointmentId,
        callerId: user.id,
        callerName: user.name,
        receiverId: otherUserId,
        offer: offer,
      });

      addDebugInfo("✓ Offer sent, waiting for answer...");
    } catch (error) {
      const errorMsg = "Failed to initiate call: " + error.message;
      addDebugInfo("✗ " + errorMsg);
      setError(errorMsg);
    }
  };

  const handleIncomingCall = async (data) => {
    try {
      addDebugInfo(
        `>>> Received incoming call from ${data.callerName} (${data.callerId})`,
      );
      const { offer } = data;
      setCallState("ringing");

      const stream = await initializeMedia();
      if (!stream) {
        addDebugInfo("✗ Failed to get local media");
        return;
      }

      const peerConnection = await createPeerConnection(stream);
      if (!peerConnection) {
        addDebugInfo("✗ Failed to create peer connection");
        return;
      }

      addDebugInfo("Setting remote description from offer...");
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer),
      );

      addDebugInfo("Creating answer...");
      const answer = await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      addDebugInfo("Setting local description for answer...");
      await peerConnection.setLocalDescription(answer);

      addDebugInfo(`Sending call:answer event`);
      websocketService.emit("call:answer", {
        appointmentId,
        answer: answer,
      });

      addDebugInfo("✓ Answer sent");
    } catch (error) {
      const errorMsg = "Failed to handle incoming call: " + error.message;
      addDebugInfo("✗ " + errorMsg);
      setError(errorMsg);
    }
  };

  const handleCallAnswered = async (data) => {
    try {
      addDebugInfo(">>> Received call answered event");
      const { answer } = data;

      if (!peerConnectionRef.current) {
        addDebugInfo("✗ No peer connection exists");
        return;
      }

      addDebugInfo("Setting remote description from answer...");
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer),
      );

      addDebugInfo("✓ Answer processed - transitioning to active state");
      setCallState("active");
      addDebugInfo("✓ Call state set to active");
      startCallTimer();
    } catch (error) {
      const errorMsg = "Failed to process answer: " + error.message;
      addDebugInfo("✗ " + errorMsg);
      setError(errorMsg);
    }
  };

  const handleICECandidate = async (data) => {
    try {
      const { candidate } = data;

      if (!peerConnectionRef.current) {
        addDebugInfo(`Queueing ICE candidate (peer connection not ready yet)`);
        iceCandidateQueueRef.current.push(candidate);
        return;
      }

      if (candidate) {
        addDebugInfo(
          `Adding ICE candidate: ${candidate.candidate.substring(0, 50)}...`,
        );
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
      }
    } catch (error) {
      addDebugInfo("⚠ ICE candidate error: " + error.message);
    }
  };

  const acceptCall = async () => {
    addDebugInfo(">>> User accepted call - transitioning to active state");
    setCallState("active");
    addDebugInfo("✓ Call state set to active");
    startCallTimer();
  };

  const rejectCall = () => {
    addDebugInfo(">>> User rejected call");
    websocketService.emit("call:reject", {
      appointmentId,
      userId: user.id,
    });
    cleanup();
    setCallState("idle");
  };

  const endCall = () => {
    addDebugInfo(">>> Ending call");
    websocketService.emit("call:end", {
      appointmentId,
      userId: user.id,
    });
    cleanup();
    setCallState("ended");
    if (onCallEnd) {
      setTimeout(onCallEnd, 1000);
    }
  };

  const handleCallEnded = () => {
    addDebugInfo(">>> Remote user ended call");
    cleanup();
    setCallState("ended");
  };

  const cleanup = () => {
    addDebugInfo("Cleaning up resources...");

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        addDebugInfo(`Stopped ${track.kind} track`);
      });
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      addDebugInfo("Peer connection closed");
    }
  };

  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
        addDebugInfo(`Audio ${audioTrack.enabled ? "enabled" : "disabled"}`);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
        addDebugInfo(`Video ${videoTrack.enabled ? "enabled" : "disabled"}`);
      }
    }
  };

  useEffect(() => {
    addDebugInfo(
      `Setting up WebSocket listeners (User: ${user.id}, Role: ${isDoctor ? "Doctor" : "Patient"})`,
    );

    const handleIncomingCallWrapper = (data) => handleIncomingCall(data);
    const handleCallAnsweredWrapper = (data) => handleCallAnswered(data);
    const handleICECandidateWrapper = (data) => handleICECandidate(data);
    const handleCallEndedWrapper = () => handleCallEnded();
    const handleCallRejectedWrapper = () => {
      addDebugInfo("✗ Call was rejected");
      setError("Call was rejected");
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
      addDebugInfo("WebSocket listeners removed");
    };
  }, [user.id, appointmentId, otherUserId, isDoctor]);

  useEffect(() => {
    if (incomingCallData && !incomingCallProcessedRef.current && !isDoctor) {
      addDebugInfo(
        ">>> Auto-handling incoming call from notification acceptance",
      );
      incomingCallProcessedRef.current = true;
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
      addDebugInfo(">>> Auto-accepting call (peer connection ready)");
      const timer = setTimeout(() => {
        acceptCall();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [incomingCallData, callState, isDoctor]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (callState === "active") {
      if (localStreamRef.current && localVideoRef.current) {
        addDebugInfo("Call is active - ensuring local video stream is set...");
        if (localVideoRef.current.srcObject !== localStreamRef.current) {
          addDebugInfo("Setting local video stream (was not set)...");
          localVideoRef.current.srcObject = localStreamRef.current;
          localVideoRef.current.play().catch((e) => addDebugInfo("⚠ Local video play error on active: " + e.message));
        } else {
          addDebugInfo("✓ Local video stream already set");
        }
      }
      if (remoteStreamRef.current && remoteVideoRef.current) {
        addDebugInfo("Call is active - ensuring remote video stream is set...");
        if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          addDebugInfo("Setting remote video stream (was not set)...");
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.play().catch((e) => addDebugInfo("⚠ Remote video play error on active: " + e.message));
        } else {
          addDebugInfo("✓ Remote video stream already set");
        }
      }
    }
  }, [callState]);

  const containerStyle = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    zIndex: 50, fontFamily: "'DM Sans', sans-serif"
  };

  const btnStyle = {
    padding: "16px 32px", borderRadius: 16, display: "flex", alignItems: "center", gap: 12,
    fontSize: 16, fontWeight: 600, color: "#fff", cursor: "pointer", border: "none", transition: "all 0.2s ease"
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes pulseRing { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
        @keyframes fadeInZoom { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* Error Banner */}
      {error && (
        <div style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60 }}>
          <div style={{ background: "#ef4444", color: "#fff", padding: "16px 24px", borderRadius: 16, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
            <div style={{ background: "rgba(255,255,255,0.2)", padding: 8, borderRadius: "50%" }}>
              <AlertCircle style={{ width: 20, height: 20 }} />
            </div>
            <span style={{ fontWeight: 500 }}>{error}</span>
            <button onClick={() => setError("")} style={{ background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", marginLeft: 12 }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Close Button for Idle / Ringing state */}
      {(callState === "idle" || callState === "ringing") && (
        <button
          onClick={() => {
            if (callState === "idle") {
              if (onCallEnd) onCallEnd();
            } else if (callState === "ringing") {
              if (isDoctor) endCall();
              else rejectCall();
            }
          }}
          style={{ position: "absolute", top: 24, left: 24, background: "rgba(30, 41, 59, 0.5)", color: "#cbd5e1", padding: 12, borderRadius: "50%", border: "none", cursor: "pointer", zIndex: 60, backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.8)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(30, 41, 59, 0.5)"; e.currentTarget.style.color = "#cbd5e1"; }}
          title="Close window"
        >
          <X style={{ width: 24, height: 24 }} />
        </button>
      )}

      {/* Debug Toggle Button */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        style={{ position: "absolute", top: 24, right: 24, background: "rgba(30, 41, 59, 0.5)", color: "#cbd5e1", padding: 12, borderRadius: "50%", border: "none", cursor: "pointer", zIndex: 60, backdropFilter: "blur(4px)" }}
        title="Toggle debug info"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
      </button>

      {/* Debug Info Panel */}
      {showDebug && (
        <div style={{ position: "absolute", top: 80, right: 24, background: "rgba(15, 23, 42, 0.95)", color: "#cbd5e1", padding: 16, borderRadius: 16, maxWidth: 384, maxHeight: 384, overflowY: "auto", fontSize: 12, fontFamily: "monospace", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", zIndex: 55, border: "1px solid #334155" }}>
          <div style={{ fontWeight: 700, color: "#60a5fa", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Debug Console</span>
            <div style={{ width: 8, height: 8, background: "#4ade80", borderRadius: "50%" }}></div>
          </div>
          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{debugInfo}</div>
        </div>
      )}

      {/* Idle State */}
      {callState === "idle" && (
        <div style={{ textAlign: "center", animation: "fadeInZoom 0.5s ease" }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ width: 128, height: 128, background: "linear-gradient(135deg, #3b82f6, #2563eb)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
              <Users style={{ width: 64, height: 64, color: "#fff" }} />
            </div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              Ready to Connect
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "1.125rem" }}>Start a video call with</p>
            <p style={{ color: "#60a5fa", fontSize: "1.5rem", fontWeight: 600, marginTop: 8 }}>
              {otherUserName}
            </p>
          </div>
          {isDoctor && (
            <button
              onClick={initiateCall}
              style={{ ...btnStyle, background: "linear-gradient(to right, #22c55e, #16a34a)", margin: "0 auto", boxShadow: "0 20px 25px -5px rgba(34, 197, 94, 0.4)" }}
            >
              <div style={{ background: "rgba(255,255,255,0.2)", padding: 8, borderRadius: "50%" }}>
                <Video style={{ width: 24, height: 24 }} />
              </div>
              <span>Start Video Call</span>
            </button>
          )}
          {!isDoctor && (
            <p style={{ color: "#64748b", fontSize: "1.125rem" }}>
              Waiting for doctor to initiate call...
            </p>
          )}
        </div>
      )}

      {/* Ringing State - Incoming (Patient) */}
      {callState === "ringing" && !isDoctor && (
        <div style={{ textAlign: "center", animation: "fadeInZoom 0.5s ease" }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 24px" }}>
              <div style={{ position: "absolute", inset: 0, background: "#3b82f6", borderRadius: "50%", animation: "pulseRing 2s infinite" }}></div>
              <div style={{ position: "relative", width: 160, height: 160, background: "linear-gradient(135deg, #3b82f6, #2563eb)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
                <PhoneCall style={{ width: 80, height: 80, color: "#fff" }} />
              </div>
            </div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              Incoming Call
            </h2>
            <p style={{ color: "#60a5fa", fontSize: "1.5rem", fontWeight: 600, marginTop: 8 }}>
              {otherUserName}
            </p>
            <p style={{ color: "#94a3b8", marginTop: 4 }}>wants to video call with you</p>
          </div>
          <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
            <button
              onClick={acceptCall}
              style={{ ...btnStyle, background: "linear-gradient(to right, #22c55e, #16a34a)", boxShadow: "0 20px 25px -5px rgba(34, 197, 94, 0.4)" }}
            >
              <div style={{ background: "rgba(255,255,255,0.2)", padding: 8, borderRadius: "50%" }}>
                <Phone style={{ width: 24, height: 24 }} />
              </div>
              <span>Accept</span>
            </button>
            <button
              onClick={rejectCall}
              style={{ ...btnStyle, background: "linear-gradient(to right, #ef4444, #dc2626)", boxShadow: "0 20px 25px -5px rgba(239, 68, 68, 0.4)" }}
            >
              <div style={{ background: "rgba(255,255,255,0.2)", padding: 8, borderRadius: "50%" }}>
                <PhoneOff style={{ width: 24, height: 24 }} />
              </div>
              <span>Decline</span>
            </button>
          </div>
        </div>
      )}

      {/* Ringing State - Outgoing (Doctor) */}
      {callState === "ringing" && isDoctor && (
        <div style={{ textAlign: "center", animation: "fadeInZoom 0.5s ease" }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 24px" }}>
              <div style={{ position: "absolute", inset: 0, background: "#3b82f6", borderRadius: "50%", animation: "pulseRing 2s infinite" }}></div>
              <div style={{ position: "relative", width: 160, height: 160, background: "linear-gradient(135deg, #3b82f6, #2563eb)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
                <PhoneCall style={{ width: 80, height: 80, color: "#fff" }} />
              </div>
            </div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              Calling...
            </h2>
            <p style={{ color: "#60a5fa", fontSize: "1.5rem", fontWeight: 600, marginTop: 8 }}>
              {otherUserName}
            </p>
            <p style={{ color: "#94a3b8", marginTop: 4 }}>Waiting for answer...</p>
          </div>
          <button
            onClick={endCall}
            style={{ ...btnStyle, background: "linear-gradient(to right, #ef4444, #dc2626)", margin: "0 auto", boxShadow: "0 20px 25px -5px rgba(239, 68, 68, 0.4)" }}
          >
            <div style={{ background: "rgba(255,255,255,0.2)", padding: 8, borderRadius: "50%" }}>
              <PhoneOff style={{ width: 24, height: 24 }} />
            </div>
            <span>Cancel Call</span>
          </button>
        </div>
      )}

      {/* Active Call State */}
      {callState === "active" && (
        <div style={{ width: "100%", height: "100%", position: "relative", background: "#000" }}>
          <video
            key="remote-video"
            ref={remoteVideoRef}
            autoPlay={true}
            playsInline={true}
            muted={false}
            controls={false}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />

          {/* Connection indicator */}
          <div style={{ position: "absolute", top: 24, left: 24, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", padding: "8px 16px", borderRadius: 999, display: "flex", alignItems: "center", gap: 8, zIndex: 10 }}>
            <div style={{ width: 8, height: 8, background: "#4ade80", borderRadius: "50%" }}></div>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>Connected</span>
          </div>

          {/* Participant name */}
          <div style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", padding: "8px 24px", borderRadius: 999, zIndex: 10 }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{otherUserName}</span>
          </div>

          {/* Local video (PIP) */}
          <div style={{ position: "absolute", bottom: isPipMinimized ? 24 : 128, right: 32, zIndex: 10, transition: "all 0.3s" }}>
            <div style={{ position: "relative", group: "pip" }}>
              <video
                key="local-video"
                ref={localVideoRef}
                autoPlay={true}
                playsInline={true}
                muted={true}
                controls={false}
                style={{ background: "#0f172a", borderRadius: 16, overflow: "hidden", border: "2px solid #fff", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", objectFit: "cover", transition: "all 0.3s", width: isPipMinimized ? 128 : 256, height: isPipMinimized ? 96 : 192 }}
              />
              <button
                onClick={() => setIsPipMinimized(!isPipMinimized)}
                style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", padding: 6, borderRadius: 8, border: "none", cursor: "pointer", zIndex: 20 }}
              >
                {isPipMinimized ? <Maximize2 style={{ width: 16, height: 16 }} /> : <Minimize2 style={{ width: 16, height: 16 }} />}
              </button>
              <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 6, zIndex: 20 }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>You</span>
              </div>
            </div>
          </div>

          {/* Call controls */}
          <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 20 }}>
            <div style={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(16px)", padding: "24px 32px", borderRadius: 24, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", border: "1px solid #334155", display: "flex", alignItems: "center", gap: 24 }}>
              
              {/* Timer */}
              <div style={{ background: "#1e293b", padding: "12px 24px", borderRadius: 16, minWidth: 112, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, background: "#ef4444", borderRadius: "50%" }}></div>
                <span style={{ color: "#fff", fontSize: 20, fontWeight: 700, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                  {formatDuration(callDuration)}
                </span>
              </div>

              {/* Audio Toggle */}
              <button
                onClick={toggleAudio}
                style={{ padding: 16, borderRadius: 16, border: "none", cursor: "pointer", transition: "all 0.2s", background: isAudioOn ? "#334155" : "#ef4444" }}
                title={isAudioOn ? "Mute audio" : "Unmute audio"}
              >
                {isAudioOn ? <Mic style={{ width: 24, height: 24, color: "#fff" }} /> : <MicOff style={{ width: 24, height: 24, color: "#fff" }} />}
              </button>

              {/* Video Toggle */}
              <button
                onClick={toggleVideo}
                style={{ padding: 16, borderRadius: 16, border: "none", cursor: "pointer", transition: "all 0.2s", background: isVideoOn ? "#334155" : "#ef4444" }}
                title={isVideoOn ? "Turn off video" : "Turn on video"}
              >
                {isVideoOn ? <Video style={{ width: 24, height: 24, color: "#fff" }} /> : <VideoOff style={{ width: 24, height: 24, color: "#fff" }} />}
              </button>

              {/* End Call */}
              <button
                onClick={endCall}
                style={{ padding: 16, borderRadius: 16, border: "none", cursor: "pointer", transition: "all 0.2s", background: "linear-gradient(to right, #ef4444, #dc2626)", boxShadow: "0 10px 15px -3px rgba(239, 68, 68, 0.3)" }}
                title="End call"
              >
                <PhoneOff style={{ width: 24, height: 24, color: "#fff" }} />
              </button>
            </div>
          </div>

          {!isVideoOn && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 5 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 96, height: 96, background: "#334155", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <VideoOff style={{ width: 48, height: 48, color: "#94a3b8" }} />
                </div>
                <p style={{ color: "#fff", fontSize: 18, fontWeight: 500 }}>Your camera is off</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ended State */}
      {callState === "ended" && (
        <div style={{ textAlign: "center", animation: "fadeInZoom 0.5s ease" }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ width: 128, height: 128, background: "linear-gradient(135deg, #334155, #1e293b)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
              <PhoneOff style={{ width: 64, height: 64, color: "#94a3b8" }} />
            </div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 700, color: "#fff", marginBottom: 16 }}>Call Ended</h2>
            <div style={{ background: "rgba(30,41,59,0.5)", backdropFilter: "blur(4px)", padding: "12px 24px", borderRadius: 16, display: "inline-block", marginBottom: 8 }}>
              <p style={{ color: "#cbd5e1", fontSize: 14 }}>Call Duration</p>
              <p style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700, fontFamily: "monospace" }}>
                {formatDuration(callDuration)}
              </p>
            </div>
            <p style={{ color: "#94a3b8", marginTop: 16 }}>Thank you for using Dr.AssistAI</p>
          </div>
          <button
            onClick={() => onCallEnd && onCallEnd()}
            style={{ ...btnStyle, background: "linear-gradient(to right, #3b82f6, #2563eb)", margin: "0 auto", boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.4)" }}
          >
            <span>Close</span>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoCall;
