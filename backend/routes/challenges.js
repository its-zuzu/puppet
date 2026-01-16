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
const monitoring = require('../utils/monitoring');
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
    monitoring.rateLimit.systemFailure('flag-submission', error);
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
    monitoring.rateLimit.systemFailure('record-failure', error);
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
// @access  Private (Authentication required - Security fix for Penligent HIGH vulnerability)
router.get('/', protect, sanitizeInput, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // User is guaranteed to exist due to protect middleware
    const user = req.user;

    const query = {};
    // Show all challenges to admins, only visible challenges to others
    const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

    if (!isAdmin) {
      query.isVisible = true;
    }

    // Get user's solved challenges for stats calculation
    const fullUser = await User.findById(user._id).select('solvedChallenges').lean();
    const userSolvedIds = fullUser?.solvedChallenges || [];

    const total = await Challenge.countDocuments(query);
    const challenges = await Challenge.find(query)
      .select('-flag')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .lean(); // Use lean for better performance

    // Add current dynamic value and solved status to each challenge
    const enrichedChallenges = challenges.map(challenge => {
      // Calculate current value based on function
      let currentValue = challenge.points;
      if (challenge.function && (challenge.function === 'linear' || challenge.function === 'logarithmic')) {
        const solveCount = challenge.solvedBy?.length || 0;
        if (challenge.function === 'linear') {
          const decay = challenge.decay || 0;
          currentValue = Math.max(challenge.minimum || 1, challenge.initial - (decay * solveCount));
        } else if (challenge.function === 'logarithmic') {
          const decay = challenge.decay || 0;
          currentValue = Math.max(
            challenge.minimum || 1,
            Math.round(challenge.initial - decay * Math.log2(solveCount + 1))
          );
        }
      }
      
      challenge.currentValue = currentValue;
      challenge.isSolved = userSolvedIds.some(id => id.toString() === challenge._id.toString());
      return challenge;
    });

    // Calculate stats
    const solvedCount = enrichedChallenges.filter(c => c.isSolved).length;
    const remainingCount = enrichedChallenges.length - solvedCount;

    const response = {
      success: true,
      count: enrichedChallenges.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: enrichedChallenges,
      stats: {
        solved: solvedCount,
        remaining: remainingCount,
        total: enrichedChallenges.length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching challenges:', error);
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

// NOTE: Hint unlocking has been moved to /api/unlocks endpoint (CTFd-style)
// The old POST /api/challenges/:id/unlock-hint endpoint has been removed to prevent
// incorrect individual user.points deduction. Hint costs should be deducted from
// team scores via negative awards, NOT from individual user scores.
// Use POST /api/unlocks instead for hint unlocking.

// @route   GET /api/challenges/:id
// @desc    Get single challenge (CTFd-style with hint views)
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

    const challenge = await Challenge.findById(req.params.id).select('-flag').lean();

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // CTFd-style: Get user's unlocked hints from Unlocks table
    let unlockedHints = [];
    let userId = null;
    let teamId = null;

    if (req.headers.authorization) {
      try {
        const Unlock = require('../models/Unlock');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).populate('team');

        if (user) {
          userId = user._id;
          teamId = user.team ? user.team._id : null;

          // Get all unlocks for this challenge
          const query = {
            challenge: req.params.id,
            type: 'hints'
          };

          if (teamId) {
            query.$or = [
              { user: userId },
              { team: teamId }
            ];
          } else {
            query.user = userId;
          }

          console.log('[Challenge GET] Query for unlocks:', JSON.stringify(query, null, 2));

          const unlocks = await Unlock.find(query).select('target user team challenge');
          unlockedHints = unlocks.map(u => u.target);
          
          console.log('[Challenge GET] Unlocked hints check:', {
            userId: userId.toString(),
            teamId: teamId ? teamId.toString() : null,
            challengeId: req.params.id,
            foundUnlocks: unlocks.length,
            unlockDetails: unlocks.map(u => ({
              target: u.target,
              user: u.user.toString(),
              team: u.team ? u.team.toString() : null,
              challenge: u.challenge.toString()
            })),
            unlockedHintIndexes: unlockedHints
          });
        }
      } catch (err) {
        console.error('[Challenge GET] Auth error:', err.message);
        // Token invalid or user not found, continue without unlocked hints
      }
    }

    // CTFd-style: Transform hints based on unlock status
    if (challenge.hints && challenge.hints.length > 0) {
      challenge.hints = challenge.hints.map((hint, index) => {
        const isUnlocked = unlockedHints.includes(index);
        const isFree = hint.cost === 0;

        // Return "unlocked" view (with content) or "locked" view (without content)
        if (isUnlocked || isFree) {
          return {
            id: index,
            content: hint.content,
            cost: hint.cost,
            unlocked: true
          };
        } else {
          return {
            id: index,
            cost: hint.cost,
            unlocked: false
            // content intentionally omitted for locked hints
          };
        }
      });
    }

    res.json({
      success: true,
      data: challenge,
      unlockedHints // Still include this for backward compatibility
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
        message: "Slow down!"
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
        
        // CTFd-style: Update solvedBy arrays + user.points for display
        // Scoreboard calculations use dynamic JOIN queries for accurate ranking
        
        // Update user with solve time, track personal solve, and update points
        const userUpdate = await User.findByIdAndUpdate(
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
          { session, new: true }
        );

        // Calculate user's total points from all solved challenges
        const userSubmissions = await Submission.aggregate([
          { $match: { user: req.user._id, isCorrect: true } },
          {
            $lookup: {
              from: 'challenges',
              localField: 'challenge',
              foreignField: '_id',
              as: 'challengeData'
            }
          },
          { $unwind: '$challengeData' },
          {
            $group: {
              _id: null,
              totalPoints: { $sum: '$challengeData.points' }
            }
          }
        ]);

        const totalPoints = userSubmissions.length > 0 ? userSubmissions[0].totalPoints : 0;
        
        // Update user.points field for display in profile pages
        await User.findByIdAndUpdate(
          req.user._id,
          { $set: { points: totalPoints } },
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
