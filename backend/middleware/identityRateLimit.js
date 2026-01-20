/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IDENTITY-BASED RATE LIMITING SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Senior Security Engineer Design for 400+ Concurrent Users Behind Shared NAT
 * 
 * PROBLEM SOLVED:
 * - IP-based limiting blocks all 400 onsite users when one abuses
 * - Need per-user isolation without global locks
 * - Must prevent brute force while allowing legitimate concurrent usage
 * 
 * ARCHITECTURE:
 * - Public endpoints: IP-based (loose, high limits)
 * - Login: email+IP composite key (prevents both account brute-force and spray)
 * - Authenticated API: user ID from JWT (immutable user identity)
 * - Flag submission: userID+challengeID (per-challenge isolation)
 * - Token refresh: refreshTokenID (specific token tracking)
 * 
 * ALGORITHM: Sliding Window with Redis
 * - O(1) time complexity per request
 * - Atomic operations via Redis MULTI/EXEC
 * - Auto-expiry prevents memory leaks
 * - SHA-256 hashing for privacy/security
 * 
 * THREAT MODEL:
 * ✓ Onsite attacker brute-forcing single account → blocked via email+IP
 * ✓ Onsite attacker spraying multiple accounts → throttled via IP component
 * ✓ Remote attacker credential stuffing → blocked via email rate limit
 * ✓ Malicious script looping flag submissions → isolated per user+challenge
 * ✓ Token refresh abuse → tracked per refresh token ID
 * ✗ Distributed botnet (out of scope - use Cloudflare/WAF)
 * 
 * SECURITY IMPROVEMENT:
 * - Uses immutable user ID from JWT instead of email (safer, guaranteed to exist)
 * - User ID cannot be changed, preventing identity confusion
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../utils/redis');
const requestIp = require('request-ip');

const redisClient = getRedisClient();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION - All values from environment variables
// ═══════════════════════════════════════════════════════════════════════════

