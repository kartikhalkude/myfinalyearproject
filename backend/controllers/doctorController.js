const User = require('../models/User');
const Transaction = require('../models/Transaction');

const getDoctors = async (req, res) => {
  try {
    res.json(await User.find({ role: 'doctor' }).select('-password'));
  } catch {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};

const updateDoctorSettings = async (req, res) => {
  try {
    if (req.userRole !== 'doctor') return res.status(403).json({ error: 'Unauthorized' });
    const { availability } = req.body;
    const doctor = await User.findByIdAndUpdate(
      req.userId,
      { $set: { availability } },
      { new: true }
    ).select('-password');
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

const withdrawFunds = async (req, res) => {
  try {
    if (req.userRole !== 'doctor') return res.status(403).json({ error: 'Unauthorized' });
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    
    const doctor = await User.findById(req.userId);
    doctor.availability = doctor.availability || {};
    doctor.availability.withdrawnAmount = (doctor.availability.withdrawnAmount || 0) + amount;
    await doctor.save();

    // Log the withdrawal transaction
    await new Transaction({
      userId: req.userId,
      type: 'withdrawal',
      amount,
      description: 'Funds withdrawal to bank account',
      status: 'completed'
    }).save();
    
    res.json({ message: 'Withdrawal successful', withdrawnAmount: doctor.availability.withdrawnAmount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

module.exports = { getDoctors, updateDoctorSettings, withdrawFunds, getTransactions };