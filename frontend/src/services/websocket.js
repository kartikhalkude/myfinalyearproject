// frontend/src/services/websocket.js
import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    // Internal lifecycle listeners (ws:connected, etc.)
    this._internalListeners = {};
    
    // Persistent map of socket.io event listeners
    // Format: { eventName: [callback1, callback2, ...] }
    this._socketListeners = {};
  }

  // ─── Internal EventEmitter ────────────────────────────────────────────────

  _emitInternal(event, data) {
    (this._internalListeners[event] || []).forEach((cb) => cb(data));
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  connect(url = 'http://localhost:5000') {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    // If socket exists but disconnected, just connect it
    if (this.socket) {
      this.socket.connect();
      return;
    }

    try {
      this.socket = io(url, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      this._setupLifecycleListeners();
      this._attachPersistentListeners();

    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  _setupLifecycleListeners() {
    this.socket.on('connect', () => {
      console.log('✓ WebSocket connected:', this.socket.id);
      this.reconnectAttempts = 0;
      this._emitInternal('ws:connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('✗ WebSocket disconnected:', reason);
      this._emitInternal('ws:disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.error(`✗ WebSocket connection error (attempt ${this.reconnectAttempts}):`, error.message);
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this._emitInternal('ws:reconnect-failed');
      }
    });
  }

  _attachPersistentListeners() {
    Object.keys(this._socketListeners).forEach((event) => {
      this._socketListeners[event].forEach((callback) => {
        this.socket.off(event, callback); // Ensure uniqueness
        this.socket.on(event, callback);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  cleanup() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
    this._internalListeners = {};
    this._socketListeners = {};
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: WebSocket not connected`);
    }
  }

  on(event, callback) {
    if (event.startsWith('ws:')) {
      this._internalListeners[event] = this._internalListeners[event] || [];
      this._internalListeners[event].push(callback);
      return () => this.off(event, callback);
    }

    // Add to persistent storage
    this._socketListeners[event] = this._socketListeners[event] || [];
    this._socketListeners[event].push(callback);

    // If socket is already active, attach immediately
    if (this.socket) {
      this.socket.on(event, callback);
    }

    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (event.startsWith('ws:')) {
      if (callback) {
        this._internalListeners[event] = (this._internalListeners[event] || []).filter((cb) => cb !== callback);
      } else {
        delete this._internalListeners[event];
      }
      return;
    }

    // Remove from persistent storage
    if (callback) {
      this._socketListeners[event] = (this._socketListeners[event] || []).filter((cb) => cb !== callback);
    } else {
      delete this._socketListeners[event];
    }

    // Remove from active socket
    if (this.socket) {
      callback ? this.socket.off(event, callback) : this.socket.off(event);
    }
  }

  notifyOnline(userId) { this.emit('user:online', userId); }
  isConnected() { return this.socket?.connected || false; }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  onAppointmentUpdated(cb) { return this.on('appointment:updated', cb); }
  onCallIncoming(cb)       { return this.on('call:incoming', cb); }
  onCallAnswered(cb)       { return this.on('call:answered', cb); }
  onICECandidate(cb)       { return this.on('call:ice-candidate', cb); }
  onCallRejected(cb)       { return this.on('call:rejected', cb); }
  onCallEnded(cb)          { return this.on('call:ended', cb); }
  onPrescriptionCreated(cb) { return this.on('prescription:created', cb); }
  onPrescriptionUpdated(cb) { return this.on('prescription:updated', cb); }
  onPrescriptionDeleted(cb) { return this.on('prescription:deleted', cb); }
  onHealthRecordCreated(cb) { return this.on('health-record:created', cb); }
  onHealthRecordUpdated(cb) { return this.on('health-record:updated', cb); }
  onHealthRecordDeleted(cb) { return this.on('health-record:deleted', cb); }

  offAppointmentUpdated(cb) { this.off('appointment:updated', cb); }
  offCallIncoming(cb)       { this.off('call:incoming', cb); }
  offCallAnswered(cb)       { this.off('call:answered', cb); }
  offICECandidate(cb)       { this.off('call:ice-candidate', cb); }
  offCallRejected(cb)       { this.off('call:rejected', cb); }
  offCallEnded(cb)          { this.off('call:ended', cb); }
  offPrescriptionCreated(cb) { this.off('prescription:created', cb); }
  offPrescriptionUpdated(cb) { this.off('prescription:updated', cb); }
  offPrescriptionDeleted(cb) { this.off('prescription:deleted', cb); }
  offHealthRecordCreated(cb) { this.off('health-record:created', cb); }
  offHealthRecordUpdated(cb) { this.off('health-record:updated', cb); }
  offHealthRecordDeleted(cb) { this.off('health-record:deleted', cb); }
  
  onChatMessage(cb)          { return this.on('chat:message', cb); }
  offChatMessage(cb)         { this.off('chat:message', cb); }
  
  onSlotBooked(cb)           { return this.on('slot:booked', cb); }
  offSlotBooked(cb)          { this.off('slot:booked', cb); }
  
  onChatCleared(cb)          { return this.on('chat:cleared', cb); }
  offChatCleared(cb)         { this.off('chat:cleared', cb); }

  onAppointmentDeleted(cb)   { return this.on('appointment:deleted', cb); }
  offAppointmentDeleted(cb)  { this.off('appointment:deleted', cb); }
}

export default new WebSocketService();