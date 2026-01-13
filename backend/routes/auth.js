const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const { protect, authorize } = require('../middleware/auth');

const {
  loginLimiter,
  sanitizeInput,
  validateInput,
  enhancedValidation
} = require('../middleware/security');
const { sendOTPEmail } = require('../utils/email');
const requestIp = require('request-ip');
const UAParser = require('ua-parser-js');
const moment = require('moment-timezone');

// Real-time logging function
const logActivity = (action, details = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] AUTH: ${action}`, details);
};
const crypto = require('crypto');
const { getRedisClient } = require('../utils/redis');
// Use centralized Redis client for scoreboard caching
const redisClient = getRedisClient();

// Helper function to get real IP address using request-ip
const getRealIP = (req) => {
  const clientIp = requestIp.getClientIp(req);
  // Clean up IPv6 mapped IPv4 addresses
  if (clientIp && clientIp.startsWith('::ffff:')) {
    return clientIp.substring(7);
  }
  return clientIp || 'Unknown';
};

// Helper function to parse user agent
const parseUserAgent = (userAgentString) => {
  if (!userAgentString) return 'Unknown';

  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  const browser = result.browser.name ? `${result.browser.name} ${result.browser.version}` : 'Unknown Browser';
  const os = result.os.name ? `${result.os.name} ${result.os.version}` : 'Unknown OS';
  const device = result.device.type ? result.device.type : 'desktop';

  return `${browser} on ${os} (${device})`;
};

// Helper function to create login log
const createLoginLog = async (user, req, status, failureReason = null) => {
  try {
    // Only create log if user exists (has valid _id)
    if (user && user._id) {
      // Get real IP address using request-ip library
      const realIP = getRealIP(req);

      // Parse user agent for better readability
      const rawUserAgent = req.get('User-Agent') || 'Unknown';
      const parsedUserAgent = parseUserAgent(rawUserAgent);

      // Create timestamp in Indian Standard Time (IST)
      const istTime = moment().tz('Asia/Kolkata').toDate();

      const loginLog = await LoginLog.create({
        user: user._id,
        email: user.email,
        username: user.username,
        ipAddress: realIP,
        userAgent: parsedUserAgent,
        loginTime: istTime,
        status,
        failureReason
      });

      console.log(`Login log created: ${user.username} - ${status} - IP: ${realIP} - Agent: ${parsedUserAgent}`);
      return loginLog;
    }
  } catch (error) {
    console.error('Error creating login log:', error);
  }
};

// Generate JWT Token (fully env-driven)
const generateToken = (id) => {
  try {
    console.log('[JWT Debug] process.env.JWT_SECRET:', process.env.JWT_SECRET ? 'EXISTS' : 'MISSING');
    console.log('[JWT Debug] config.jwt.secret:', config.jwt.secret ? 'EXISTS' : 'MISSING');
    console.log('[JWT Debug] config.jwt:', JSON.stringify(config.jwt));
    
    if (!config.jwt.secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    return jwt.sign({ id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  } catch (error) {
    console.error('[JWT Error]', error.message);
    throw error;
  }
};

// Helper: Set JWT in secure httpOnly cookie (XSS protection)
const setTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('token', token, {
    httpOnly: true,        // Cannot be accessed by JavaScript (XSS protection)
    secure: isProduction,  // Only sent over HTTPS in production
    sameSite: 'lax',       // CSRF protection while allowing same-site navigation
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/'
  });
};

// Helper: Clear token cookie on logout
const clearTokenCookie = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/'
  });
};

// @route   POST /api/auth/register
// @desc    Public registration disabled - Admin only
// @access  Public
router.post('/register', async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Public registration is currently disabled. Please contact the administrator for account creation.',
    adminContact: 'ctfquest@gmail.com',
    registrationDisabled: true
  });
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and activate user account
// @access  Public
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Verify OTP
    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark email as verified and clear OTP
    user.isEmailVerified = true;
    user.clearOTP();
    await user.save();

    // Generate token and set in httpOnly cookie
    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({
      success: true,
      message: 'Email verified successfully',
      // Token NOT sent in response body (httpOnly cookie only)
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error verifying OTP: ${error.message}` :
        'Error verifying OTP. Please try again later.'
    });
  }
});

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP to email
// @access  Public
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(user.email, otp);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP resent successfully'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error resending OTP: ${error.message}` :
        'Error resending OTP. Please try again later.'
    });
  }
});

