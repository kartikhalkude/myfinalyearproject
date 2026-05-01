const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { getStats, clearDatabase }   = require('../controllers/statsController');

router.get('/', authMiddleware, getStats);
router.post('/reset', authMiddleware, clearDatabase);

module.exports = router;