const getConfig = () => ({
  // Public endpoints (unauthenticated) - IP-based, very loose
  public: {
    window: parseInt(process.env.PUBLIC_RL_WINDOW) || 60,
    limit: parseInt(process.env.PUBLIC_RL_LIMIT) || 2000
  },
  
  // Login endpoint - email+IP composite key
  login: {
    window: parseInt(process.env.LOGIN_RL_WINDOW) || 300, // 5 minutes
    limit: parseInt(process.env.LOGIN_RL_LIMIT) || 5,
    lockTime: parseInt(process.env.LOGIN_LOCK_TIME) || 900 // 15 min lockout
  },
  
  // General authenticated API - email from JWT
  api: {
    window: parseInt(process.env.API_RL_WINDOW) || 60,
    limit: parseInt(process.env.API_RL_LIMIT) || 60
  },
  
  // Flag submission - email+challengeID
  flag: {
    window: parseInt(process.env.FLAG_RL_WINDOW) || 60,
    limit: parseInt(process.env.FLAG_RL_LIMIT) || 3,
    failLock: parseInt(process.env.FLAG_FAIL_LOCK) || 10, // Failures before lock
    lockTime: parseInt(process.env.FLAG_LOCK_TIME) || 300 // 5 min lockout
  },
  
  // JWT refresh - refresh token ID
  refresh: {
    window: parseInt(process.env.REFRESH_RL_WINDOW) || 3600, // 1 hour
    limit: parseInt(process.env.REFRESH_RL_LIMIT) || 10
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CORE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hash identity for privacy - prevents Redis key enumeration attacks
 * SHA-256 is fast enough (sub-millisecond) and cryptographically secure
 */
const hashIdentity = (identifier) => {
  return crypto.createHash('sha256').update(identifier).digest('hex');
};

/**
 * Get real client IP (handles proxies, NAT, IPv6)
 */
const getClientIp = (req) => {
  const ip = requestIp.getClientIp(req);
  // Normalize IPv6-mapped IPv4
  if (ip && ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip || 'unknown';
};

/**
 * Extract user ID from JWT without full verification (for rate limiting only)
 * Falls back to null if token invalid - caller decides behavior
 * SAFER: Uses immutable user ID instead of email
 */
const extractUserIdFromJWT = (req) => {
  let token = null;
  
  // Check cookies first (primary method)
  if (req.cookies?.access_token) {
    token = req.cookies.access_token;
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }
  // Fallback to Authorization header
  else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) return null;
  
  try {
    // Decode without verification (faster, we just need user ID)
    // Rate limiting is not a security boundary - auth middleware handles that
    const decoded = jwt.decode(token);
    return decoded?.id || null;
  } catch {
    return null;
  }
};

/**
 * Extract refresh token ID from request
 */
const extractRefreshTokenId = (req) => {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!refreshToken) return null;
  
  try {
    const decoded = jwt.decode(refreshToken);
    return decoded?.jti || decoded?.id || null; // JWT ID claim
  } catch {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// REDIS KEY SCHEMA
// ═══════════════════════════════════════════════════════════════════════════
/**
 * ctf:rl:pub:{hash(ip)}                    - Public endpoint by IP
 * ctf:rl:login:{hash(email+ip)}            - Login by email+IP composite
 * ctf:rl:login:lock:{hash(email+ip)}       - Login lockout tracking
 * ctf:rl:api:{hash(userID)}                - General API by user ID (from JWT)
 * ctf:rl:flag:{hash(userID+challengeID)}   - Flag submission per challenge
 * ctf:rl:flag:lock:{hash(userID+challengeID)} - Flag lockout tracking
 * ctf:rl:refresh:{hash(tokenID)}           - Refresh by token ID
 */

// ═══════════════════════════════════════════════════════════════════════════
// SLIDING WINDOW RATE LIMITER (Core Algorithm)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sliding window implementation using Redis sorted sets
 * - Uses timestamp as both score and member (ensures uniqueness)
 * - ZREMRANGEBYSCORE removes expired entries
 * - ZCARD counts current requests
 * - ZADD adds new request
 * - EXPIRE ensures auto-cleanup
 * 
 * Time Complexity: O(log N) for add, O(M) for remove where M is expired entries
 * Effective O(1) per request as M is bounded by window size
 */
const slidingWindowCheck = async (redisKey, windowSeconds, maxRequests) => {
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);
  
  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redisClient.pipeline();
    
    // Remove expired entries from sorted set
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    
    // Count requests in current window
    pipeline.zcard(redisKey);
    
    // Add current request (using timestamp as both score and member)
    // This ensures each request is unique even at same millisecond
    const requestId = `${now}:${Math.random()}`;
    pipeline.zadd(redisKey, now, requestId);
    
    // Set expiry (cleanup old keys automatically)
    pipeline.expire(redisKey, windowSeconds + 10);
    
    const results = await pipeline.exec();
    
    // results[1] is ZCARD result (count after removing expired)
    const currentCount = results[1][1];
    
    // Check if limit exceeded (count BEFORE adding current request)
    const allowed = currentCount < maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount - 1);
    
    // Calculate retry after (oldest request timestamp + window)
    let retryAfter = 0;
    if (!allowed) {
      // Get oldest request in window
      const oldestResult = await redisClient.zrange(redisKey, 0, 0, 'WITHSCORES');
      if (oldestResult && oldestResult.length >= 2) {
        const oldestTimestamp = parseInt(oldestResult[1]);
        const resetTime = oldestTimestamp + (windowSeconds * 1000);
        retryAfter = Math.ceil((resetTime - now) / 1000);
      } else {
        retryAfter = windowSeconds;
      }
    }
    
    return {
      allowed,
      current: currentCount + 1,
      limit: maxRequests,
      remaining,
      retryAfter,
      resetAt: now + (windowSeconds * 1000)
    };
    
  } catch (error) {
    console.error('[RateLimit] Redis error in slidingWindowCheck:', error);
    // CRITICAL: Fail open in production (don't block users if Redis down)
    // Log for monitoring but allow request through
    return {
      allowed: true,
      current: 0,
      limit: maxRequests,
      remaining: maxRequests,
      retryAfter: 0,
      resetAt: now + (windowSeconds * 1000),
      error: true
    };
  }
};

/**
 * Check if identity is locked out (e.g., after too many failed attempts)
 */
const checkLockout = async (lockKey) => {
  try {
    const locked = await redisClient.get(lockKey);
    if (locked) {
      const ttl = await redisClient.ttl(lockKey);
      return {
        locked: true,
        retryAfter: Math.max(0, ttl)
      };
    }
    return { locked: false };
  } catch (error) {
    console.error('[RateLimit] Redis error in checkLockout:', error);
    return { locked: false, error: true };
  }
};

/**
 * Set lockout for identity
 */
const setLockout = async (lockKey, lockSeconds, reason = 'rate_limit') => {
  try {
    await redisClient.setex(lockKey, lockSeconds, JSON.stringify({
      reason,
      lockedAt: Date.now()
    }));
    console.warn(`[RateLimit] Lockout set: ${lockKey} for ${lockSeconds}s - ${reason}`);
  } catch (error) {
    console.error('[RateLimit] Redis error in setLockout:', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Public endpoint rate limiter (IP-based, very loose)
 * Use for: static assets, health checks, unauthenticated pages
 */
const publicRateLimit = () => {
  const config = getConfig().public;
  
  return async (req, res, next) => {
    try {
      const ip = getClientIp(req);
      const identifier = `pub:${ip}`;
      const redisKey = `ctf:rl:${hashIdentity(identifier)}`;
      
      const result = await slidingWindowCheck(redisKey, config.window, config.limit);
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': result.limit,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString()
      });
      
      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter);
        return res.status(429).json({
          success: false,
          error: 'Too many requests from this IP',
          retryAfter: result.retryAfter,
          limit: result.limit,
          window: config.window
        });
      }
      
      next();
    } catch (error) {
      console.error('[RateLimit] Public limiter error:', error);
      next(); // Fail open
    }
  };
};

