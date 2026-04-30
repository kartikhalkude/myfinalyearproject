const Message = require('../models/Message');

const getMessages = async (req, res) => {
  try {
    const { appointmentId } = req.query;
    if (!appointmentId) return res.status(400).json({ error: 'Missing appointmentId' });

    const messages = await Message.find({ appointmentId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { appointmentId, receiverId, content } = req.body;
    if (!appointmentId || !receiverId || !content) return res.status(400).json({ error: 'Missing fields' });

    // Ensure there is an active, confirmed appointment between the two
    const Appointment = require('../models/Appointment');
    const activeAppt = await Appointment.findOne({
      _id: appointmentId,
      status: 'confirmed'
    });

    if (!activeAppt) {
      return res.status(403).json({ error: 'You can only message during an active, confirmed appointment.' });
    }

    const message = await new Message({
      appointmentId,
      sender: req.userId,
      receiver: receiverId,
      content,
      isRead: false
    }).save();

    const User = require('../models/User');
    const senderObj = await User.findById(req.userId);
    const messageData = message.toObject();
    messageData.senderName = senderObj ? senderObj.name : "User";

    // In a real app we would use Socket.io here to emit to the receiver, 
    // but the websocket is abstracted in socket.js. We'll handle it there or via an imported func.
    const { getIo } = require('../socket');
    const io = getIo();
    if (io) {
      // Find the receiver's socket. In our simple setup, sockets join a room with their userId
      io.to(`user:${receiverId}`).emit('chat:message', messageData);
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    await Message.updateMany(
      { appointmentId, receiver: req.userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

module.exports = { getMessages, sendMessage, markAsRead };
