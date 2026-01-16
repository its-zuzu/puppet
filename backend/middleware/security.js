const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const RedisStore = require('rate-limit-redis').default;
const requestIp = require('request-ip');
const { getRedisClient } = require('../utils/redis');
const config = require('../config');

const redisClient = getRedisClient();

// 1. Rate Limiting Factory (Redis-backed)
const createRateLimit = (windowMs, max, message, prefix, cooldownSeconds = null) => {
  // If cooldown is specified, create middleware that checks blocked status first
  if (cooldownSeconds) {
    const limiter = rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: `ctf:rl:${prefix}:` // Unique prefix per limiter
      }),
      keyGenerator: (req) => requestIp.getClientIp(req),
      handler: async (req, res) => {
        const ip = requestIp.getClientIp(req);
        const blockedKey = `ctf:rl:blocked:${prefix}:${ip}`;
        
        // Set block when rate limit exceeded
        const existingBlock = await redisClient.get(blockedKey);
        if (!existingBlock) {
          await redisClient.setex(blockedKey, cooldownSeconds, 'blocked');
        }
        
        const ttl = await redisClient.ttl(blockedKey);
        
        return res.status(429).json({
          success: false,
          message: `Too many attempts, slow down!`,
          retryAfter: ttl > 0 ? ttl : cooldownSeconds
        });
      },
      passOnStoreError: true
    });

    // Return middleware that checks block status first
    return async (req, res, next) => {
      const ip = requestIp.getClientIp(req);
      const blockedKey = `ctf:rl:blocked:${prefix}:${ip}`;
      
      // Check if already blocked
      const isBlocked = await redisClient.get(blockedKey);
      if (isBlocked) {
        const ttl = await redisClient.ttl(blockedKey);
        return res.status(429).json({
          success: false,
          message: `Too many attempts, slow down!`,
          retryAfter: ttl > 0 ? ttl : cooldownSeconds
        });
      }
      
      // Not blocked, continue to rate limiter
      return limiter(req, res, next);
    };
  }

  // No cooldown, use standard rate limiter
  return rateLimit({
    windowMs,
    max,
    message: { success: false, message, blocked: true },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: `ctf:rl:${prefix}:` // Unique prefix per limiter
    }),
    keyGenerator: (req) => requestIp.getClientIp(req),
    passOnStoreError: true
  });
};

// 2. Defined Limiters
const loginLimiter = createRateLimit(
  config.rateLimit.login.windowMs,
  config.rateLimit.login.max,
  'Too many login attempts. Please wait a bit.',
  'login',
  config.rateLimit.login.cooldownSeconds
);

const apiLimiter = createRateLimit(
  config.rateLimit.general.windowMs,
  config.rateLimit.general.max,
  'Too many requests. Please slow down.',
  'common'
);

// Note: Challenge submission limiting is handled per-user logic in the route, 
// but we add a loose IP-based layer here for DoS protection.
const submissionLimiter = createRateLimit(
  config.rateLimit.flagSubmit.windowMs,
  config.rateLimit.flagSubmit.max,
  'Too many submission attempts.',
  'submit'
);

// Refresh token rate limiter (IP-based)
// For 400 concurrent users: 60 requests per minute = 1 refresh per second per IP
// This prevents abuse while allowing normal refresh patterns
const refreshTokenLimiter = createRateLimit(
  config.rateLimit.refreshToken.windowMs,
  config.rateLimit.refreshToken.max,
  'Too many token refresh attempts. Please slow down.',
  'refresh'
);

// 3. Security Headers (Helmet with comprehensive security)
const secureHeaders = helmet({
  // Content Security Policy to mitigate XSS
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for React/Vite
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
  },
  // Strict Transport Security (HSTS) - Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  // Prevent clickjacking attacks
  frameguard: {
    action: 'deny' // X-Frame-Options: DENY
  },
  // Other security headers
  crossOriginEmbedderPolicy: false, // May break some functionality
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  ieNoOpen: true,
  noSniff: true, // X-Content-Type-Options: nosniff
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true // X-XSS-Protection: 1; mode=block
});

// 4. Input Sanitization
const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = sanitizePayload(req.body);
  if (req.query) req.query = sanitizePayload(req.query);
  if (req.params) req.params = sanitizePayload(req.params);
  next();
};

const sanitizePayload = (obj) => {
  if (typeof obj === 'string') {
    // Basic trimming and removal of null bytes
    return obj.trim().replace(/\0/g, '');
  }
  if (typeof obj === 'object' && obj !== null) {
    if (obj.buffer) return obj; // Skip files
    Object.keys(obj).forEach(key => {
      obj[key] = sanitizePayload(obj[key]);
    });
  }
  return obj;
};

// 5. Input Validation
const validator = require('validator');

const validateInput = {
  email: (email) => {
    if (!email || !validator.isEmail(email)) {
      throw new Error('Invalid email format');
    }
    return validator.normalizeEmail(email);
  },

  username: (username) => {
    // Flexible username for CTF (allow alphanumeric + typical chars)
    if (!username) throw new Error('Username is required');
    if (username.length < 3 || username.length > 30) {
      throw new Error('Username length must be between 3 and 30 characters');
    }
    // Remove strict alphanumeric check to allow creative names, but sanitize output elsewhere
    return username.trim();
  },

  password: (password) => {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    return password;
  },

  flag: (flag) => {
    if (!flag || typeof flag !== 'string') {
      throw new Error('Invalid flag format');
    }
    // Enforce configurable max length from .env (default 200)
    // Length limit not exposed to users for security reasons
    const maxLength = config.validation.flagMaxLength;
    if (flag.length > maxLength) {
      throw new Error('Invalid flag format');
    }
    return flag.trim();
  },

  objectId: (id) => {
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new Error('Invalid ID');
    }
    return id;
  }
};

// Alias for compatibility if needed, or we refactor routes.
// Let's refactor routes to use 'validateInput' generally, 
// but auth.js uses 'enhancedValidation' so we export it as that too or alias.
const enhancedValidation = validateInput;

// 7. Secure File Upload Utility
const secureFileUpload = {
  maxFileSize: 5 * 1024 * 1024, // 5MB default
  validateFile: (file) => {
    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type');
    }

    // Validate file name (prevent directory traversal)
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      throw new Error('Invalid file name');
    }

    return true;
  }
};

// 6. Consolidated Export
module.exports = {
  loginLimiter,
  apiLimiter,
  submissionLimiter,
  refreshTokenLimiter,
  secureHeaders,
  mongoSanitize: mongoSanitize(), // Function call to initialize
  sanitizeInput,
  validateInput,
  enhancedValidation,
  secureFileUpload
};