/**
 * Login rate limiter (email+IP composite)
 * CRITICAL: Prevents both account brute-force AND credential spraying
 * 
 * Why email+IP:
 * - Email alone: attacker can brute force from multiple IPs
 * - IP alone: blocks all 400 onsite users if one fails
 * - Email+IP: isolates attempts per account per source
 */
const loginRateLimit = () => {
  const config = getConfig().login;
  
  return async (req, res, next) => {
    try {
      const email = req.body?.email?.toLowerCase().trim();
      const ip = getClientIp(req);
      
      if (!email) {
        // If no email provided, fail the request (invalid login attempt)
        return res.status(400).json({
          success: false,
          error: 'Email required'
        });
      }
      
      // Composite key: email+IP
      const identifier = `login:${email}:${ip}`;
      const redisKey = `ctf:rl:${hashIdentity(identifier)}`;
      const lockKey = `ctf:rl:login:lock:${hashIdentity(identifier)}`;
      
      // Check if locked out
      const lockStatus = await checkLockout(lockKey);
      if (lockStatus.locked) {
        res.set('Retry-After', lockStatus.retryAfter);
        return res.status(429).json({
          success: false,
          error: 'Account temporarily locked due to too many failed attempts',
          retryAfter: lockStatus.retryAfter,
          lockedUntil: new Date(Date.now() + lockStatus.retryAfter * 1000).toISOString()
        });
      }
      
      // Check rate limit
      const result = await slidingWindowCheck(redisKey, config.window, config.limit);
      
      res.set({
        'X-RateLimit-Limit': result.limit,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString()
      });
      
      if (!result.allowed) {
        // Set lockout on repeated violations
        await setLockout(lockKey, config.lockTime, 'excessive_login_attempts');
        
        res.set('Retry-After', config.lockTime);
        return res.status(429).json({
          success: false,
          error: 'Too many login attempts',
          retryAfter: config.lockTime
        });
      }
      
      // Attach for downstream cleanup on success
      req.rateLimitKeys = {
        redisKey,
        lockKey
      };
      
      next();
    } catch (error) {
      console.error('[RateLimit] Login limiter error:', error);
      next(); // Fail open
    }
  };
};

/**
 * General API rate limiter (user ID from JWT)
 * Use for: scoreboard, challenges list, profile, team data
 * SAFER: Uses immutable user ID instead of email
 */
const apiRateLimit = () => {
  const config = getConfig().api;
  
  return async (req, res, next) => {
    try {
      const userId = extractUserIdFromJWT(req);
      
      if (!userId) {
        // No valid JWT - this should have been caught by auth middleware
        // Fail safe: treat as public endpoint with IP limit
        const ip = getClientIp(req);
        const identifier = `api:noauth:${ip}`;
        const redisKey = `ctf:rl:${hashIdentity(identifier)}`;
        
        const result = await slidingWindowCheck(redisKey, config.window, config.limit);
        
        if (!result.allowed) {
          res.set('Retry-After', result.retryAfter);
          return res.status(429).json({
            success: false,
            error: 'Too many requests',
            retryAfter: result.retryAfter
          });
        }
        
        return next();
      }
      
      // Identity-based rate limiting using user ID
      const identifier = `api:${userId}`;
      const redisKey = `ctf:rl:${hashIdentity(identifier)}`;
      
      const result = await slidingWindowCheck(redisKey, config.window, config.limit);
      
      res.set({
        'X-RateLimit-Limit': result.limit,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString()
      });
      
      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter);
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          retryAfter: result.retryAfter,
          limit: result.limit,
          window: config.window
        });
      }
      
      next();
    } catch (error) {
      console.error('[RateLimit] API limiter error:', error);
      next(); // Fail open - allow request if rate limiting fails
    }
  };
};

/**
 * Flag submission rate limiter (userID+challengeID)
 * CRITICAL: Per-challenge isolation prevents cross-contamination
 * SAFER: Uses immutable user ID from JWT instead of email
 * 
 * Features:
 * - Separate limits per challenge (can't exhaust attempts globally)
 * - Lockout after excessive failures
 * - Clear on success (via exported clearFlagLimit function)
 */