// @route   POST /api/auth/register-admin
// @desc    Register a user (Admin only)
// @access  Private/Admin
router.post('/register-admin', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { username, email, password, teamId } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: userExists.email === email ?
          'Email already registered' :
          'Username already taken'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      team: teamId || undefined
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points,
        team: user.team
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error creating user: ${error.message}` :
        'Error creating user. Please try again later.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', sanitizeInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Enhanced input validation
    let validatedEmail;
    try {
      validatedEmail = enhancedValidation.email(email);
      logActivity('LOGIN_ATTEMPT', { email: validatedEmail, ip: req.ip, userAgent: req.get('User-Agent') });
    } catch (validationError) {
      logActivity('LOGIN_VALIDATION_FAILED', { email, error: validationError.message, ip: req.ip });
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    // Check for user
    const user = await User.findOne({ email: validatedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check for account locking (Relaxed: 20 attempts, 5 min lock)
    if (user.isLocked()) {
      await createLoginLog(user, req, 'failed', 'Account locked');

      return res.status(429).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.',
        retryAfter: Math.ceil((user.lockUntil - Date.now()) / 1000)
      });
    }

    // Check if user is blocked by admin
    if (user.isBlocked) {
      await createLoginLog(user, req, 'failed', 'Account blocked by admin');

      return res.status(403).json({
        success: false,
        message: 'You are blocked. Suspicious activity detected. Contact Admin for further information.',
        isBlocked: true,
        blockedReason: user.blockedReason
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      // Log failed login attempt and increment counter
      await user.incrementLoginAttempts();
      await createLoginLog(user, req, 'failed', 'Invalid password');

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();

    // Log successful login and reset attempts
    console.log('[Debug] Resetting login attempts...');
    await user.resetLoginAttempts();
    console.log('[Debug] Creating login log...');
    await createLoginLog(user, req, 'success');

    // Populate team info
    console.log('[Debug] Populating team...');
    try {
      await user.populate('team');
      console.log('[Debug] Team populated:', user.team ? user.team._id : 'No team');
    } catch (popErr) {
      console.error('[Debug] Populate error:', popErr);
    }

    // Generate token and set in httpOnly cookie
    console.log('[Debug] Generating token...');
    const token = generateToken(user._id.toString());
    setTokenCookie(res, token);
    console.log('[Debug] Token set in httpOnly cookie.');

    logActivity('LOGIN_SUCCESS', { userId: user._id, username: user.username, ip: req.ip, userAgent: req.get('User-Agent') });

    console.log('[Debug] Sending response...');

    res.json({
      success: true,
      // Token NOT sent in response body (httpOnly cookie only)
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points,
        team: user.team
      }
    });
  } catch (error) {
    console.error('[Login Error]', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error logging in'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and clear token cookie
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    clearTokenCookie(res);
    
    logActivity('LOGOUT_SUCCESS', { 
      userId: req.user._id, 
      username: req.user.username 
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
});

// @route   POST /api/auth/forgotpassword
// @desc    Forgot password
// @access  Public
router.post('/forgotpassword', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'There is no user with that email'
      });
    }

    // Get reset token
    const resetToken = user.createPasswordResetToken();
    await user.save();

    // TODO: Send email with reset token
    // For now, just return the token in development
    if (process.env.NODE_ENV === 'development') {
      return res.json({
        success: true,
        resetToken
      });
    }

    res.json({
      success: true,
      message: 'Email sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error processing request'
    });
  }
});

// @route   POST /api/auth/resetpassword/:resettoken
// @desc    Reset password
// @access  Public
router.post('/resetpassword/:resettoken', async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error resetting password'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  // Prevent HTTP caching to avoid 304 responses
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  try {
    // Use req.user._id directly (now always a string from middleware)
    const user = await User.findById(req.user._id).populate('team');

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        isBlocked: true,
        message: 'Your account has been blocked. Contact Admin for further information.',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isBlocked: user.isBlocked,
          blockedReason: user.blockedReason,
          blockedAt: user.blockedAt
        }
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points,
        team: user.team,
        solvedChallenges: user.solvedChallenges,
        createdAt: user.createdAt,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error fetching user data'
    });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users with pagination (admin only)
// @access  Private/Admin
router.get('/users', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { all, search } = req.query;

    // Build search query
    let query = {};
    if (search) {
      // Sanitize regex input to prevent ReDoS attacks
      const sanitized = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 50);
      query.$or = [
        { username: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } }
      ];
    }

    if (all === 'true') {
      // Return all users without pagination for team creation
      const users = await User.find(query)
        .select('-password')
        .populate('team', 'name')
        .sort({ username: 1 });

      return res.json({
        success: true,
        count: users.length,
        total: users.length,
        users
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .populate('team', 'name')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      total: totalUsers,
      page,
      pages: Math.ceil(totalUsers / limit),
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error fetching users'
    });
  }
});

// @route   GET /api/auth/users/:id
// @desc    Get single user by ID (admin only or own profile)
// @access  Private/Admin
router.get('/users/:id', protect, async (req, res) => {
  try {
    // Allow users to view their own profile or admins to view any profile
    const isOwnProfile = req.user._id.toString() === req.params.id; // Fixed: added .toString()
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own profile.'
      });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// @route   GET /api/auth/user/:id
// @desc    Get public user profile by ID
// @access  Private
router.get('/user/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username points solvedChallenges personallySolvedChallenges unlockedHints team createdAt')
      .populate('team', 'name');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error fetching user'
    });
  }
});

// REMOVED: Old broken reset endpoints
// New enterprise-grade reset endpoints available at /api/admin/reset/*
// See backend/routes/adminReset.js for implementation

// @route   PUT /api/auth/users/:id/role
// @desc    Change user role (Admin/Superadmin)
// @access  Private/Admin
router.put('/users/:id/role', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can change user roles'
      });
    }

    const { newRole } = req.body;

    if (!newRole || !['admin', 'user'].includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "admin" or "user"'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change superadmin role'
      });
    }

    const oldRole = user.role;
    user.role = newRole;
    await user.save();

    res.json({
      success: true,
      message: `User role changed from ${oldRole} to ${newRole}`,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error changing user role:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error changing role: ${error.message}` :
        'Error changing user role. Please try again.'
    });
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user (Admin only)
// @access  Private/Admin
router.delete('/users/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete superadmin user'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error deleting user: ${error.message}` :
        'Error deleting user. Please try again.'
    });
  }
});

// @route   PUT /api/auth/users/:id/block
// @desc    Block or unblock a user (Admin only)
// @access  Private/Admin
router.put('/users/:id/block', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { isBlocked, reason } = req.body;

    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isBlocked must be a boolean'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot block superadmin user'
      });
    }

    user.isBlocked = isBlocked;
    user.blockedReason = isBlocked ? reason || 'No reason provided' : null;
    user.blockedAt = isBlocked ? new Date() : null;
    await user.save();

    res.json({
      success: true,
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        isBlocked: user.isBlocked,
        blockedReason: user.blockedReason
      }
    });
  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error updating user block status: ${error.message}` :
        'Error updating user block status. Please try again.'
    });
  }
});

