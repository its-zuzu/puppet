const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const { getRedisClient } = require('../utils/redis');
const redisClient = getRedisClient();
const CACHE_TTL = Math.floor(config.redis.ttl.userCache / 1000); // Convert ms to seconds

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Priority 1: Check httpOnly cookie (secure, XSS-protected)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // Priority 2: Check Bearer token in header (backwards compatibility)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Calculate token lifetime and refresh threshold
    // Refresh when 10% of token lifetime remains (e.g., 2.4h for 24h token, 6min for 1h token)
    const tokenIssued = decoded.iat * 1000; // Convert to milliseconds
    const tokenExp = decoded.exp * 1000; // Convert to milliseconds
    const tokenLifetime = tokenExp - tokenIssued;
    const refreshThreshold = tokenLifetime * 0.10; // 10% of lifetime
    const now = Date.now();
    const timeRemaining = tokenExp - now;

    let newTokenGenerated = false;
    if (timeRemaining < refreshThreshold && timeRemaining > 0) {
      // Generate new token with same expiration as configured in .env
      const newToken = jwt.sign(
        { id: decoded.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );

      // Set new token in response header
      res.setHeader('X-New-Token', newToken);
      newTokenGenerated = true;
      console.log(`[Auth] Token refreshed for user ${decoded.id} (${Math.round(timeRemaining / 60000)}min remaining)`);
    }

    // Check cache first to reduce database load
    const cacheKey = `user:${decoded.id}`;

    let user;
    try {
      const cachedStr = await redisClient.get(cacheKey);
      if (cachedStr) {
        const cachedData = JSON.parse(cachedStr);
        // Restore Date objects for password check
        if (cachedData.passwordChangedAt) {
          cachedData.passwordChangedAt = new Date(cachedData.passwordChangedAt);
        }
        // Ensure _id is always a string for consistency
        if (cachedData._id && typeof cachedData._id === 'object') {
          cachedData._id = cachedData._id.toString();
        }
        user = cachedData;
      }
    } catch (e) {
      console.warn('Redis cache error:', e);
    }

    if (!user) {
      // Get user from database
      const dbUser = await User.findById(decoded.id).select('-password');

      if (!dbUser) {
        // Remove from cache if user no longer exists
        await redisClient.del(cacheKey);
        return res.status(401).json({
          success: false,
          message: 'User no longer exists'
        });
      }

      // Convert to plain object with _id as string for consistency
      const userObj = dbUser.toObject();
      userObj._id = userObj._id.toString();
      user = userObj;

      // Cache the user data
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(userObj));
    }

    // Check if user's password was changed after the token was issued
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          message: 'User recently changed password. Please login again'
        });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Authorize superadmin only
exports.authorizeSuperadmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Only superadmin can access this route'
    });
  }
  next();
};
