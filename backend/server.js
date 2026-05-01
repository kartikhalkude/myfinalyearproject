const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
  return typeof raw === 'string' 
    ? raw.split(',').map(u => u.trim().replace(/\/$/, '')) 
    : raw;
};
const allowedOrigins = Array.isArray(parseClientUrl()) ? parseClientUrl() : [parseClientUrl()];

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
})); // Basic security headers with CORS flexibility
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter); // Apply to all API routes

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
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