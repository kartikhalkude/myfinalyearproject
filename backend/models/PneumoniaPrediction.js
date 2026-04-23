const mongoose = require('mongoose');

const pneumoniaPredictionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename:    { type: String },
  filesize:    { type: Number },
  mimetype:    { type: String },
  prediction:  { type: String },  // 'NORMAL' or 'PNEUMONIA'
  probability: { type: Number },
  risk:        { type: String },  // 'Low Risk', 'Moderate Risk', 'High Risk'
  modelSource: { type: String },  // 'pytorch' or 'heuristic'
  warning:     { type: String },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('PneumoniaPrediction', pneumoniaPredictionSchema);