/**
 * CTFd-Exact Scoreboard API
 * 
 * Implements CTFd's scoreboard endpoints with exact behavior:
 * - GET /api/v1/scoreboard - Full scoreboard list
 * - GET /api/v1/scoreboard/top/:count - Detailed scoreboard with solve history
 * 
 * Key CTFd Features:
 * - Score = Sum of solves + awards
 * - Tie-breaking by last solve date (earlier is better)
 * - Excludes hidden/banned users
 * - Respects freeze time
 * - 60-second cache
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getRedisClient } = require('../utils/redis');
const scoringService = require('../services/scoringService');

const User = require('../models/User');
const Team = require('../models/Team');
const Submission = require('../models/Submission');
const Award = require('../models/Award');
const Challenge = require('../models/Challenge');

const redisClient = getRedisClient();

/**
 * @route   GET /api/v1/scoreboard
 * @desc    Get full scoreboard (CTFd-compatible)
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const type = req.query.type || 'teams'; // 'teams' or 'users'
    
    // TODO: Get freeze time from config
    const freezeTime = null;
    
    const cacheKey = `ctfd:scoreboard:full:${type}:${isAdmin}`;
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

    // Get standings based on type
    let standings;
    if (type === 'users') {
      standings = await getUserStandings({
        includeHidden: isAdmin,
        freezeTime
      });
    } else {
      standings = await getTeamStandings({
        includeHidden: isAdmin,
        freezeTime
      });
    }

    // Format for CTFd compatibility
    const formattedStandings = standings.map((standing, index) => ({
      pos: index + 1,
      account_id: standing.team_id || standing.user_id,
      account_url: type === 'teams' ? `/teams/${standing.team_id || standing.user_id}` : `/users/${standing.user_id}`,
      account_type: type === 'teams' ? 'team' : 'user',
      name: standing.name,
      score: Math.floor(standing.score),
      bracket_id: standing.bracket_id || null,
      bracket_name: standing.bracket_name || null
    }));

    // Cache result
    try {
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(formattedStandings));
    } catch (cacheErr) {
      console.warn('[Scoreboard] Cache write error:', cacheErr.message);
    }

    res.json({
      success: true,
      data: formattedStandings
    });

  } catch (error) {
    console.error('[Scoreboard] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scoreboard'
    });
  }
});

/**
 * @route   GET /api/v1/scoreboard/graph
 * @desc    Get score progression graph data (CTFd-compatible)
 * @access  Private
 * 
 * Returns time-series data for score progression graph
 */
router.get('/graph', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const type = req.query.type || 'teams';
    const limit = parseInt(req.query.count || '10');
    const count = Math.max(1, Math.min(limit, 50));
    
    const freezeTime = null; // TODO: Get from config

    const cacheKey = `ctfd:scoreboard:graph:${count}:${type}:${isAdmin}`;
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
      console.warn('[Graph] Cache read error:', cacheErr.message);
    }

    // Get top standings
    let standings;
    if (type === 'users') {
      standings = await getUserStandings({
        count,
        includeHidden: isAdmin,
        freezeTime
      });
    } else {
      standings = await getTeamStandings({
        count,
        includeHidden: isAdmin,
        freezeTime
      });
    }

    if (standings.length === 0) {
      return res.json({
        success: true,
        data: {}
      });
    }

    // Get account IDs
    const accountIds = standings.map(s => s.team_id || s.user_id);

    // Get all solves for these accounts, sorted by time
    let solvesQuery = Submission.find({
      user: { $in: accountIds },
      isCorrect: true
    })
      .populate('user', '_id team')
      .sort({ submittedAt: 1 });

    if (freezeTime && !isAdmin) {
      solvesQuery = solvesQuery.where('submittedAt').lt(new Date(freezeTime));
    }

    const solves = await solvesQuery.lean();

    // Get all awards for these accounts, sorted by time
    let awardsQuery = Award.find({
      $or: [
        { user: { $in: accountIds } },
        { team: { $in: accountIds } }
      ]
    }).sort({ date: 1 });

    if (freezeTime && !isAdmin) {
      awardsQuery = awardsQuery.where('date').lt(new Date(freezeTime));
    }

    const awards = await awardsQuery.lean();

    // Build graph data for each account
    const graphData = {};
    
    standings.forEach((standing, index) => {
      const accountId = standing.team_id || standing.user_id;
      const accountIdStr = accountId.toString();
      
      // Collect all score events (solves + awards), filtering zero values like CTFd
      const events = [];
      
      // Add solves (skip zero-value)
      for (const solve of solves) {
        const solveAccountId = solve.user?.team?.toString() || solve.user?._id.toString();
        const points = solve.points || 0;
        
        if (solveAccountId === accountIdStr && points !== 0) {
          events.push({
            time: solve.submittedAt,
            value: points,
            challenge_id: solve.challenge
          });
        }
      }
      
      // Add awards (skip zero-value)
      for (const award of awards) {
        const awardAccountId = award.team?.toString() || award.user?.toString();
        const value = award.value || 0;
        
        if (awardAccountId === accountIdStr && value !== 0) {
          events.push({
            time: award.date,
            value: value,
            challenge_id: null
          });
        }
      }
      
      // Sort events by time
      events.sort((a, b) => new Date(a.time) - new Date(b.time));
      
      // Build cumulative score timeline
      let cumulativeScore = 0;
      const timeline = events.map(event => {
        cumulativeScore += event.value;
        return {
          time: new Date(event.time).getTime(),
          score: cumulativeScore
        };
      });
      
      graphData[index + 1] = {
        id: accountIdStr,
        name: standing.name,
        timeline: timeline
      };
    });

    // Cache result
    try {
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(graphData));
    } catch (cacheErr) {
      console.warn('[Graph] Cache write error:', cacheErr.message);
    }

    res.json({
      success: true,
      data: graphData
    });

  } catch (error) {
    console.error('[Score Graph] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching score graph'
    });
  }
});

