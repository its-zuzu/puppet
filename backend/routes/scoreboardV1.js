const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getRedisClient } = require('../utils/redis');
const scoringService = require('../services/scoringService');
const Submission = require('../models/Submission');
const Award = require('../models/Award');
const User = require('../models/User');
const Team = require('../models/Team');

const redisClient = getRedisClient();

/**
 * @route   GET /api/v1/scoreboard
 * @desc    Get full scoreboard (CTFd-compatible)
 * @access  Private
 * @query   ?bracket_id=<id> - Filter by bracket (optional)
 */
router.get('/', protect, async (req, res) => {
  try {
    const { bracket_id } = req.query;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    
    // TODO: Implement freeze time from config
    const freezeTime = null;

    const cacheKey = `scoreboard:v1:full:${bracket_id || 'all'}:${isAdmin}`;
    const CACHE_TTL = 60;

    // Try cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached)
        });
      }
    } catch (cacheErr) {
      console.warn('[Scoreboard] Cache read error:', cacheErr.message);
    }

    // Get standings based on mode (teams or users)
    // For now, assuming teams mode (can be made configurable)
    const standings = await scoringService.getTeamStandings({
      includeHidden: isAdmin,
      freezeTime
    });

    // Format for CTFd compatibility
    const data = standings.map((team, index) => ({
      pos: index + 1,
      account_id: team.id,
      account_type: 'team',
      name: team.name,
      score: team.score
    }));

    // Cache result
    try {
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
    } catch (cacheErr) {
      console.warn('[Scoreboard] Cache write error:', cacheErr.message);
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[Scoreboard] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scoreboard'
    });
  }
});

/**
 * @route   GET /api/v1/scoreboard/top/:count
 * @desc    Get top N teams/users with complete solve history (CTFd-exact format)
 * @access  Private
 * 
 * CTFd Format:
 * {
 *   "success": true,
 *   "data": {
 *     "1": {
 *       "id": "team_id",
 *       "name": "Team Name",
 *       "score": 1500,
 *       "account_url": "/teams/1",
 *       "bracket_id": null,
 *       "bracket_name": null,
 *       "solves": [
 *         {
 *           "challenge_id": 5,
 *           "account_id": 1,
 *           "user_id": 2,
 *           "team_id": 1,
 *           "value": 100,
 *           "date": "2024-01-15T10:30:00+00:00"
 *         }
 *       ]
 *     }
 *   }
 * }
 */
router.get('/top/:count', protect, async (req, res) => {
  try {
    const { count = 10 } = req.params;
    const limit = Math.max(1, Math.min(parseInt(count), 100));
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    
    const freezeTime = null; // TODO: Get from config

    const cacheKey = `scoreboard:v1:top:${limit}:${isAdmin}`;
    const CACHE_TTL = 60;

    // Try cache
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached)
        });
      }
    } catch (cacheErr) {
      console.warn('[Scoreboard] Cache read error:', cacheErr.message);
    }

    // Get top standings
    const standings = await scoringService.getTeamStandings({
      limit,
      includeHidden: isAdmin,
      freezeTime
    });

    // For each team, get their solve history
    const responseData = {};

    for (let rank = 0; rank < standings.length; rank++) {
      const team = standings[rank];
      const teamDoc = await Team.findById(team.id).populate('members');

      if (!teamDoc) continue;

      // Get all solves from team members
      const solves = [];
      const memberIds = teamDoc.members.map(m => m._id);

      // Get challenge solves
      const submissions = await Submission.find({
        user: { $in: memberIds },
        status: 'correct'
      })
        .populate('challenge', 'title points')
        .populate('user', 'username')
        .sort({ createdAt: 1 })
        .lean();

      for (const sub of submissions) {
        // Apply freeze time
        if (freezeTime && sub.createdAt > freezeTime) continue;

        // Get challenge value at time of solve
        const challengeValue = sub.challenge.getCurrentValue ? 
          sub.challenge.getCurrentValue() : 
          (sub.points || sub.challenge.points);

        // Skip zero-point challenges
        if (challengeValue === 0) continue;

        solves.push({
          challenge_id: sub.challenge._id.toString(),
          account_id: team.id.toString(),
          user_id: sub.user._id.toString(),
          team_id: team.id.toString(),
          value: challengeValue,
          date: sub.createdAt.toISOString()
        });
      }

      // Get awards for this team
      const awards = await Award.find({ team: team.id })
        .sort({ date: 1 })
        .lean();

      for (const award of awards) {
        // Apply freeze time
        if (freezeTime && award.date > freezeTime) continue;

        // Skip zero-value awards
        if (award.value === 0) continue;

        solves.push({
          challenge_id: null, // Awards don't have challenge_id
          account_id: team.id.toString(),
          user_id: null,
          team_id: team.id.toString(),
          value: award.value,
          date: award.date.toISOString()
        });
      }

      // Sort solves by date
      solves.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Build CTFd format: use rank as key (starting from "1")
      responseData[rank + 1] = {
        id: team.id.toString(),
        name: team.name,
        score: team.score,
        account_url: `/api/teams/${team.id}`,
        bracket_id: null, // TODO: Implement brackets
        bracket_name: null,
        solves
      };
    }

    // Cache result
    try {
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(responseData));
    } catch (cacheErr) {
      console.warn('[Scoreboard] Cache write error:', cacheErr.message);
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('[Scoreboard] Top error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scoreboard data'
    });
  }
});

/**
 * @route   GET /api/v1/scoreboard/standings
 * @desc    Get simple standings list (no solve history)
 * @access  Private
 */
router.get('/standings', protect, async (req, res) => {
  try {
    const { limit } = req.query;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const freezeTime = null;

    const standings = await scoringService.getTeamStandings({
      limit: limit ? parseInt(limit) : null,
      includeHidden: isAdmin,
      freezeTime
    });

    res.json({
      success: true,
      data: standings.map((team, index) => ({
        rank: index + 1,
        id: team.id,
        name: team.name,
        score: team.score
      }))
    });
  } catch (error) {
    console.error('[Scoreboard] Standings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch standings'
    });
  }
});

module.exports = router;
