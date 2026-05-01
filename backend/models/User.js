const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  email:          { type: String, required: true, unique: true },
  password:       { type: String, required: true },
  role:           { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
  gender:         { type: String, enum: ['male', 'female', 'other'] },
  birthDate:      { type: Date },
  specialization: { type: String },
  phone:          { type: String },
  
  // Doctor specific fields
  licenseNumber:   { type: String },
  licenseFileData: { type: Buffer },
  licenseContentType: { type: String },
  licenseStatus:   { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },

  availability: {
    daysOff: [{ type: Number }], // 0=Sun, 1=Mon, etc.
    startTime: { type: String, default: "09:00" }, // 24hr format
    endTime: { type: String, default: "17:00" },
    slotDuration: { type: Number, default: 30 }, // in minutes
    consultationFee: { type: Number, default: 50 }, // mock payment fee
    withdrawnAmount: { type: Number, default: 0 }
  },
  createdAt:      { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);