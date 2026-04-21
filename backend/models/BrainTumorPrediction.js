const mongoose = require('mongoose');

const brainTumorPredictionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prediction:  String, // 'glioma', 'meningioma', 'notumor', 'pituitary'
  probability: Number,
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('BrainTumorPrediction', brainTumorPredictionSchema);
