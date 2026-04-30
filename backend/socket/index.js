const socketIO   = require('socket.io');
const Appointment = require('../models/Appointment');

let io;
const activeCalls = new Map(); // appointmentId -> callData

// ─── Broadcast helper (used by appointment controller) ───────────────────────

const broadcastAppointmentUpdate = async (appointment, eventType, initiatorId = null) => {
  try {
    const populatedApt = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate('doctorId',  'name email specialization');
    if (!populatedApt) return;

    const patientId = populatedApt.patientId._id.toString();
    const doctorId  = populatedApt.doctorId._id.toString();

    const updateData   = { type: eventType, appointment: populatedApt, initiatorId };
    const socketEvent  = eventType === 'created' ? 'appointment:created' : 'appointment:updated';

    // Broadcast to user-specific rooms (handles multiple tabs)
    io.to(`user:${patientId}`).emit(socketEvent, updateData);
    io.to(`user:${doctorId}`).emit(socketEvent, updateData);

    // Global broadcast to update availability UI for anyone looking at this doctor's slots
    if (eventType === 'created') {
      io.emit('slot:booked', { doctorId, date: populatedApt.date, time: populatedApt.time });
    }

    console.log(`✓ Appointment update broadcasted to room user:${patientId} and user:${doctorId}: ${socketEvent}`);
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

  io.on('connection', (socket) => {
    console.log('✓ Client connected:', socket.id);

    socket.on('user:online', (userId) => {
      if (userId) {
        const userIdStr = userId.toString();
        socket.userId = userIdStr; // Store on socket for easy access
        socket.join(`user:${userIdStr}`);
        
        io.emit('user:status', { userId: userIdStr, status: 'online' });
        console.log(`✓ user:${userIdStr} joined their room. Socket: ${socket.id}`);
      }
    });

    socket.on('call:initiate', (data) => {
      const { appointmentId, callerId, callerName, receiverId, offer } = data;
      const receiverRoom = `user:${receiverId}`;
      
      // Check if room has any connected clients
      const roomClients = io.sockets.adapter.rooms.get(receiverRoom);
      
      if (roomClients && roomClients.size > 0) {
        activeCalls.set(appointmentId, { 
          callerId: callerId.toString(), 
          receiverId: receiverId.toString(), 
          startTime: new Date(), 
          status: 'ringing' 
        });
        
        // Emit to all tabs of the receiver
        io.to(receiverRoom).emit('call:incoming', { appointmentId, callerId, callerName, offer });
        console.log(`>>> Call initiated from ${callerId} to ${receiverId} (Room: ${receiverRoom})`);
      } else {
        socket.emit('call:rejected', { appointmentId, reason: 'User is offline' });
        console.log(`✗ Call failed: User ${receiverId} is offline (Room: ${receiverRoom} empty)`);
      }
    });

    socket.on('call:answer', (data) => {
      try {
        const { appointmentId, answer } = data;
        if (!appointmentId) return;

        const callData = activeCalls.get(appointmentId);
        if (callData && callData.callerId) {
          callData.status = 'active';
          // Emit to all tabs of the caller
          io.to(`user:${callData.callerId}`).emit('call:answered', { appointmentId, answer });
          console.log(`>>> Call answered for appointment ${appointmentId}`);
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
        if (callData && callData.callerId && callData.receiverId) {
          const targetUserId = senderId.toString() === callData.callerId.toString()
            ? callData.receiverId : callData.callerId;
          
          // Emit to all tabs of the target user
          io.to(`user:${targetUserId}`).emit('call:ice-candidate', {
            appointmentId,
            candidate: {
              candidate:     candidate.candidate     || candidate,
              sdpMLineIndex: candidate.sdpMLineIndex || 0,
              sdpMid:        candidate.sdpMid        || ''
            }
          });
        }
      } catch (error) {
        console.error('❌ Error in call:ice-candidate:', error);
      }
    });

    socket.on('call:reject', (data) => {
      try {
        const { appointmentId, userId } = data;
        if (!appointmentId || !userId) return;

        const callData = activeCalls.get(appointmentId);
        if (callData) {
          const targetUserId = userId.toString() === callData.callerId.toString()
            ? callData.receiverId : callData.callerId;
          
          io.to(`user:${targetUserId}`).emit('call:rejected', { appointmentId });
          activeCalls.delete(appointmentId);
          console.log(`>>> Call rejected for ${appointmentId}`);
        }
      } catch (error) {
        console.error('Error in call:reject:', error.message);
      }
    });

    socket.on('call:end', (data) => {
      try {
        const { appointmentId, userId } = data;
        if (!appointmentId) return;

        const callData = activeCalls.get(appointmentId);
        if (callData) {
          // Notify both parties (all tabs)
          io.to(`user:${callData.callerId}`).emit('call:ended', { appointmentId });
          io.to(`user:${callData.receiverId}`).emit('call:ended', { appointmentId });
          activeCalls.delete(appointmentId);
          console.log(`>>> Call ended for ${appointmentId}`);
        }
      } catch (error) {
        console.error('Error in call:end:', error.message);
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        const userId = socket.userId;
        const room = `user:${userId}`;
        const roomClients = io.sockets.adapter.rooms.get(room);
        
        // Only broadcast offline if ALL tabs/sockets for this user are gone
        if (!roomClients || roomClients.size === 0) {
          io.emit('user:status', { userId, status: 'offline' });
          console.log(`✗ User ${userId} is now fully offline`);
        } else {
          console.log(`- One socket disconnected for user ${userId}, ${roomClients.size} remaining`);
        }
      }
    });
  });

  return io;
};

module.exports = { initSocket, broadcastAppointmentUpdate, getIo: () => io };