/**
 * @route   GET /api/v1/scoreboard/top/:count
 * @desc    Get detailed scoreboard with solve history for top N accounts
 * @access  Private
 * 
 * Returns CTFd format:
 * {
 *   "1": {
 *     "id": "team_id",
 *     "name": "Team Name",
 *     "score": 1000,
 *     "solves": [
 *       { "challenge_id": "xxx", "value": 100, "date": "2025-01-12T..." },
 *       { "challenge_id": null, "value": 50, "date": "2025-01-12T..." } // award
 *     ]
 *   },
 *   ...
 * }
 */
router.get('/top/:count', protect, async (req, res) => {
  try {
    const { count = 10 } = req.params;
    const limit = Math.max(1, Math.min(parseInt(count), 50)); // 1-50 range
    const type = req.query.type || 'teams'; // 'teams' or 'users'
    
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const freezeTime = null; // TODO: Get from config

    const cacheKey = `ctfd:scoreboard:top:${limit}:${type}:${isAdmin}`;
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

    // Get top N standings based on type
    let standings;
    if (type === 'users') {
      standings = await getUserStandings({
        count: limit,
        includeHidden: isAdmin,
        freezeTime
      });
    } else {
      standings = await getTeamStandings({
        count: limit,
        includeHidden: isAdmin,
        freezeTime
      });
    }

    if (standings.length === 0) {
      return res.json({
        success: true,
        data: {}
      });
    }

    // Get account IDs
    const accountIds = standings.map(s => s.team_id || s.user_id);

    // Get all solves for these accounts
    let solves = await Submission.find({
      user: { $in: accountIds }, // Assuming Submission has user field
      isCorrect: true
    })
      .populate('user', '_id team')
      .populate('challenge', '_id title category')
      .sort({ submittedAt: 1 })
      .lean();

    // Get all awards for these accounts
    let awards = await Award.find({
      $or: [
        { user: { $in: accountIds } },
        { team: { $in: accountIds } }
      ]
    })
      .sort({ date: 1 })
      .lean();

    // Apply freeze time filter
    if (freezeTime && !isAdmin) {
      const freezeDate = new Date(freezeTime);
      solves = solves.filter(s => new Date(s.submittedAt) < freezeDate);
      awards = awards.filter(a => new Date(a.date) < freezeDate);
    }

    // Build solves mapper (account_id => array of solves+awards)
    const solvesMapper = {};
    accountIds.forEach(id => {
      solvesMapper[id.toString()] = [];
    });

    // Add solves (filter zero-value like CTFd)
    for (const solve of solves) {
      const accountId = solve.user?.team?.toString() || solve.user?._id.toString();
      const points = solve.points || 0;
      
      if (solvesMapper[accountId] && points !== 0) {
        solvesMapper[accountId].push({
          challenge_id: solve.challenge?._id?.toString() || null,
          account_id: accountId,
          team_id: solve.user?.team?.toString() || null,
          user_id: solve.user?._id?.toString() || null,
          value: points,
          date: solve.submittedAt ? new Date(solve.submittedAt).toISOString() : new Date().toISOString()
        });
      }
    }

    // Add awards (filter zero-value like CTFd)
    for (const award of awards) {
      const accountId = award.team?.toString() || award.user?.toString();
      const value = award.value || 0;
      
      if (solvesMapper[accountId] && value !== 0) {
        solvesMapper[accountId].push({
          challenge_id: null,
          account_id: accountId,
          team_id: award.team?.toString() || null,
          user_id: award.user?.toString() || null,
          value: value,
          date: award.date ? new Date(award.date).toISOString() : new Date().toISOString()
        });
      }
    }

    // Sort all solves by date
    for (const accountId in solvesMapper) {
      solvesMapper[accountId].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }

    // Build CTFd response format
    const response = {};
    standings.forEach((standing, index) => {
      const accountId = standing.team_id || standing.user_id;
      response[index + 1] = {
        id: accountId.toString(),
        account_url: `/teams/${accountId}`,
        name: standing.name,
        score: Math.floor(standing.score),
        bracket_id: standing.bracket_id || null,
        bracket_name: standing.bracket_name || null,
        solves: solvesMapper[accountId.toString()] || []
      };
    });

    // Cache result
    try {
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
    } catch (cacheErr) {
      console.warn('[Scoreboard] Cache write error:', cacheErr.message);
    }

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('[Scoreboard Top] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching detailed scoreboard'
    });
  }
});

