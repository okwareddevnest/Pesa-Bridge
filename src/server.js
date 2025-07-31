const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const connectDB = require('./database/connection');
const cache = require('./utils/cache');

// Import routes
const cardRoutes = require('./routes/cards');
const transactionRoutes = require('./routes/transactions');
const mpesaRoutes = require('./routes/mpesa');
const webhookRoutes = require('./routes/webhooks');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind reverse proxy (Tailscale)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com', 'https://*.ts.net'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'https://*.ts.net'],
  credentials: true
}));

// Rate limiting - more lenient in development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (process.env.NODE_ENV === 'development' ? 5 * 60 * 1000 : 15 * 60 * 1000), // 5 min dev, 15 min prod
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'development' ? 1000 : 100), // 1000 dev, 100 prod
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for auth routes in development
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && req.path.startsWith('/api/auth');
  }
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'PesaCard M-Pesa Bridge API',
    version: '1.0.0',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      cards: '/api/cards',
      transactions: '/api/transactions',
      mpesa: '/api/mpesa',
      webhooks: '/api/webhooks',
      dashboard: '/api/dashboard'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: 'MongoDB',
    cache: cache.isConnected() ? 'Connected' : 'Disconnected'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/cards', authMiddleware, cardRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/mpesa', authMiddleware, mpesaRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
let server;

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('✅ MongoDB connected successfully');

    // Test cache connection
    await cache.ping();
    logger.info('✅ Simple cache initialized successfully');

    // Start server
    server = app.listen(PORT, () => {
      logger.info(`🚀 PesaCard M-Pesa Bridge Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔗 API Base URL: http://localhost:${PORT}/api`);
      
      // Development webhook URL info
      if (process.env.NODE_ENV === 'development') {
        const webhookUrl = process.env.TAILSCALE_FUNNEL_URL || process.env.NGROK_URL || `http://localhost:${PORT}`;
        logger.info(`📡 M-Pesa Webhook URL: ${webhookUrl}/api/webhooks/mpesa`);
        if (process.env.TAILSCALE_FUNNEL_URL) {
          logger.info(`🔗 Tailscale Funnel Active: ${process.env.TAILSCALE_FUNNEL_URL}`);
        } else {
          logger.info(`💡 Use ngrok to expose webhooks: ngrok http ${PORT}`);
        }
      }
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app; 