const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['earning', 'withdrawal'], required: true },
  amount:    { type: Number, required: true },
  status:    { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  description: { type: String },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // Reference to Appointment or HealthRecord if needed
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
