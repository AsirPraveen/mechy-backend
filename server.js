require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const workshopRoutes = require('./routes/workshop.routes');
const partsRoutes = require('./routes/parts.routes');
const stockLedgerRoutes = require('./routes/stockLedger.routes');
const jobCardsRoutes = require('./routes/jobCards.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: '*', // Restrict in production
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ─────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 req/min in dev, reduce to 10 in production
  message: { message: 'Too many requests. Please try again later.' },
});

// ─── Body Parsing ──────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ───────────────────────────────────────────
app.use(morgan('dev'));

// ─── Health Check ──────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Mechy API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workshop', workshopRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/stock-ledger', stockLedgerRoutes);
app.use('/api/job-cards', jobCardsRoutes);

// ─── 404 Handler ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ─── Error Handler ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Mechy API running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();

module.exports = app;
