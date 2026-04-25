const HealthRecord = require('../models/HealthRecord');
const User        = require('../models/User');
const { getIo } = require('../socket');

// ─── Get All Health Records ───────────────────────────────────────────────────

const getHealthRecords = async (req, res) => {
  try {
    let query;
    
    if (req.userRole === 'doctor') {
      // Doctors see records they created for their patients
      query = HealthRecord.find({ doctorId: req.userId });
    } else {
      // Patients see records created for them by doctors
      query = HealthRecord.find({ patientId: req.userId });
    }
    
    const records = await query
      .select('-fileData')
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health records', details: error.message });
  }
};

// ─── Get Single Health Record ─────────────────────────────────────────────────

const getHealthRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await HealthRecord.findById(id)
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email');

    if (!record) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    // Check authorization
    if (record.patientId._id.toString() !== req.userId && req.userRole === 'patient') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ record });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health record', details: error.message });
  }
};

// ─── Create Health Record ─────────────────────────────────────────────────────
// FIX: Patients can now create health records for themselves (no doctorId).
//      Doctors can still create records and assign them to a patient.

const createHealthRecord = async (req, res) => {
  try {
    const isDoctor  = req.userRole === 'doctor';
    const isPatient = req.userRole === 'patient';

    if (!isDoctor && !isPatient) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { patientId, title, type, content, severity, notes, date } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    let resolvedPatientId;
    let resolvedDoctorId = null;

    if (isDoctor) {
      // Doctor must specify which patient this record belongs to
      if (!patientId) {
        return res.status(400).json({ error: 'patientId is required for doctors' });
      }
      const patient = await User.findById(patientId);
      if (!patient || patient.role !== 'patient') {
        return res.status(404).json({ error: 'Patient not found' });
      }
      resolvedPatientId = patientId;
      resolvedDoctorId  = req.userId;
    } else {
      // Patient creates a record for themselves — can optionally specify a doctor
      resolvedPatientId = req.userId;
      if (req.body.doctorId) {
        const doctor = await User.findById(req.body.doctorId);
        if (doctor && doctor.role === 'doctor') {
          resolvedDoctorId = req.body.doctorId;
        }
      }
    }

    const record = await new HealthRecord({
      patientId:  resolvedPatientId,
      doctorId:   resolvedDoctorId,
      title,
      type:       type || 'diagnosis',
      content,
      severity:   severity || 'normal',
      notes,
      fileData:    req.file ? req.file.buffer : undefined,
      fileContentType: req.file ? req.file.mimetype : undefined,
      fileName:   req.file ? req.file.originalname : undefined,
      date:       date ? new Date(date) : new Date(),
      readByPatient: isDoctor ? false : true, // If patient creates it, they've already read it
    }).save();

    const populated = await HealthRecord.findById(record._id)
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email');

    // Notification logic
    if (isDoctor) {
      // Notify patient when doctor creates record
      getIo().to(`user:${resolvedPatientId}`).emit('health-record:created', {
        type:   'created',
        record: populated,
        initiatorId: req.userId
      });
    } else if (resolvedDoctorId) {
      // Notify doctor when patient sends/shares a record
      getIo().to(`user:${resolvedDoctorId}`).emit('health-record:created', {
        type:   'created',
        record: populated,
        initiatorId: req.userId
      });
    }

    res.status(201).json({ record: populated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create health record', details: error.message });
  }
};

// ─── Update Health Record ─────────────────────────────────────────────────────
// FIX: Doctors can update their own records; patients can update self-created
//      records (those with no doctorId).

const updateHealthRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, content, severity, notes, date } = req.body;

    const record = await HealthRecord.findById(id);
    if (!record) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    if (req.userRole === 'doctor') {
      // Doctor can only update records they created
      if (!record.doctorId || record.doctorId.toString() !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } else if (req.userRole === 'patient') {
      // Patient can only update their own self-created records (no doctorId)
      if (record.patientId.toString() !== req.userId || record.doctorId) {
        return res.status(403).json({ error: 'Patients can only edit their own self-created records' });
      }
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (title    !== undefined) record.title    = title;
    if (type     !== undefined) record.type     = type;
    if (content  !== undefined) record.content  = content;
    if (severity !== undefined) record.severity = severity;
    if (notes    !== undefined) {
      record.notes = notes;
      // Reset read status so patient sees it as "New" again
      record.readByPatient = false;
    }
    if (date     !== undefined) record.date     = new Date(date);

    record.updatedAt = new Date();
    await record.save();

    const populated = await HealthRecord.findById(id)
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email');

    // Notify patient when a doctor updates their record
    if (req.userRole === 'doctor') {
      getIo().to(`user:${record.patientId}`).emit('health-record:updated', {
        type:   'updated',
        record: populated,
        initiatorId: req.userId
      });
    }

    res.json({ record: populated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update health record', details: error.message });
  }
};

// ─── Delete Health Record ─────────────────────────────────────────────────────
// FIX: Patients can delete their own self-created records; doctors delete theirs.

const deleteHealthRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await HealthRecord.findById(id);

    if (!record) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    if (req.userRole === 'doctor') {
      if (!record.doctorId || record.doctorId.toString() !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } else if (req.userRole === 'patient') {
      if (record.patientId.toString() !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const patientId = record.patientId.toString();
    const wasCreatedByDoctor = !!record.doctorId;

    await HealthRecord.findByIdAndDelete(id);

    // Notify patient when a doctor deletes their record
    if (wasCreatedByDoctor) {
      getIo().to(`user:${patientId}`).emit('health-record:deleted', {
        type:     'deleted',
        recordId: id,
        initiatorId: req.userId
      });
    }

    res.json({ message: 'Health record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete health record', details: error.message });
  }
};

// ─── Get Records by Type (filter) ─────────────────────────────────────────────

const getRecordsByType = async (req, res) => {
  try {
    const { type } = req.params;
    let query;
    
    if (req.userRole === 'doctor') {
      query = HealthRecord.find({
        doctorId: req.userId,
        type: type,
      });
    } else {
      query = HealthRecord.find({
        patientId: req.userId,
        type: type,
      });
    }
    
    const records = await query
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch records', details: error.message });
  }
};

// ─── Get Patient Records (Doctor view) ────────────────────────────────────────

const getPatientRecords = async (req, res) => {
  try {
    if (req.userRole !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this' });
    }

    const { patientId } = req.params;
    const records = await HealthRecord.find({ patientId, doctorId: req.userId })
      .select('-fileData')
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient records', details: error.message });
  }
};

// ─── Add Vital Sign ───────────────────────────────────────────────────────────

const addVitalSign = async (req, res) => {
  try {
    if (req.userRole !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can add vital signs' });
    }

    const { id } = req.params;
    const { name, value, unit } = req.body;

    if (!name || !value || !unit) {
      return res.status(400).json({ error: 'name, value, and unit are required' });
    }

    const record = await HealthRecord.findById(id);
    if (!record) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    if (!record.doctorId || record.doctorId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    record.vitals.push({ name, value, unit });
    await record.save();

    const populated = await HealthRecord.findById(id)
      .populate('doctorId', 'name specialization email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add vital sign', details: error.message });
  }
};

const getHealthRecordFile = async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record || !record.fileData) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Authorization: Patient must own the record; Doctor must be authorized (simplified for now)
    if (req.userRole === 'patient' && record.patientId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.set('Content-Type', record.fileContentType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${record.fileName || 'report'}"`);
    res.send(record.fileData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch file', details: error.message });
  }
};

// ─── Mark as Read ─────────────────────────────────────────────────────────────
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await HealthRecord.findById(id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    
    // Only patient can mark their own record as read
    if (String(record.patientId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    record.readByPatient = true;
    await record.save();
    
    const populated = await HealthRecord.findById(id)
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email');

    // Notify all patient's tabs that the record is read
    getIo().to(`user:${req.userId}`).emit('health-record:updated', {
      type:   'updated',
      record: populated,
      initiatorId: req.userId
    });

    res.json({ success: true, record: populated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

module.exports = {
  getHealthRecords,
  getHealthRecordById,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  getRecordsByType,
  getPatientRecords,
  addVitalSign,
  getHealthRecordFile,
  markAsRead
};