// @route   PUT /api/auth/users/:id/submission-permission
// @desc    Update user submission permission (Admin only)
// @access  Private/Admin
router.put('/users/:id/submission-permission', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { canSubmitFlags } = req.body;

    if (typeof canSubmitFlags !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'canSubmitFlags must be a boolean'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.canSubmitFlags = canSubmitFlags;
    await user.save();

    res.json({
      success: true,
      message: `User submission permission ${canSubmitFlags ? 'allowed' : 'blocked'}`,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        canSubmitFlags: user.canSubmitFlags
      }
    });
  } catch (error) {
    console.error('Error updating submission permission:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error updating submission permission: ${error.message}` :
        'Error updating submission permission. Please try again.'
    });
  }
});

// @route   PUT /api/auth/users/:id/scoreboard-visibility
// @desc    Update user scoreboard visibility (Admin only)
// @access  Private/Admin
router.put('/users/:id/scoreboard-visibility', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { showInScoreboard } = req.body;

    if (typeof showInScoreboard !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'showInScoreboard must be a boolean'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.showInScoreboard = showInScoreboard;
    await user.save();

    res.json({
      success: true,
      message: `User ${showInScoreboard ? 'shown on' : 'hidden from'} scoreboard`,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        showInScoreboard: user.showInScoreboard
      }
    });
  } catch (error) {
    console.error('Error updating scoreboard visibility:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error updating scoreboard visibility: ${error.message}` :
        'Error updating scoreboard visibility. Please try again.'
    });
  }
});