/**
 * Get team standings (CTFd algorithm)
 * 
 * Scoring logic:
 * 1. Sum all solve points + award points
 * 2. Sort by score DESC
 * 3. Tie-break by last solve date ASC (earlier is better)
 * 4. Exclude hidden/banned unless admin
 */
async function getTeamStandings({ count = null, includeHidden = false, freezeTime = null }) {
  try {
    // Get all teams
    let teamQuery = Team.find({});
    if (!includeHidden) {
      teamQuery = teamQuery.where('hidden').ne(true).where('banned').ne(true);
    }
    const teams = await teamQuery.lean();

    // Get all users with their team membership
    let userQuery = User.find({ role: 'user' });
    if (!includeHidden) {
      userQuery = userQuery.where('hidden').ne(true).where('banned').ne(true);
    }
    const users = await userQuery.select('_id team lastSolveTime').lean();

    // Build team member map
    const teamMembers = {};
    teams.forEach(team => {
      teamMembers[team._id.toString()] = [];
    });
    users.forEach(user => {
      if (user.team) {
        const teamId = user.team.toString();
        if (teamMembers[teamId]) {
          teamMembers[teamId].push(user._id);
        }
      }
    });

    // Get all solves
    let solvesQuery = Submission.find({ isCorrect: true });
    if (freezeTime) {
      solvesQuery = solvesQuery.where('submittedAt').lt(new Date(freezeTime));
    }
    const solves = await solvesQuery
      .populate('user', '_id team lastSolveTime')
      .lean();

    // Get all awards
    let awardsQuery = Award.find({});
    if (freezeTime) {
      awardsQuery = awardsQuery.where('date').lt(new Date(freezeTime));
    }
    const awards = await awardsQuery.lean();

    // Calculate team scores
    const teamScores = {};
    teams.forEach(team => {
      const teamId = team._id.toString();
      teamScores[teamId] = {
        team_id: team._id,
        name: team.name,
        score: 0,
        last_solve_date: null,
        bracket_id: team.bracket_id || null,
        bracket_name: team.bracket_name || null
      };
    });

    // Add solve points (filter out zero-value solves like CTFd)
    for (const solve of solves) {
      if (!solve.user?.team) continue;
      const points = solve.points || 0;
      if (points === 0) continue; // Skip zero-value solves for tie-breaking accuracy
      
      const teamId = solve.user.team.toString();
      if (teamScores[teamId]) {
        teamScores[teamId].score += points;
        const solveDate = new Date(solve.submittedAt);
        if (!teamScores[teamId].last_solve_date || solveDate > teamScores[teamId].last_solve_date) {
          teamScores[teamId].last_solve_date = solveDate;
        }
      }
    }

    // Add award points (filter out zero-value awards like CTFd)
    for (const award of awards) {
      const value = award.value || 0;
      if (value === 0) continue; // Skip zero-value awards for tie-breaking accuracy
      
      const teamId = award.team?.toString();
      if (teamId && teamScores[teamId]) {
        teamScores[teamId].score += value;
        const awardDate = new Date(award.date);
        if (!teamScores[teamId].last_solve_date || awardDate > teamScores[teamId].last_solve_date) {
          teamScores[teamId].last_solve_date = awardDate;
        }
      }
    }

    // Convert to array and sort (CTFd tie-breaking)
    const standings = Object.values(teamScores)
      .sort((a, b) => {
        // 1. Higher score wins
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // 2. Earlier last solve wins (tie-breaker)
        if (a.last_solve_date && b.last_solve_date) {
          return a.last_solve_date.getTime() - b.last_solve_date.getTime();
        }
        if (a.last_solve_date) return -1;
        if (b.last_solve_date) return 1;
        return 0;
      });

    // Return limited count if specified
    if (count) {
      return standings.slice(0, count);
    }
    return standings;

  } catch (error) {
    console.error('[getTeamStandings] Error:', error);
    throw error;
  }
}

