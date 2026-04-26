const mongoose                = require('mongoose');
const Appointment            = require('../models/Appointment');
const DiabetesPrediction     = require('../models/DiabetesPrediction');
const HeartDiseasePrediction = require('../models/HeartDiseasePrediction');
const PneumoniaPrediction    = require('../models/PneumoniaPrediction');
const BrainTumorPrediction   = require('../models/BrainTumorPrediction');
const HealthRecord           = require('../models/HealthRecord');
const Prescription         = require('../models/Prescription');

const getStats = async (req, res) => {
  try {
    if (req.userRole === 'patient') {
      const [appointmentCount, diabetesCount, heartCount, pneumoniaCount, tumorCount, upcomingCount, unreadRecords, unreadPrescriptions] = await Promise.all([
        Appointment.countDocuments({ patientId: new mongoose.Types.ObjectId(req.userId) }),
        DiabetesPrediction.countDocuments({ userId: new mongoose.Types.ObjectId(req.userId) }),
        HeartDiseasePrediction.countDocuments({ userId: new mongoose.Types.ObjectId(req.userId) }),
        PneumoniaPrediction.countDocuments({ userId: new mongoose.Types.ObjectId(req.userId) }),
        BrainTumorPrediction.countDocuments({ userId: new mongoose.Types.ObjectId(req.userId) }),
        Appointment.countDocuments({
          patientId: new mongoose.Types.ObjectId(req.userId),
          status: { $in: ['pending', 'confirmed'] },
          date: { $gte: new Date() }
        }),
        HealthRecord.countDocuments({ patientId: new mongoose.Types.ObjectId(req.userId), readByPatient: { $ne: true } }),
        Prescription.countDocuments({ patientId: new mongoose.Types.ObjectId(req.userId), readByPatient: { $ne: true } })
      ]);

      return res.json({
        totalAppointments:       appointmentCount,
        totalPredictions:        diabetesCount + heartCount + pneumoniaCount + tumorCount,
        totalDiabetesPredictions: diabetesCount,
        totalHeartPredictions:   heartCount,
        totalPneumoniaPredictions: pneumoniaCount,
        totalTumorPredictions:   tumorCount,
        upcomingAppointments:    upcomingCount,
        unreadHealthRecords:     unreadRecords,
        unreadPrescriptions:     unreadPrescriptions
      });
    }

    // Doctor stats
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [appointmentCount, todayCount, patientIds, providedCount, pendingCount, pendingAppointments, pendingPrescriptions] = await Promise.all([
      Appointment.countDocuments({ doctorId: new mongoose.Types.ObjectId(req.userId) }),
      Appointment.countDocuments({ doctorId: new mongoose.Types.ObjectId(req.userId), date: { $gte: today, $lt: tomorrow } }),
      Appointment.distinct('patientId', { doctorId: new mongoose.Types.ObjectId(req.userId) }),
      HealthRecord.countDocuments({ doctorId: new mongoose.Types.ObjectId(req.userId), notes: { $ne: null, $ne: "" } }),
      HealthRecord.countDocuments({ doctorId: new mongoose.Types.ObjectId(req.userId), readByDoctor: { $ne: true } }),
      Appointment.countDocuments({ doctorId: new mongoose.Types.ObjectId(req.userId), status: 'pending' }),
      Prescription.countDocuments({ doctorId: new mongoose.Types.ObjectId(req.userId), $or: [{ readByDoctor: false }, { refillRequested: true }] })
    ]);
    
    res.json({
      totalAppointments: appointmentCount,
      todayAppointments: todayCount,
      totalPatients:     patientIds.length,
      feedbackProvided:  providedCount,
      pendingFeedback:   pendingCount,
      pendingAppointments: pendingAppointments,
      pendingPrescriptions: pendingPrescriptions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

module.exports = { getStats };