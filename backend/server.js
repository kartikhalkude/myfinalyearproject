const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const { initSocket } = require('./socket');

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const predictionRoutes = require('./routes/predictions');
const healthRecordRoutes = require('./routes/healthRecords');
const prescriptionRoutes = require('./routes/prescriptions');
const statsRoutes = require('./routes/stats');
const messageRoutes = require('./routes/messages');

// ─── CORS origins ─────────────────────────────────────────────────────────────
const parseClientUrl = () => {
  const raw = process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:5173,http://localhost:5174';
  return typeof raw === 'string' ? raw.split(',').map(u => u.trim()) : raw;
};
const allowedOrigins = parseClientUrl();

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  // FIX: Added 'PUT' — authController uses PUT /profile, missing caused CORS preflight failures
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ─── Socket.IO ────────────────────────────────────────────────────────────────
initSocket(server, allowedOrigins);

// ─── Database ─────────────────────────────────────────────────────────────────
connectDB();

// ─── API Routes ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api', predictionRoutes);
app.use('/api/health-records', healthRecordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/messages', messageRoutes);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/telemedicine'}`);
});

// ─── Unhandled error handlers ─────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  if (err.code === 'EOF' || err.syscall === 'write') {
    console.warn('⚠️ Socket write error (client disconnected):', err.code);
  } else {
    console.error('❌ Uncaught Exception:', err);
    if (!err.message.includes('ECONNRESET') && !err.message.includes('EOF')) {
      process.exit(1);
    }
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', err);
  }
});