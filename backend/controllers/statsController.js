const mongoose                = require('mongoose');
const Appointment            = require('../models/Appointment');
const DiabetesPrediction     = require('../models/DiabetesPrediction');
const HeartDiseasePrediction = require('../models/HeartDiseasePrediction');
const PneumoniaPrediction    = require('../models/PneumoniaPrediction');
const BrainTumorPrediction   = require('../models/BrainTumorPrediction');
const HealthRecord           = require('../models/HealthRecord');
const Prescription         = require('../models/Prescription');
const Message              = require('../models/Message');

const getStats = async (req, res) => {
  try {
    if (req.userRole === 'patient') {
      const [appointmentCount, diabetesCount, heartCount, pneumoniaCount, tumorCount, upcomingCount, unreadRecords, unreadPrescriptions, unreadMessages] = await Promise.all([
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
        Prescription.countDocuments({ patientId: new mongoose.Types.ObjectId(req.userId), readByPatient: { $ne: true } }),
        Message.countDocuments({ receiver: new mongoose.Types.ObjectId(req.userId), isRead: false })
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
        unreadPrescriptions:     unreadPrescriptions,
        unreadMessages:          unreadMessages
      });
    }



    // Doctor stats
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      appointmentCount, 
      todayCount, 
      patientIds, 
      providedCount, 
      pendingCount, 
      pendingAppointments, 
      pendingPrescriptions, 
      unreadMessages,
      balanceResult
    ] = await Promise.all([
      Appointment.countDocuments({ doctorId: new mongoose.Types.ObjectId(req.userId) }),
      Appointment.countDocuments({ doctorId: new mongoose.Types.ObjectId(req.userId), date: { $gte: today, $lt: tomorrow } }),
      Appointment.distinct('patientId', { doctorId: new mongoose.Types.ObjectId(req.userId) }),
      HealthRecord.countDocuments({ doctorId: new mongoose.Types.ObjectId(req.userId), notes: { $ne: null, $ne: "" } }),
      HealthRecord.countDocuments({ doctorId: new mongoose.Types.ObjectId(req.userId), readByDoctor: { $ne: true } }),
      Appointment.countDocuments({ doctorId: new mongoose.Types.ObjectId(req.userId), status: 'pending' }),
      Prescription.countDocuments({ doctorId: new mongoose.Types.ObjectId(req.userId), $or: [{ readByDoctor: false }, { refillRequested: true }] }),
      Message.countDocuments({ receiver: new mongoose.Types.ObjectId(req.userId), isRead: false }),
      mongoose.model('Transaction').aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
        { $group: {
            _id: null,
            earnings: { $sum: { $cond: [{ $eq: ["$type", "earning"] }, "$amount", 0] } },
            withdrawals: { $sum: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0] } }
        }}
      ])
    ]);
    
    const balance = balanceResult.length > 0 
      ? (balanceResult[0].earnings - balanceResult[0].withdrawals) 
      : 0;
    
    res.json({
      totalAppointments: appointmentCount,
      todayAppointments: todayCount,
      totalPatients:     patientIds.length,
      feedbackProvided:  providedCount,
      pendingFeedback:   pendingCount,
      pendingAppointments: pendingAppointments,
      pendingPrescriptions: pendingPrescriptions,
      unreadMessages: unreadMessages,
      totalEarnings: balance
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

const clearDatabase = async (req, res) => {
  try {
    // For security in a real app, you'd check for an admin role.
    // For testing/development, we'll allow it if authorized.
    
    // List of models to clear
    const models = [
      'Appointment',
      'DiabetesPrediction',
      'HeartDiseasePrediction',
      'PneumoniaPrediction',
      'BrainTumorPrediction',
      'HealthRecord',
      'Prescription',
      'Message',
      'Transaction'
    ];

    for (const modelName of models) {
      if (mongoose.models[modelName]) {
        await mongoose.models[modelName].deleteMany({});
      }
    }

    // Also reset doctor withdrawal amounts
    const User = mongoose.model('User');
    await User.updateMany({}, { $set: { "availability.withdrawnAmount": 0 } });

    res.json({ message: 'Database cleared successfully. All transactions and records removed.' });
  } catch (error) {
    console.error("Clear database error:", error);
    res.status(500).json({ error: 'Failed to clear database' });
  }
};

module.exports = { getStats, clearDatabase };