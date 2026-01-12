const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const compression = require('compression');
const requestIp = require('request-ip');
const morgan = require('morgan')

// Load environment variables FIRST - before any other imports that might use them
dotenv.config({ path: path.join(__dirname, '.env') });

// Critical environment variables validation
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in .env file');
  process.exit(1);
}
console.log('[Config] JWT_SECRET loaded:', process.env.JWT_SECRET ? 'Yes (length: ' + process.env.JWT_SECRET.length + ')' : 'No');

// Now import modules that depend on environment variables
// Centralized Redis client (singleton pattern for 500+ users)
const { getRedisClient } = require('./utils/redis');

// Consolidated Security Middleware
const {
  loginLimiter,
  apiLimiter,
  submissionLimiter,
  secureHeaders,
  sanitizeInput,
  mongoSanitize,
  secureFileUpload
} = require('./middleware/security');

const { concurrencyMiddleware } = require('./middleware/concurrency');
const { cachingMiddleware, CACHE_CONFIG } = require('./middleware/caching');

// Import routes
const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenges');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const registrationStatusRoutes = require('./routes/registrationStatus');
const blogRoutes = require('./routes/blog');
const tutorialRoutes = require('./routes/tutorials');
const teamRoutes = require('./routes/teams');
const noticeRoutes = require('./routes/notice');
const analyticsRoutes = require('./routes/analytics');
const realtimeRoutes = require('./routes/realtime');
const scoreboardRoutes = require('./routes/scoreboard');
const adminResetRoutes = require('./routes/adminReset');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 10000;

app.use(morgan('dev'));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// IP address middleware (must be early in the middleware stack)
app.use(requestIp.mw());

// Security Headers
app.use(secureHeaders);

// Rate limiting
app.use('/api/auth/login', loginLimiter);
app.use('/api/challenges/submit', submissionLimiter); // IP-based backup
app.use('/api/', apiLimiter);

// CORS with development-friendly configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());

    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Initialize centralized Redis client (singleton for 500+ users)
const redisClient = getRedisClient();

// Session system removed - using JWT only for better scalability
// This saves Redis memory and prevents session/JWT confusion

// Performance middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Concurrency management
app.use(concurrencyMiddleware);

// Body parsing with security limits
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: '1mb',
  parameterLimit: 20
}));

// MongoDB injection protection
app.use(mongoSanitize);

// Input sanitization
app.use(sanitizeInput);

// CSRF protection for state-changing operations (disabled for development)
// app.use('/api/', (req, res, next) => {
//   if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
//     return csrfProtection(req, res, next);
//   }
//   next();
// });

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}



// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Sanitize filename
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + sanitizedFilename);
  }
});

const fileFilter = (req, file, cb) => {
  try {
    secureFileUpload.validateFile(file);
    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.FILE_UPLOAD_MAX_SIZE) || secureFileUpload.maxFileSize,
    files: 1,
    fields: 10,
    fieldNameSize: 50,
    fieldSize: 1024
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    connections: {
      active: mongoose.connection.db?.serverConfig?.connections?.length || 0,
      poolSize: mongoose.connection.db?.serverConfig?.poolSize || 0
    }
  };

  try {
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.message = error.message;
    res.status(503).json(healthCheck);
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/registration-status', registrationStatusRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/tutorials', tutorialRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/r-submission', realtimeRoutes);
app.use('/api/timer', require('./routes/timer'));
app.use('/api/event-control', require('./routes/eventControl'));
app.use('/api/v1/scoreboard', scoreboardRoutes);
app.use('/api/awards', require('./routes/awards'));
app.use('/api/admin/reset', adminResetRoutes);

// Enhanced security headers middleware
// Enhanced security headers middleware - Relaxed for UX
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Allow framing for better compatibility
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // XSS protection (but browser defaults are usually good)
  res.setHeader('X-XSS-Protection', '0'); // Disabled - modern browsers don't need this
  // HSTS for HTTPS - only in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  // Very permissive CSP - prioritize functionality over strict security for 2-day CTF
  res.setHeader('Content-Security-Policy', "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src *; connect-src *; media-src *; object-src *; frame-src *;");
  next();
});