/**
 * Get user standings (CTFd algorithm)
 * 
 * Same as team standings but for individual users
 */
async function getUserStandings({ count = null, includeHidden = false, freezeTime = null }) {
  try {
    // Get all users
    let userQuery = User.find({ role: 'user' });
    if (!includeHidden) {
      userQuery = userQuery.where('hidden').ne(true).where('banned').ne(true);
    }
    const users = await userQuery.select('_id username email lastSolveTime').lean();

    // Get all solves
    let solvesQuery = Submission.find({ isCorrect: true });
    if (freezeTime) {
      solvesQuery = solvesQuery.where('submittedAt').lt(new Date(freezeTime));
    }
    const solves = await solvesQuery
      .populate('user', '_id username')
      .lean();

    // Get all awards
    let awardsQuery = Award.find({});
    if (freezeTime) {
      awardsQuery = awardsQuery.where('date').lt(new Date(freezeTime));
    }
    const awards = await awardsQuery.lean();

    // Calculate user scores
    const userScores = {};
    users.forEach(user => {
      const userId = user._id.toString();
      userScores[userId] = {
        user_id: user._id,
        name: user.username || user.email,
        score: 0,
        last_solve_date: null,
        bracket_id: user.bracket_id || null,
        bracket_name: user.bracket_name || null
      };
    });

    // Add solve points (filter out zero-value solves like CTFd)
    for (const solve of solves) {
      if (!solve.user) continue;
      const points = solve.points || 0;
      if (points === 0) continue; // Skip zero-value solves for tie-breaking accuracy
      
      const userId = solve.user._id.toString();
      if (userScores[userId]) {
        userScores[userId].score += points;
        const solveDate = new Date(solve.submittedAt);
        if (!userScores[userId].last_solve_date || solveDate > userScores[userId].last_solve_date) {
          userScores[userId].last_solve_date = solveDate;
        }
      }
    }

    // Add award points (filter out zero-value awards like CTFd)
    for (const award of awards) {
      const value = award.value || 0;
      if (value === 0) continue; // Skip zero-value awards for tie-breaking accuracy
      
      const userId = award.user?.toString();
      if (userId && userScores[userId]) {
        userScores[userId].score += value;
        const awardDate = new Date(award.date);
        if (!userScores[userId].last_solve_date || awardDate > userScores[userId].last_solve_date) {
          userScores[userId].last_solve_date = awardDate;
        }
      }
    }

    // Convert to array and sort (CTFd tie-breaking)
    const standings = Object.values(userScores)
      .sort((a, b) => {
        // 1. Higher score wins
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // 2. Earlier last solve wins (tie-breaker)
        if (a.last_solve_date && b.last_solve_date) {
          return a.last_solve_date.getTime() - b.last_solve_date.getTime();
        }
        if (a.last_solve_date) return -1;
        if (b.last_solve_date) return 1;
        return 0;
      });

    // Return limited count if specified
    if (count) {
      return standings.slice(0, count);
    }
    return standings;

  } catch (error) {
    console.error('[getUserStandings] Error:', error);
    throw error;
  }
}

module.exports = router;
