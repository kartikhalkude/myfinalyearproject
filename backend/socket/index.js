const socketIO   = require('socket.io');
const Appointment = require('../models/Appointment');

let io;
const userSockets = new Map();
const activeCalls = new Map();

// ─── Broadcast helper (used by appointment controller) ───────────────────────

const broadcastAppointmentUpdate = async (appointment, eventType) => {
  try {
    const populatedApt = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate('doctorId',  'name email specialization');
    if (!populatedApt) return;

    const patientSocketId = userSockets.get(populatedApt.patientId._id.toString());
    const doctorSocketId  = userSockets.get(populatedApt.doctorId._id.toString());

    const updateData   = { type: eventType, appointment: populatedApt };
    const socketEvent  = eventType === 'created' ? 'appointment:created' : 'appointment:updated';

    try {
      if (patientSocketId) io.to(patientSocketId).emit(socketEvent, updateData);
    } catch (error) {
      console.error('Error emitting to patient socket:', error.message);
    }

    try {
      if (doctorSocketId) io.to(doctorSocketId).emit(socketEvent, updateData);
    } catch (error) {
      console.error('Error emitting to doctor socket:', error.message);
    }

    console.log(`✓ Appointment update broadcasted: ${socketEvent}`);
  } catch (error) {
    console.error('Error broadcasting appointment update:', error);
  }
};

// ─── Socket initialisation ───────────────────────────────────────────────────

const initSocket = (server, allowedOrigins) => {
  io = socketIO(server, {
    cors: {
      origin:         allowedOrigins,
      credentials:    true,
      methods:        ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  });

  // Handle Socket.IO engine errors
  io.engine.on('connection_error', (error) => {
    console.error('Socket.IO connection error:', error);
  });

  // Handle socket errors globally
  io.on('error', (error) => {
    console.error('Socket.IO error:', error.message);
  });

  io.on('connect_error', (error) => {
    console.error('Socket.IO connect error:', error);
  });

  io.on('connection', (socket) => {
    console.log('✓ Client connected:', socket.id);

    // Error handler for socket to prevent unhandled errors
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error.message);
    });

    // Handle errors on the underlying connection
    if (socket.conn) {
      socket.conn.on('error', (error) => {
        console.error('❌ Socket connection error:', error.message);
      });
      
      // Handle errors on the raw transport socket
      if (socket.conn.transport && socket.conn.transport.socket) {
        socket.conn.transport.socket.on('error', (error) => {
          console.error('❌ Transport socket error:', error.message);
        });
      }
    }

    socket.on('user:online', (userId) => {
      if (userId) {
        userSockets.set(userId.toString(), socket.id);
        if (socket.connected) {
          try {
            io.emit('user:status', { userId, status: 'online' });
          } catch (error) {
            console.error('Error emitting user:status:', error.message);
          }
        }
        console.log('✓ user:online received. userId:', userId, '| type:', typeof userId);
      }
    });

    socket.on('call:initiate', (data) => {
      const { appointmentId, callerId, callerName, receiverId, offer } = data;
      const receiverSocketId = userSockets.get(receiverId.toString());

      if (receiverSocketId) {
        activeCalls.set(appointmentId, { callerId, receiverId, startTime: new Date(), status: 'ringing' });
        try {
          io.to(receiverSocketId).emit('call:incoming', { appointmentId, callerId, callerName, offer });
        } catch (error) {
          console.error('Error emitting call:incoming:', error.message);
        }
      } else {
        try {
          io.to(socket.id).emit('call:rejected', { appointmentId, reason: 'User is offline' });
        } catch (error) {
          console.error('Error emitting call:rejected:', error.message);
        }
      }
    });

    socket.on('call:answer', (data) => {
      try {
        const { appointmentId, answer } = data;
        const callData = activeCalls.get(appointmentId);
        if (callData) {
          callData.status = 'active';
          const callerSocketId = userSockets.get(callData.callerId.toString());
          if (callerSocketId) {
            io.to(callerSocketId).emit('call:answered', { appointmentId, answer });
          }
        }
      } catch (error) {
        console.error('Error in call:answer:', error.message);
      }
    });

    socket.on('call:ice-candidate', (data) => {
      try {
        const { appointmentId, candidate, senderId } = data;
        if (!appointmentId || !candidate || !senderId) return;

        const callData = activeCalls.get(appointmentId);
        if (callData) {
          const receiverId = senderId.toString() === callData.callerId.toString()
            ? callData.receiverId : callData.callerId;
          const receiverSocketId = userSockets.get(receiverId.toString());
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('call:ice-candidate', {
              appointmentId,
              candidate: {
                candidate:     candidate.candidate     || candidate,
                sdpMLineIndex: candidate.sdpMLineIndex || 0,
                sdpMid:        candidate.sdpMid        || ''
              }
            });
          }
        }
      } catch (error) {
        console.error('❌ Error in call:ice-candidate:', error);
      }
    });

    socket.on('call:reject', (data) => {
      try {
        const { appointmentId, userId } = data;
        const callData = activeCalls.get(appointmentId);
        if (callData) {
          const otherUserId  = userId.toString() === callData.callerId.toString()
            ? callData.receiverId : callData.callerId;
          const otherSocketId = userSockets.get(otherUserId.toString());
          if (otherSocketId) io.to(otherSocketId).emit('call:rejected', { appointmentId });
          activeCalls.delete(appointmentId);
        }
      } catch (error) {
        console.error('Error in call:reject:', error.message);
      }
    });

    socket.on('call:end', (data) => {
      try {
        const { appointmentId, userId } = data;
        const callData = activeCalls.get(appointmentId);
        if (callData) {
          const otherUserId   = userId.toString() === callData.callerId.toString()
            ? callData.receiverId : callData.callerId;
          const otherSocketId = userSockets.get(otherUserId.toString());
          if (otherSocketId) io.to(otherSocketId).emit('call:ended', { appointmentId });

          const callerSocketId = userSockets.get(callData.callerId.toString());
          if (callerSocketId && callerSocketId !== otherSocketId) {
            io.to(callerSocketId).emit('call:ended', { appointmentId });
          }
          activeCalls.delete(appointmentId);
        }
      } catch (error) {
        console.error('Error in call:end:', error.message);
      }
    });

    socket.on('disconnect', () => {
      for (let [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          io.emit('user:status', { userId, status: 'offline' });
        }
      }
    });
  });

  return io;
};

module.exports = { initSocket, broadcastAppointmentUpdate, userSockets, getIo: () => io };