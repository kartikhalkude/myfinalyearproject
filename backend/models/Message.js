const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:  { type: String, required: true },
  isRead:   { type: Boolean, default: false }, // Use isRead consistently
  createdAt:{ type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
