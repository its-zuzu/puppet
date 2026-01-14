const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { protect, authorize } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { sanitizeInput, validateInput } = require('../middleware/security');
const requestIp = require('request-ip');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');
const { checkEventNotEnded, isEventEnded } = require('../middleware/eventState');

const { getRedisClient } = require('../utils/redis');
const { clearScoreboardCache } = require('../utils/redis');
// Use centralized Redis for Challenge Rate Limiting
const redisClient = getRedisClient();

// Real-time logging function
const logActivity = (action, details = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] CHALLENGE: ${action}`, details);
};

const config = require('../config');

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return id && /^[0-9a-fA-F]{24}$/.test(id);
};

// ... (other imports)

// Redis-based Rate limiting for flag submissions
const checkFlagSubmissionRate = async (userId, challengeId) => {
  try {
    const key = `rate:flag:${userId}:${challengeId}`;
    const maxAttempts = config.rateLimit.flagSubmit.maxAttempts;
    const windowSeconds = config.rateLimit.flagSubmit.windowSeconds;
    const cooldownSeconds = config.rateLimit.flagSubmit.cooldownSeconds;

    // Get attempts from Redis
    const attempts = await redisClient.lrange(key, 0, -1);
    const now = Date.now();

    // Check if user is in cooldown (blocked)
    const blockedKey = `rate:blocked:${userId}:${challengeId}`;
    const isBlocked = await redisClient.get(blockedKey);

    if (isBlocked) {
      const ttl = await redisClient.ttl(blockedKey);
      return { allowed: false, remainingTime: ttl > 0 ? ttl : cooldownSeconds };
    }

    // Filter old attempts (older than window)
    const validAttempts = attempts.filter(time => (now - parseInt(time)) < (windowSeconds * 1000));

    // If we filtered out attempts, update the list asynchronously
    if (validAttempts.length < attempts.length) {
      // Use pipeline for atomicity/efficiency
      const pipeline = redisClient.pipeline();
      pipeline.del(key);
      if (validAttempts.length > 0) {
        pipeline.rpush(key, ...validAttempts);
        pipeline.expire(key, windowSeconds);
      }
      await pipeline.exec();
    }

    // Check limit
    if (validAttempts.length >= maxAttempts) {
      // Block user
      await redisClient.setex(blockedKey, cooldownSeconds, 'blocked');
      return { allowed: false, remainingTime: cooldownSeconds };
    }

    return { allowed: true };
  } catch (error) {
    // Fallback if Redis is down: Allow submission but log error
    console.error('[RateLimit] Redis error, failing open:', error.message);
    return { allowed: true };
  }

  return { allowed: true };
};

// Record failed flag submission
const recordFailedSubmission = async (userId, challengeId) => {
  try {
    const key = `rate:flag:${userId}:${challengeId}`;
    const now = Date.now();
    const windowSeconds = config.rateLimit.flagSubmit.windowSeconds;

    await redisClient.rpush(key, now);
    await redisClient.expire(key, windowSeconds);
  } catch (error) {
    console.error('[RateLimit] Error recording failure:', error.message);
  }
};

// Clear attempts on successful submission
const clearSubmissionAttempts = async (userId, challengeId) => {
  try {
    const key = `rate:flag:${userId}:${challengeId}`;
    const blockedKey = `rate:blocked:${userId}:${challengeId}`;

    await redisClient.del(key);
    await redisClient.del(blockedKey);
  } catch (error) {
    console.error('[RateLimit] Error clearing attempts:', error.message);
  }
};

// @route   GET /api/challenges
// @desc    Get all challenges with pagination (filtered by visibility for non-admin users)
// @access  Public
router.get('/', sanitizeInput, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if user is authenticated and get user info
    let user = null;
    let token = null;
    
    // Check for token in cookie first (new method), then Authorization header (backward compatibility)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(decoded.id);
      } catch (err) {
        // Token invalid, continue as non-authenticated user
      }
    }

    const query = {};
    // Show all challenges to admins, only visible challenges to others
    const isAdmin = user && user.role === 'admin';

    if (!isAdmin) {
      query.isVisible = true;

      // Try cache for public users
      const cacheKey = 'challenges:list:public';
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          // Add cache hit header for debugging
          res.setHeader('X-Cache', 'HIT');
          return res.json(JSON.parse(cachedData));
        }
      } catch (err) {
        console.error('Redis cache error:', err);
      }
    }

    const total = await Challenge.countDocuments(query);
    const challenges = await Challenge.find(query)
      .select('-flag')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    // Add current dynamic value to each challenge
    const enrichedChallenges = challenges.map(challenge => {
      const challengeObj = challenge.toObject();
      challengeObj.currentValue = challenge.getCurrentValue();
      return challengeObj;
    });

    const response = {
      success: true,
      count: enrichedChallenges.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: enrichedChallenges
    };

    // Cache public response (30 seconds for dynamic scoring)
    if (!isAdmin) {
      try {
        await redisClient.setex('challenges:list:public', 30, JSON.stringify(response));
        res.setHeader('X-Cache', 'MISS');
      } catch (err) {
        console.error('Redis set error:', err);
      }
    }

    res.json(response);
  } catch (error) {
    // Only return error message in development or generic in production
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error fetching challenges'
    });
  }
});

// @route   GET /api/challenges/:id/solves
// @desc    Get users/teams who solved a challenge with timestamps
// @access  Private
router.get('/:id/solves', protect, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Get submissions for this challenge
    const submissions = await Submission.find({
      challenge: req.params.id,
      isCorrect: true
    })
      .populate('user', 'username team')
      .populate({
        path: 'user',
        populate: {
          path: 'team',
          select: 'name'
        }
      })
      .sort({ submittedAt: 1 })
      .select('user submittedAt')
      .lean();

    // Format the response
    const solves = submissions.map(sub => ({
      username: sub.user?.username || 'Unknown',
      team: sub.user?.team?.name || 'No Team',
      solvedAt: sub.submittedAt
    }));

    res.json({
      success: true,
      data: solves
    });
  } catch (error) {
    console.error('Error fetching solves:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenge solves'
    });
  }
});

// @route   POST /api/challenges/:id/unlock-hint
// @desc    Unlock a hint for a challenge by spending points
// @access  Private
router.post('/:id/unlock-hint', protect, checkEventNotEnded, async (req, res) => {
  try {
    const { hintIndex } = req.body;
    const userId = req.user._id || req.user.id;

    console.log('Unlock hint request:', { userId, hintIndex, challengeId: req.params.id });

    // Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Validate hint index
    if (hintIndex === undefined || hintIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hint index'
      });
    }

    // Get challenge
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Check if hint exists
    if (!challenge.hints || !challenge.hints[hintIndex]) {
      return res.status(404).json({
        success: false,
        message: 'Hint not found'
      });
    }

    const hint = challenge.hints[hintIndex];

    // Get user with team info
    const user = await User.findById(userId).populate('team');
    if (!user) {
      console.error('User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('User found:', { username: user.username, points: user.points, hasTeam: !!user.team });

    // Check if hint is already unlocked by user
    const alreadyUnlocked = user.unlockedHints.some(
      h => h.challengeId.toString() === req.params.id && h.hintIndex === hintIndex
    );

    if (alreadyUnlocked) {
      return res.status(400).json({
        success: false,
        message: 'Hint already unlocked'
      });
    }

    // Check if user has a team, use team points; otherwise use individual points
    const Team = require('../models/Team');
    let team = null;
    let availablePoints = user.points;

    if (user.team) {
      team = await Team.findById(user.team._id).populate('members', 'points');
      if (team) {
        // Calculate team points from members (same as GET endpoint)
        availablePoints = team.members.reduce((sum, member) => sum + (member.points || 0), 0);
        console.log('Team points calculated:', { teamName: team.name, points: availablePoints });
      }
    }

    console.log('Available points for unlock:', { availablePoints, hintCost: hint.cost, hasTeam: !!team });

    // Check if enough points available
    if (availablePoints < hint.cost) {
      const pointsType = team ? 'team' : 'individual';
      return res.status(400).json({
        success: false,
        message: `Insufficient points. You need ${hint.cost} points but have ${availablePoints} ${pointsType} points`
      });
    }

    // Save hint unlock to user
    user.unlockedHints.push({
      challengeId: req.params.id,
      challengeTitle: challenge.title,
      hintIndex: hintIndex,
      hintCost: hint.cost
    });

    // Deduct points from user (team points are calculated from members)
    user.points = Math.max(0, user.points - hint.cost);
    await user.save();

    // --- NEW: Update Redis ZSET after point deduction ---
    try {
      const weight = Math.pow(10, 10);
      const nowSeconds = user.lastSolveTime ? Math.floor(new Date(user.lastSolveTime).getTime() / 1000) : 0;
      const zscore = user.points * weight + (weight - nowSeconds);

      await redisClient.zadd('scoreboard:users:zset', zscore, user._id.toString());

      if (user.team) {
        const teamZsetKey = 'scoreboard:teams:zset';
        const team = await Team.findById(user.team._id).populate('members', 'points');
        if (team) {
          const teamTotalPoints = team.members.reduce((sum, member) => sum + (member.points || 0), 0);
          const teamLastSolve = team.members.reduce((max, m) => (m.lastSolveTime > max ? m.lastSolveTime : max), new Date(0));
          const teamNowSeconds = teamLastSolve ? Math.floor(new Date(teamLastSolve).getTime() / 1000) : 0;
          await redisClient.zadd(teamZsetKey, teamTotalPoints * weight + (weight - teamNowSeconds), team._id.toString());
        }
      }
    } catch (redisError) {
      console.error('[Hint Unlock] Redis ZSET update failed:', redisError.message);
    }
    // --- END NEW LOGIC ---

    if (team) {
      console.log(`Hint unlocked for user ${user.username}, team ${team.name} points reduced (calculated from members)`);
    } else {
      console.log(`Hint unlocked for user ${user.username}, individual points deducted`);
    }

    logActivity('HINT_UNLOCKED', {
      userId,
      username: user.username,
      challengeId: req.params.id,
      challengeTitle: challenge.title,
      hintIndex,
      cost: hint.cost,
      remainingPoints: user.points,
      teamId: user.team?._id,
      teamName: user.team?.name
    });

    res.json({
      success: true,
      message: 'Hint unlocked successfully',
      data: {
        hint: hint.content,
        remainingPoints: user.points
      }
    });
  } catch (error) {
    console.error('Error unlocking hint:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking hint'
    });
  }
});

// @route   GET /api/challenges/:id
// @desc    Get single challenge
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const challenge = await Challenge.findById(req.params.id).select('-flag');

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // If user is authenticated, include their unlocked hints info
    let unlockedHints = [];
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (user && user.unlockedHints) {
          unlockedHints = user.unlockedHints
            .filter(h => h.challengeId.toString() === req.params.id)
            .map(h => h.hintIndex);
        }
      } catch (err) {
        // Token invalid or user not found, continue without unlocked hints
      }
    }

    res.json({
      success: true,
      data: challenge,
      unlockedHints
    });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenge'
    });
  }
});

// @route   POST /api/challenges
// @desc    Create a challenge
// @access  Private/Admin
router.post('/', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    console.log('Creating challenge with data:', req.body);
    const challenge = await Challenge.create(req.body);

    // Invalidate public challenges cache
    try {
      await redisClient.del('challenges:list:public');
    } catch (err) {
      console.error('Cache invalidation error:', err);
    }

    res.status(201).json({
      success: true,
      data: challenge
    });
  } catch (error) {
    console.error('Challenge creation error:', error);
    
    // Handle duplicate key error (MongoDB E11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `A challenge with this ${field} already exists. Please use a different ${field}.`
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating challenge'
    });
  }
});

// @route   POST /api/challenges/:id/submit
// @desc    Submit a flag for a challenge
// @access  Private
router.post('/:id/submit', protect, sanitizeInput, checkEventNotEnded, async (req, res) => {
  try {
    const { flag } = req.body;

    // Validate and sanitize flag input
    let submittedFlag;
    try {
      submittedFlag = validateInput.flag(flag);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Get challenge with flag
    const challenge = await Challenge.findById(req.params.id).select('+flag');
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Get user with team
    const user = await User.findById(req.user._id).populate('team');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: `Your account is blocked. Reason: ${user.blockedReason || 'No reason provided'}`
      });
    }

    if (!user.canSubmitFlags) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to submit flags'
      });
    }

    if (!challenge.submissionsAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Submissions for this challenge are currently blocked'
      });
    }

    // Check if already solved by user OR their team
    let alreadySolved = user.solvedChallenges.some(
      id => id.toString() === challenge._id.toString()
    );

    // If user has a team, check if team has already solved it
    if (!alreadySolved && user.team) {
      const Team = require('../models/Team');
      const team = await Team.findById(user.team._id);
      if (team && team.solvedChallenges.some(id => id.toString() === challenge._id.toString())) {
        alreadySolved = true;
      }
    }

    if (alreadySolved) {
      return res.status(400).json({
        success: false,
        message: 'This challenge has already been solved by you or your team'
      });
    }

    // Check rate limiting for flag submissions
    const rateCheck = await checkFlagSubmissionRate(req.user._id, challenge._id);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts, slow down!"
      });
    }

    // Get IP and User Agent for tracking
    const clientIp = requestIp.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';

    // Check flag using constant-time comparison to prevent timing attacks
    const expectedFlag = challenge.flag.trim();
    const submittedBuffer = Buffer.from(submittedFlag, 'utf8');
    const expectedBuffer = Buffer.from(expectedFlag, 'utf8');

    // Ensure buffers are same length to prevent timing attacks
    const maxLength = Math.max(submittedBuffer.length, expectedBuffer.length);
    const paddedSubmitted = Buffer.alloc(maxLength);
    const paddedExpected = Buffer.alloc(maxLength);

    submittedBuffer.copy(paddedSubmitted);
    expectedBuffer.copy(paddedExpected);

    const isCorrect = crypto.timingSafeEqual(paddedSubmitted, paddedExpected) &&
      submittedFlag.length === expectedFlag.length;

    // Create submission record (both success and failure) - unique index prevents duplicates
    // CTFd-style: NO points field, calculated dynamically via JOIN
    try {
      await Submission.create({
        user: req.user._id,
        challenge: challenge._id,
        submittedFlag: submittedFlag,
        isCorrect: isCorrect,
        ipAddress: clientIp,
        userAgent: userAgent
      });
    } catch (err) {
      // If duplicate key error (11000), user already submitted this exact flag
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'You have already solved this challenge'
        });
      }
      throw err; // Re-throw other errors
    }

    if (!isCorrect) {
      // Record failed submission for rate limiting
      await recordFailedSubmission(req.user._id, challenge._id);

      // Optionally publish failed attempts for admin monitoring
      try {
        const failedEvent = {
          type: 'failed_attempt',
          user: req.user.username || 'Unknown',
          email: req.user.email,
          challenge: challenge.title,
          challengeId: challenge._id.toString(),
          points: challenge.points,
          submittedAt: new Date().toISOString(),
          ip: clientIp,
          status: 'incorrect',
          submittedFlag: submittedFlag
        };

        console.log('[Real-time] Publishing failed attempt:', failedEvent.user, '->', failedEvent.challenge);

        redisClient.publish('ctf:submissions:live', JSON.stringify(failedEvent))
          .then(subs => console.log(`[Real-time] Failed attempt sent to ${subs} subscriber(s)`))
          .catch(err => console.error('[Non-critical] Redis publish error:', err.message));
      } catch (e) {
        console.error('[Non-critical] Error preparing failed attempt event:', e.message);
      }

      return res.status(400).json({
        success: false,
        message: 'Incorrect flag'
      });
    }

    // Check event state again before processing scoring (double-check for race conditions)
    const eventEnded = await isEventEnded();
    if (eventEnded) {
      return res.status(403).json({
        success: false,
        message: 'CTF event has ended. Submissions are no longer accepted.'
      });
    }

    // Clear rate limiting attempts on successful submission (only if event is not ended)
    await clearSubmissionAttempts(req.user._id, challenge._id);

    // Use transaction for atomic operations to prevent race conditions
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Final check inside transaction to prevent any scoring writes if event ended
        const eventEndedInTransaction = await isEventEnded();
        if (eventEndedInTransaction) {
          throw new Error('CTF event has ended. Submissions are no longer accepted.');
        }
        
        // CTFd-style: Only update solvedBy arrays, NO points fields
        // Scores are calculated dynamically by JOINing submissions with challenges
        
        // Update user with solve time and track personal solve
        await User.findByIdAndUpdate(
          req.user._id,
          {
            $addToSet: {
              solvedChallenges: challenge._id,
              personallySolvedChallenges: {
                challengeId: challenge._id,
                challengeTitle: challenge.title,
                solvedAt: new Date()
              }
            },
            $set: { lastSolveTime: new Date() }
          },
          { session }
        );

        // Update challenge solvedBy array
        await Challenge.findByIdAndUpdate(
          req.params.id,
          { $addToSet: { solvedBy: req.user._id } },
          { session }
        );

        // For dynamic challenges: Update challenge.points value
        // This automatically updates ALL users' scores (calculated via JOIN)
        if (challenge.function === 'linear' || challenge.function === 'logarithmic') {
          const scoringService = require('../services/scoringService');
          await scoringService.updateChallengeValue(challenge._id);
        }

        // Clear scoreboard cache (CTFd's clear_standings())
        await clearScoreboardCache();

        // If user has a team, update team solvedBy array
        if (user.team) {
          const Team = require('../models/Team');

          // Update the team solvedBy
          await Team.findByIdAndUpdate(
            user.team._id,
            {
              $addToSet: { solvedChallenges: challenge._id }
            },
            { session }
          );

          // Update ALL team members to mark this challenge as solved
          // This prevents other team members from solving it again
          await User.updateMany(
            {
              team: user.team._id,
              _id: { $ne: req.user._id } // Exclude current user (already updated above)
            },
            {
              $addToSet: { solvedChallenges: challenge._id }
            },
            { session }
          );
        }

        // Redis ZSET updates removed - scores calculated dynamically
        // Scoreboard will aggregate from Submissions + Challenges JOINs
      });
    } catch (transactionError) {
      // If transaction failed due to event ending, return appropriate error
      if (transactionError.message && transactionError.message.includes('CTF event has ended')) {
        return res.status(403).json({
          success: false,
          message: 'CTF event has ended. Submissions are no longer accepted.'
        });
      }
      throw transactionError; // Re-throw other transaction errors
    } finally {
      await session.endSession();
    }

    // Get current challenge value for response
    const updatedChallenge = await Challenge.findById(challenge._id);
    const currentValue = updatedChallenge.getCurrentValue();

    logActivity('FLAG_SUBMITTED_SUCCESS', {
      userId: req.user._id,
      challengeId: challenge._id,
      challengeTitle: challenge.title,
      points: currentValue
    });

    // Publish real-time submission event to admin monitoring
    // CRITICAL: This must NEVER block player submissions
    try {
      const submissionEvent = {
        type: 'submission',
        user: req.user.username || 'Unknown',
        email: req.user.email,
        challenge: challenge.title,
        challengeId: challenge._id.toString(),
        points: currentValue,
        submittedAt: new Date().toISOString(),
        ip: clientIp,
        submittedFlag: submittedFlag
      };

      console.log('[Real-time] Publishing submission event:', submissionEvent.user, '->', submissionEvent.challenge);

      // Fire and forget - don't await, catch errors to prevent blocking
      redisClient.publish('ctf:submissions:live', JSON.stringify(submissionEvent))
        .then(subscribers => {
          console.log(`[Real-time] Event published to ${subscribers} subscriber(s)`);
        })
        .catch(err => {
          // Log error but don't affect player submission
          console.error('[Non-critical] Redis publish error:', err.message);
        });
    } catch (e) {
      // Catch any errors - monitoring failure must not affect players
      console.error('[Non-critical] Error preparing submission event:', e.message);
    }

    res.json({
      success: true,
      message: 'correct',
      points: currentValue,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Challenge submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/challenges/:id
// @desc    Delete a challenge
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    // Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    await challenge.deleteOne();

    // Invalidate public challenges cache
    try {
      await redisClient.del('challenges:list:public');
    } catch (err) {
      console.error('Cache invalidation error:', err);
    }

    res.json({
      success: true,
      message: 'Challenge deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting challenge'
    });
  }
});

// @route   PUT /api/challenges/:id
// @desc    Update a challenge
// @access  Private/Admin
router.put('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    console.log('Update challenge request:', {
      id: req.params.id,
      body: req.body
    });

    // Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // If isVisible is being updated, log the change
    if (req.body.hasOwnProperty('isVisible')) {
      console.log('Updating visibility:', {
        challengeId: challenge._id,
        oldVisibility: challenge.isVisible,
        newVisibility: req.body.isVisible
      });
    }

    const updatedChallenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    console.log('Challenge updated successfully:', {
      challengeId: updatedChallenge._id,
      isVisible: updatedChallenge.isVisible
    });

    // Invalidate public challenges cache
    try {
      await redisClient.del('challenges:list:public');
    } catch (err) {
      console.error('Cache invalidation error:', err);
    }

    res.json({
      success: true,
      data: updatedChallenge
    });
  } catch (error) {
    console.error('Error updating challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating challenge'
    });
  }
});

module.exports = router;