// Serve static files from uploads directory with proper security headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Log detailed error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error stack:', err.stack);
  }

  // Handle specific error types
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Invalid file upload'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: process.env.NODE_ENV === 'development' ? messages : ['Invalid input data']
    });
  }

  // Handle mongoose duplicate key errors
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }

  // Default error - never expose internal details in production
  const isProduction = process.env.NODE_ENV === 'production';

  // Log full error details server-side
  console.error('Server Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? 'Internal server error' : err.message,
    error: isProduction ? undefined : err.stack
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  //process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Close server & exit process
  process.exit(1);
});

// Start server
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ctf-platform';

// Enhanced MongoDB connection options for 500+ concurrent users support
const mongoOptions = {
  // Connection pool settings - Optimized for PM2 Cluster (Total ~800 connections with 4 instances)
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 200,
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE) || 20,
  maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME) || 60000, // Close connections after 60 seconds of inactivity
  serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT) || 10000, // How long to try selecting a server
  socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT) || 60000, // How long a send or receive on a socket can take before timing out
  heartbeatFrequencyMS: parseInt(process.env.MONGO_HEARTBEAT_FREQUENCY) || 5000, // How often to check the status of the connection

  // Connection wait queue settings
  waitQueueTimeoutMS: parseInt(process.env.MONGO_WAIT_QUEUE_TIMEOUT) || 10000,

  // Retry settings
  retryWrites: true,
  retryReads: true,

  // Read/Write concerns for consistency
  readPreference: process.env.MONGO_READ_PREFERENCE || 'primary',
  readConcern: { level: process.env.MONGO_READ_CONCERN || 'majority' },
  writeConcern: { w: process.env.MONGO_WRITE_CONCERN || 'majority', j: true, wtimeout: 10000 }
};

// Set mongoose-specific options separately (not passed to MongoDB driver)
mongoose.set('bufferCommands', false); // Disable mongoose buffering
mongoose.set('strictQuery', true); // Enable strict mode for queries

mongoose.connect(MONGODB_URI, mongoOptions)
  .then(async () => {
    console.log('MongoDB connected successfully with enhanced connection pooling');
    console.log(`Connection pool: min=${mongoOptions.minPoolSize}, max=${mongoOptions.maxPoolSize}`);

    // Ensure admin has correct password
    const { ensureAdminPassword } = require('./scripts/createAdminWithNewPassword');
    await ensureAdminPassword();

    // Initialize EventState document and load into Redis cache
    try {
      const EventState = require('./models/EventState');
      const { refreshEventStateCache } = require('./middleware/eventState');

      // Use getEventState which handles upsert atomically
      const eventState = await EventState.getEventState();
      const stateObj = {
        status: eventState.status,
        startedAt: eventState.startedAt,
        endedAt: eventState.endedAt,
        startedBy: eventState.startedBy,
        endedBy: eventState.endedBy
      };

      await refreshEventStateCache(stateObj);
      console.log(`[EventState] Initialized: status=${eventState.status}`);
    } catch (err) {
      // Handle duplicate key error gracefully (can happen with multiple PM2 instances)
      if (err.code === 11000) {
        // Document already exists, just fetch it
        try {
          const EventState = require('./models/EventState');
          const { refreshEventStateCache } = require('./middleware/eventState');
          const FIXED_ID = '000000000000000000000001';
          const eventState = await EventState.findById(FIXED_ID);
          if (eventState) {
            const stateObj = {
              status: eventState.status,
              startedAt: eventState.startedAt,
              endedAt: eventState.endedAt,
              startedBy: eventState.startedBy,
              endedBy: eventState.endedBy
            };
            await refreshEventStateCache(stateObj);
            console.log(`[EventState] Initialized (existing): status=${eventState.status}`);
          }
        } catch (retryErr) {
          console.error('[EventState] Error fetching existing event state:', retryErr);
        }
      } else {
        console.error('[EventState] Error initializing event state:', err);
      }
      // Don't block server startup if event state initialization fails
    }

    app.listen(PORT, "127.0.0.1", () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`Server accessible at http://localhost:${PORT}`);
      console.log(`MongoDB connection pool configured for ${mongoOptions.maxPoolSize} concurrent connections`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    //process.exit(1);
  });
