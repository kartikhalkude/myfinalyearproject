const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  patientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title:       { type: String, required: true },
  type:        { type: String, default: 'diagnosis' }, // lab_result, diagnosis, vital_signs, imaging, consultation, other
  content:     { type: String, required: true }, // Main findings/content
  severity:    { type: String, enum: ['normal', 'mild', 'moderate', 'severe', 'critical'], default: 'normal' },
  notes:       { type: String }, // Doctor's additional notes
  fileData:    { type: Buffer },   // Binary data of the file
  fileContentType: { type: String }, // MIME type of the file
  fileName:    { type: String }, // Original name of the uploaded file
  date:        { type: Date, default: Date.now },
  readByPatient: { type: Boolean, default: false },
  readByDoctor:  { type: Boolean, default: false },
  // Legacy fields for backward compatibility
  recordType:  { type: String },
  description: { type: String },
  diagnosis:   { type: String },
  vitals:      [{ name: String, value: String, unit: String }],
  fee:         { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('HealthRecord', healthRecordSchema);