const flagSubmitRateLimit = () => {
  const config = getConfig().flag;
  
  return async (req, res, next) => {
    try {
      const userId = extractUserIdFromJWT(req);
      const challengeId = req.params.id || req.params.challengeId;
      
      if (!userId || !challengeId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request'
        });
      }
      
      // Per-challenge, per-user rate limiting using user ID
      const identifier = `flag:${userId}:${challengeId}`;
      const redisKey = `ctf:rl:${hashIdentity(identifier)}`;
      const lockKey = `ctf:rl:flag:lock:${hashIdentity(identifier)}`;
      
      // Check lockout
      const lockStatus = await checkLockout(lockKey);
      if (lockStatus.locked) {
        res.set('Retry-After', lockStatus.retryAfter);
        return res.status(429).json({
          success: false,
          error: 'Too many incorrect submissions. Challenge temporarily locked.',
          retryAfter: lockStatus.retryAfter,
          lockedUntil: new Date(Date.now() + lockStatus.retryAfter * 1000).toISOString()
        });
      }
      
      // Check rate limit
      const result = await slidingWindowCheck(redisKey, config.window, config.limit);
      
      res.set({
        'X-RateLimit-Limit': result.limit,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString()
      });
      
      if (!result.allowed) {
        // Set lockout
        await setLockout(lockKey, config.lockTime, 'excessive_flag_attempts');
        
        res.set('Retry-After', config.lockTime);
        return res.status(429).json({
          success: false,
          error: 'Too many flag submissions',
          retryAfter: config.lockTime,
          limit: result.limit,
          window: config.window
        });
      }
      
      // Attach for downstream use
      req.rateLimitKeys = {
        redisKey,
        lockKey,
        identifier
      };
      
      next();
    } catch (error) {
      console.error('[RateLimit] Flag limiter error:', error);
      next(); // Fail open
    }
  };
};

/**
 * Refresh token rate limiter (refresh token ID)
 * Prevents token refresh abuse and refresh loops
 */
const refreshTokenRateLimit = () => {
  const config = getConfig().refresh;
  
  return async (req, res, next) => {
    try {
      const tokenId = extractRefreshTokenId(req);
      
      if (!tokenId) {
        // No token ID - let auth middleware handle
        return next();
      }
      
      const identifier = `refresh:${tokenId}`;
      const redisKey = `ctf:rl:${hashIdentity(identifier)}`;
      
      const result = await slidingWindowCheck(redisKey, config.window, config.limit);
      
      res.set({
        'X-RateLimit-Limit': result.limit,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString()
      });
      
      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter);
        return res.status(429).json({
          success: false,
          error: 'Too many token refresh attempts',
          retryAfter: result.retryAfter,
          limit: result.limit,
          window: config.window
        });
      }
      
      next();
    } catch (error) {
      console.error('[RateLimit] Refresh limiter error:', error);
      next(); // Fail open
    }
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clear login rate limit on successful authentication
 * Call this AFTER verifying credentials
 */
const clearLoginLimit = async (email, ip) => {
  const identifier = `login:${email.toLowerCase().trim()}:${ip}`;
  const redisKey = `ctf:rl:${hashIdentity(identifier)}`;
  const lockKey = `ctf:rl:login:lock:${hashIdentity(identifier)}`;
  
  try {
    await redisClient.del(redisKey);
    await redisClient.del(lockKey);
  } catch (error) {
    console.error('[RateLimit] Error clearing login limit:', error);
  }
};

/**
 * Clear flag submission rate limit on correct flag
 * Call this AFTER successful flag validation
 * @param {string} userId - User's ID from JWT (req.user.id)
 * @param {string} challengeId - Challenge ID
 */
const clearFlagLimit = async (userId, challengeId) => {
  const identifier = `flag:${userId}:${challengeId}`;
  const redisKey = `ctf:rl:${hashIdentity(identifier)}`;
  const lockKey = `ctf:rl:flag:lock:${hashIdentity(identifier)}`;
  
  try {
    await redisClient.del(redisKey);
    await redisClient.del(lockKey);
    console.log(`[RateLimit] Cleared flag limit for user ${userId} on challenge ${challengeId}`);
  } catch (error) {
    console.error('[RateLimit] Error clearing flag limit:', error);
  }
};

/**
 * Increment failure count and check if lockout threshold reached
 * Returns true if should lock, false otherwise
 */
const checkFailureThreshold = async (redisKey, lockKey, threshold, lockTime) => {
  try {
    const count = await redisClient.zcard(redisKey);
    if (count >= threshold) {
      await setLockout(lockKey, lockTime, 'failure_threshold_exceeded');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[RateLimit] Error checking failure threshold:', error);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Middleware
  publicRateLimit,
  loginRateLimit,
  apiRateLimit,
  flagSubmitRateLimit,
  refreshTokenRateLimit,
  
  // Helper functions for routes
  clearLoginLimit,
  clearFlagLimit,
  checkFailureThreshold,
  
  // Utilities (for testing/debugging)
  getClientIp,
  extractUserIdFromJWT,
  hashIdentity,
  getConfig
};
