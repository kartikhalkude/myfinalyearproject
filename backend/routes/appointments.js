const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createAppointment,
  getAppointments,
  updateAppointment,
  getBookedSlots,
  deleteAppointment
} = require('../controllers/appointmentController');

router.post('/',     authMiddleware, createAppointment);
router.get('/',      authMiddleware, getAppointments);
router.get('/booked-slots', authMiddleware, getBookedSlots);
router.patch('/:id', authMiddleware, updateAppointment);
router.delete('/:id', authMiddleware, deleteAppointment);

module.exports = router;