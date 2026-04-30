const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getMessages, sendMessage, markAsRead } = require('../controllers/messageController');

router.get('/', authMiddleware, getMessages);
router.post('/', authMiddleware, sendMessage);
router.post('/read', authMiddleware, markAsRead);

module.exports = router;