// @route   PUT /api/platform-control/block-submissions
// @desc    Block or allow all submissions globally (Admin only)
// @access  Private/Admin
router.put('/platform-control/block-submissions', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { submissionsAllowed } = req.body;

    if (typeof submissionsAllowed !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'submissionsAllowed must be a boolean'
      });
    }

    const Challenge = require('../models/Challenge');

    await Challenge.updateMany(
      {},
      { submissionsAllowed }
    );

    res.json({
      success: true,
      message: `All submissions ${submissionsAllowed ? 'allowed' : 'blocked'}`,
      data: {
        submissionsAllowed
      }
    });
  } catch (error) {
    console.error('Error updating global submission status:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error updating submission status: ${error.message}` :
        'Error updating submission status. Please try again.'
    });
  }
});

// @route   GET /api/auth/platform-control/settings
// @desc    Get platform control settings (Admin only)
// @access  Private/Admin
router.get('/platform-control/settings', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const scoreboardEnabled = process.env.SCOREBOARD_ENABLED !== 'false';
    const maxConnections = parseInt(process.env.MAX_CONNECTIONS) || 100;

    res.json({
      success: true,
      data: {
        scoreboardEnabled,
        maxConnections
      }
    });
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching platform settings'
    });
  }
});

// @route   PUT /api/platform-control/scoreboard-toggle
// @desc    Enable or disable scoreboard globally (Admin only)
// @access  Private/Admin
router.put('/platform-control/scoreboard-toggle', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { scoreboardEnabled } = req.body;

    if (typeof scoreboardEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'scoreboardEnabled must be a boolean'
      });
    }

    // Store in environment or database - for now using a simple approach
    process.env.SCOREBOARD_ENABLED = scoreboardEnabled.toString();

    res.json({
      success: true,
      message: `Scoreboard ${scoreboardEnabled ? 'enabled' : 'disabled'}`,
      data: {
        scoreboardEnabled
      }
    });
  } catch (error) {
    console.error('Error updating scoreboard status:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error updating scoreboard status: ${error.message}` :
        'Error updating scoreboard status. Please try again.'
    });
  }
});

