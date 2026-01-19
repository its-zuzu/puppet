/**
 * Centralized Configuration Module
 * All runtime behavior is driven by .env variables
 * NO HARDCODED VALUES - everything configurable
 */

// Helper to parse duration strings (e.g., "24h", "30m", "5s") to milliseconds
const parseDuration = (value, defaultMs) => {
  if (!value) return defaultMs;
  if (typeof value === 'number') return value;
  
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) return defaultMs;
  
  const [, num, unit] = match;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number.parseInt(num, 10) * (multipliers[unit] || 1000);
};

// Helper to parse boolean strings
const parseBoolean = (value, defaultValue) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
};

// Helper to parse integer
const parseIntHelper = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Debug: Log JWT_SECRET availability
console.log('[Config Module] JWT_SECRET from env:', process.env.JWT_SECRET ? 'EXISTS (length: ' + process.env.JWT_SECRET.length + ')' : 'MISSING');

module.exports = {
  // Server Configuration
  server: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseIntHelper(process.env.PORT, 10000),
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production'
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ctfquest',
    maxPoolSize: parseIntHelper(process.env.MONGO_MAX_POOL_SIZE, 500),
    minPoolSize: parseIntHelper(process.env.MONGO_MIN_POOL_SIZE, 50)
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: {
      userCache: parseDuration(process.env.REDIS_USER_CACHE_TTL || '5m', 300000), // 5 minutes
      challengeCache: parseDuration(process.env.REDIS_CHALLENGE_CACHE_TTL || '5m', 300000),
      scoreboardCache: parseDuration(process.env.REDIS_SCOREBOARD_CACHE_TTL || '30s', 30000)
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE || '24h', // Legacy - for backward compatibility
    // New: Short-lived access tokens
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRE || '15m', // 15 minutes
    // New: Long-lived refresh tokens
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d', // 7 days
    // Separate refresh token secret (recommended for security)
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    // Refresh token when this % of lifetime remains (default 10%)
    refreshThresholdPercent: parseIntHelper(process.env.JWT_REFRESH_THRESHOLD_PERCENT, 10)
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET,
    maxAge: parseDuration(process.env.SESSION_MAX_AGE || '24h', 86400000) // 24 hours
  },

  // Security Configuration - Relaxed for CTF UX
  security: {
    maxLoginAttempts: parseIntHelper(process.env.MAX_LOGIN_ATTEMPTS, 100), // Very high - won't block users
    loginTimeoutMinutes: parseIntHelper(process.env.LOGIN_TIMEOUT, 1),
    bcryptRounds: parseIntHelper(process.env.BCRYPT_ROUNDS, 10), // Reduced for faster response
    hstsMaxAge: parseIntHelper(process.env.HSTS_MAX_AGE_SECONDS, 31536000) // 1 year
  },

  // Rate Limiting Configuration
  // =============================================================================
  // SESSION-BASED RATE LIMITING (For Onsite Events with Shared IP)
  // All public endpoints use browser session cookies instead of IP address
  // =============================================================================
  rateLimit: {
    // Login rate limiting
    sessionLogin: {
      windowMs: parseDuration(process.env.SESSION_LOGIN_RATE_WINDOW || '15m', 900000),
      max: parseIntHelper(process.env.SESSION_LOGIN_RATE_MAX, 20),
      cooldownSeconds: parseIntHelper(process.env.SESSION_LOGIN_RATE_COOLDOWN, 300)
    },
    
    // General API rate limiting
    sessionGeneral: {
      windowMs: parseDuration(process.env.SESSION_GENERAL_RATE_WINDOW || '15m', 900000),
      max: parseIntHelper(process.env.SESSION_GENERAL_RATE_MAX, 1000)
    },
    
    // Refresh token rate limiting
    sessionRefreshToken: {
      windowMs: parseDuration(process.env.SESSION_REFRESH_TOKEN_RATE_WINDOW || '1m', 60000),
      max: parseIntHelper(process.env.SESSION_REFRESH_TOKEN_RATE_MAX, 60)
    },
    
    // Newsletter subscription rate limiting
    sessionNewsletter: {
      windowMs: parseDuration(process.env.SESSION_NEWSLETTER_RATE_WINDOW || '15m', 900000),
      max: parseIntHelper(process.env.SESSION_NEWSLETTER_RATE_MAX, 5),
      cooldownSeconds: parseIntHelper(process.env.SESSION_NEWSLETTER_RATE_COOLDOWN, 300)
    },
    
    // Registration rate limiting
    sessionRegistration: {
      windowMs: parseDuration(process.env.SESSION_REGISTRATION_RATE_WINDOW || '60m', 3600000),
      max: parseIntHelper(process.env.SESSION_REGISTRATION_RATE_MAX, 10),
      cooldownSeconds: parseIntHelper(process.env.SESSION_REGISTRATION_RATE_COOLDOWN, 300)
    },
    
    // =============================================================================
    // LEGACY IP-BASED RATE LIMITING (Deprecated, kept for reference)
    // =============================================================================
    login: {
      windowMs: parseDuration(process.env.LOGIN_RATE_WINDOW || '15m', 900000),
      max: parseIntHelper(process.env.LOGIN_RATE_MAX, 100),
      cooldownSeconds: parseIntHelper(process.env.LOGIN_RATE_COOLDOWN, 300)
    },
    general: {
      windowMs: parseDuration(process.env.GENERAL_RATE_WINDOW || '15m', 900000),
      max: parseIntHelper(process.env.GENERAL_RATE_MAX, 500)
    },
    refreshToken: {
      windowMs: parseDuration(process.env.REFRESH_TOKEN_RATE_WINDOW || '1m', 60000),
      max: parseIntHelper(process.env.REFRESH_TOKEN_RATE_MAX, 60)
    },
    newsletter: {
      windowMs: parseDuration(process.env.NEWSLETTER_RATE_WINDOW || '15m', 900000),
      max: parseIntHelper(process.env.NEWSLETTER_RATE_MAX, 5),
      cooldownSeconds: parseIntHelper(process.env.NEWSLETTER_RATE_COOLDOWN, 300)
    },
    registration: {
      windowMs: parseDuration(process.env.REGISTRATION_RATE_WINDOW || '60m', 3600000),
      max: parseIntHelper(process.env.REGISTRATION_RATE_MAX, 10),
      cooldownSeconds: parseIntHelper(process.env.REGISTRATION_RATE_COOLDOWN, 300)
    },
    
    // =============================================================================
    // FLAG SUBMISSION (IP-based DoS protection + Per-User in route logic)
    // =============================================================================
    flagSubmit: {
      // IP-based limits (DoS protection layer)
      windowMs: parseDuration(process.env.FLAG_SUBMIT_RATE_WINDOW || '1m', 60000),
      max: parseIntHelper(process.env.FLAG_SUBMIT_RATE_MAX, 100),
      // Per-user limits (handled in route logic, not middleware)
      maxAttempts: parseIntHelper(process.env.FLAG_SUBMIT_MAX_ATTEMPTS, 20),
      windowSeconds: parseIntHelper(process.env.FLAG_SUBMIT_WINDOW, 60),
      cooldownSeconds: parseIntHelper(process.env.FLAG_SUBMIT_COOLDOWN, 30)
    },
    securityAudit: {
      windowMs: parseDuration(process.env.SECURITY_AUDIT_WINDOW || '15m', 900000) // 15 minutes
    }
  },
  
  // Input Validation Limits
  validation: {
    flagMaxLength: parseIntHelper(process.env.FLAG_MAX_LENGTH, 200) // Default 200 chars, configurable for security
  },

  // Real-time / SSE Configuration
  realtime: {
    heartbeatIntervalMs: parseDuration(process.env.SSE_HEARTBEAT_INTERVAL || '30s', 30000)
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: parseBoolean(process.env.CORS_CREDENTIALS, true)
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseIntHelper(process.env.SMTP_PORT, 587),
      secure: parseBoolean(process.env.SMTP_SECURE, true),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.FROM_EMAIL || process.env.SMTP_USER
  },

  // Analytics Timeframes (configurable)
  analytics: {
    activeUserDays: parseIntHelper(process.env.ANALYTICS_ACTIVE_USER_DAYS, 30),
    recentActivityDays: parseIntHelper(process.env.ANALYTICS_RECENT_ACTIVITY_DAYS, 7)
  },

  // File Upload Configuration
  fileUpload: {
    maxSize: parseIntHelper(process.env.MAX_FILE_SIZE, 20 * 1024 * 1024), // 20MB default
    maxFiles: parseIntHelper(process.env.MAX_FILES_PER_CHALLENGE, 10), // 10 files max
    uploadDir: process.env.UPLOAD_DIR || 'uploads/challenges'
  }
};
