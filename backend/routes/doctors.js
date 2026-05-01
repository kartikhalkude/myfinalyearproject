const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { getDoctors, updateDoctorSettings, withdrawFunds, getTransactions } = require('../controllers/doctorController');

router.get('/', authMiddleware, getDoctors);
router.put('/settings', authMiddleware, updateDoctorSettings);
router.post('/withdraw', authMiddleware, withdrawFunds);
router.get('/transactions', authMiddleware, getTransactions);

module.exports = router;