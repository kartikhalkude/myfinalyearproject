const Appointment                  = require('../models/Appointment');
const User                         = require('../models/User');
const { broadcastAppointmentUpdate } = require('../socket');

const createAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, reason } = req.body;
    if (!doctorId || !date || !time)
      return res.status(400).json({ error: 'Missing required fields' });

    const patient = await User.findById(req.userId);
    const doctor  = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor')
      return res.status(404).json({ error: 'Doctor not found' });

    // Check for double booking
    const existing = await Appointment.findOne({ doctorId, date, time, status: { $ne: 'cancelled' } });
    if (existing) {
      return res.status(409).json({ error: 'This time slot is already booked.' });
    }

    const appointment = await new Appointment({
      patientId: req.userId, doctorId,
      patientName: patient.name, doctorName: doctor.name,
      date, time, reason: reason || ''
    }).save();

    await broadcastAppointmentUpdate(appointment, 'created', req.userId);
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appointment', details: error.message });
  }
};

const getAppointments = async (req, res) => {
  try {
    const query = req.userRole === 'patient'
      ? { patientId: req.userId }
      : { doctorId:  req.userId };

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email phone')
      .populate('doctorId',  'name email specialization')
      .sort({ date: -1 })
      .lean();

    const Message = require('../models/Message');

    const appointmentsWithUnread = await Promise.all(appointments.map(async (apt) => {
      const unreadCount = await Message.countDocuments({
        appointmentId: apt._id,
        receiver: req.userId,
        isRead: false
      });
      return {
        ...apt,
        unreadCount
      };
    }));

    res.json(appointmentsWithUnread);
  } catch (error) {
    console.error('Failed to fetch appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    if (req.userRole === 'patient' && appointment.patientId.toString() !== req.userId)
      return res.status(403).json({ error: 'Unauthorized' });
    if (req.userRole === 'doctor' && appointment.doctorId.toString() !== req.userId)
      return res.status(403).json({ error: 'Unauthorized' });

    appointment.status = status;
    await appointment.save();

    if (status === 'completed') {
      const Message = require('../models/Message');
      await Message.deleteMany({
        $or: [
          { sender: appointment.doctorId, receiver: appointment.patientId },
          { sender: appointment.patientId, receiver: appointment.doctorId }
        ]
      });
      // Optionally notify clients to clear their chat view
      const { getIo } = require('../socket');
      const io = getIo();
      if (io) {
        io.to(`user:${appointment.patientId}`).emit('chat:cleared', { otherId: appointment.doctorId });
        io.to(`user:${appointment.doctorId}`).emit('chat:cleared', { otherId: appointment.patientId });
      }
    }

    await broadcastAppointmentUpdate(appointment, 'updated', req.userId);
    res.json(appointment);
  } catch {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

const getBookedSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) return res.status(400).json({ error: 'Missing doctorId or date' });
    
    const appointments = await Appointment.find({ doctorId, date, status: { $ne: 'cancelled' } }, 'time');
    const bookedSlots = appointments.map(a => a.time);
    res.json(bookedSlots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booked slots' });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    if (req.userRole === 'patient' && appointment.patientId.toString() !== req.userId)
      return res.status(403).json({ error: 'Unauthorized' });
    if (req.userRole === 'doctor' && appointment.doctorId.toString() !== req.userId)
      return res.status(403).json({ error: 'Unauthorized' });

    await Appointment.findByIdAndDelete(req.params.id);
    
    const { getIo } = require('../socket');
    const io = getIo();
    if (io) {
      const payload = { type: 'deleted', appointmentId: req.params.id, initiatorId: req.userId };
      io.to(`user:${appointment.patientId}`).emit('appointment:deleted', payload);
      io.to(`user:${appointment.doctorId}`).emit('appointment:deleted', payload);
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
};

module.exports = { createAppointment, getAppointments, updateAppointment, getBookedSlots, deleteAppointment };