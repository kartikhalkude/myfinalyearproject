const mongoose = require('mongoose');

const brainTumorPredictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String },
  filesize: { type: Number },
  mimetype: { type: String },
  prediction: { type: String, required: true },
  probability: { type: Number, required: true },
  risk: { type: String },
  modelSource: { type: String },
  warning: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BrainTumorPrediction', brainTumorPredictionSchema);