// @route   PUT /api/platform-control/connection-limit
// @desc    Set maximum concurrent connections (Admin only)
// @access  Private/Admin
router.put('/platform-control/connection-limit', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { maxConnections } = req.body;

    if (typeof maxConnections !== 'number' || maxConnections < 1) {
      return res.status(400).json({
        success: false,
        message: 'maxConnections must be a positive number'
      });
    }

    // Store in environment variable for simplicity
    process.env.MAX_CONNECTIONS = maxConnections.toString();

    res.json({
      success: true,
      message: `Connection limit set to ${maxConnections}`,
      data: {
        maxConnections
      }
    });
  } catch (error) {
    console.error('Error updating connection limit:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error updating connection limit: ${error.message}` :
        'Error updating connection limit. Please try again.'
    });
  }
});

// @route   PUT /api/platform-control/unblock-all-users
// @desc    Unblock all blocked users (Admin only)
// @access  Private/Admin
router.put('/platform-control/unblock-all-users', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const result = await User.updateMany(
      { isBlocked: true },
      {
        $set: {
          isBlocked: false,
          blockedReason: null,
          blockedAt: null
        }
      }
    );

    res.json({
      success: true,
      message: 'All users unblocked successfully',
      data: {
        unblockedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error unblocking all users:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error unblocking users: ${error.message}` :
        'Error unblocking users. Please try again.'
    });
  }
});

// @route   PUT /api/platform-control/unblock-by-email/:email
// @desc    Unblock a user by email (Admin only)
// @access  Private/Admin
router.put('/platform-control/unblock-by-email/:email', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isBlocked = false;
    user.blockedReason = null;
    user.blockedAt = null;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.username} unblocked successfully`,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    console.error('Error unblocking user by email:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error unblocking user: ${error.message}` :
        'Error unblocking user. Please try again.'
    });
  }
});

// @route   GET /api/auth/admin/login-logs
// @desc    Get login logs (Admin only)
// @access  Private/Admin
router.get('/admin/login-logs', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { userId, status, search } = req.query;

    // Build query
    let query = {};
    if (userId) query.user = userId;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const totalLogs = await LoginLog.countDocuments(query);
    const logs = await LoginLog.find(query)
      .populate('user', 'username email role')
      .sort({ loginTime: -1, createdAt: -1, _id: -1 })
      .limit(limit)
      .skip(skip);

    res.json({
      success: true,
      count: logs.length,
      total: totalLogs,
      page,
      pages: Math.ceil(totalLogs / limit),
      logs
    });
  } catch (error) {
    console.error('Error fetching login logs:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error fetching login logs'
    });
  }
});

// @route   GET /api/auth/admin/login-logs/:userId
// @desc    Get login logs for specific user (Admin only)
// @access  Private/Admin
router.get('/admin/login-logs/:userId', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const totalLogs = await LoginLog.countDocuments({ user: userId });
    const logs = await LoginLog.find({ user: userId })
      .populate('user', 'username email role')
      .sort({ loginTime: -1 })
      .limit(limit)
      .skip(skip);

    res.json({
      success: true,
      count: logs.length,
      total: totalLogs,
      page,
      pages: Math.ceil(totalLogs / limit),
      logs
    });
  } catch (error) {
    console.error('Error fetching user login logs:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error fetching user login logs'
    });
  }
});

// @route   DELETE /api/auth/admin/login-logs
// @desc    Clear all login logs (Admin only)
// @access  Private/Admin
router.delete('/admin/login-logs', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    // Delete all login logs
    const result = await LoginLog.deleteMany({});

    res.json({
      success: true,
      message: `Deleted all ${result.deletedCount} login logs`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing login logs:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error clearing login logs'
    });
  }
});

// @route   PUT /api/auth/admin/change-password
// @desc    Change admin password (Admin only - can only change own password)
// @access  Private/Admin
router.put('/admin/change-password', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get current user with password
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logActivity('ADMIN_PASSWORD_CHANGED', { userId: user._id, username: user.username });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing admin password:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error changing password: ${error.message}` :
        'Error changing password. Please try again.'
    });
  }
});





module.exports = router;

