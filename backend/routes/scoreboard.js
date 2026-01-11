const express = require('express');
const router = express.Router();
const Competition = require('../models/Competition');
const Submission = require('../models/Submission');
const Team = require('../models/Team');
const Challenge = require('../models/Challenge');
const { protect } = require('../middleware/auth');
const { getRedisClient } = require('../utils/redis');

const redisClient = getRedisClient();

/**
 * @route   GET /api/scoreboard/top/:count
 * @desc    Get CTFd-style detailed scoreboard with solve history (CTFd format)
 * @access  Private
 */
router.get('/top/:count', protect, async (req, res) => {
  try {
    const { count = 10 } = req.params;
    const limit = Math.max(1, Math.min(parseInt(count), 50)); // Restrict 1-50

    const cacheKey = `scoreboard:top:${limit}`;
    const CACHE_TTL = 60;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true
        });
      }
    } catch (cacheErr) {
      console.warn('Redis cache read error:', cacheErr);
    }

    // Get all submissions with user/team populated
    const submissions = await Submission.find({ isCorrect: true })
      .populate({
        path: 'user',
        select: 'team',
        populate: {
          path: 'team',
          select: '_id name'
        }
      })
      .populate('challenge', 'title')
      .sort({ submittedAt: 1 })
      .lean();

    // Build team solve data
    const teamData = {};
    
    for (const submission of submissions) {
      if (!submission.user?.team?._id) continue;

      const teamId = submission.user.team._id.toString();
      const teamName = submission.user.team.name;

      if (!teamData[teamId]) {
        teamData[teamId] = {
          id: teamId,
          name: teamName,
          score: 0,
          solves: []
        };
      }

      teamData[teamId].solves.push({
        challenge_id: submission.challenge._id.toString(),
        value: submission.points || 0,
        date: submission.submittedAt.toISOString()
      });

      teamData[teamId].score += submission.points || 0;
    }

    // Sort teams by score DESC, then by last solve time ASC
    const sortedTeams = Object.entries(teamData)
      .sort(([, a], [, b]) => {
        if (b.score !== a.score) return b.score - a.score;
        
        const aLastSolve = a.solves.length > 0 ? new Date(a.solves[a.solves.length - 1].date).getTime() : 0;
        const bLastSolve = b.solves.length > 0 ? new Date(b.solves[b.solves.length - 1].date).getTime() : 0;
        return aLastSolve - bLastSolve;
      })
      .slice(0, limit);

    // Build CTFd-compatible response: { "1": {...}, "2": {...} }
    const response = {};
    sortedTeams.forEach(([teamId, data], index) => {
      response[index + 1] = {
        id: data.id,
        name: data.name,
        score: data.score,
        solves: data.solves
      };
    });

    // Cache the response
    try {
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
    } catch (cacheErr) {
      console.warn('Redis cache write error:', cacheErr);
    }

    res.json({
      success: true,
      data: response,
      cached: false
    });

  } catch (error) {
    console.error('Scoreboard top error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scoreboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/scoreboard/competition
 * @desc    Get current competition info
 * @access  Private
 */
router.get('/competition', protect, async (req, res) => {
  try {
    const competition = await Competition.getCurrentCompetition();
    
    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'No active competition found'
      });
    }

    res.json({
      success: true,
      data: competition
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching competition',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
