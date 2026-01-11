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
  try {
    const { limit = 10 } = req.query;

    // Check Redis cache first
    const cacheKey = `scoreboard:graph:${limit}`;
    const CACHE_TTL = 30; // 30 seconds

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

    // Get current competition
    const competition = await Competition.getCurrentCompetition();
    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'No active competition found'
      });
    }

    const competitionStartTime = new Date(competition.startTime).getTime();

    // Get all teams
    const teams = await Team.find({}).select('_id name').lean();
    const teamMap = {};
    const teamIds = new Set();
    
    teams.forEach(team => {
      const teamId = team._id.toString();
      teamMap[teamId] = team.name;
      teamIds.add(teamId);
    });

    // Get all correct submissions sorted by time
    const submissions = await Submission.find({ 
      isCorrect: true 
    })
      .populate({
        path: 'user',
        select: 'team',
        populate: {
          path: 'team',
          select: '_id'
        }
      })
      .sort({ submittedAt: 1 })
      .lean();

    // Build solve events for each team
    const teamSolves = {};
    const allEvents = [];

    // Initialize all teams
    for (const teamId of teamIds) {
      teamSolves[teamId] = [];
    }

    // Process submissions
    for (const submission of submissions) {
      if (!submission.user?.team) continue;

      const teamId = submission.user.team._id ? 
        submission.user.team._id.toString() : 
        submission.user.team.toString();

      if (!teamIds.has(teamId)) continue;

      const solveTime = new Date(submission.submittedAt).getTime();
      const elapsedTime = solveTime - competitionStartTime;
      const points = submission.points || 0;

      allEvents.push({
        teamId,
        elapsedTime: Math.max(0, elapsedTime), // Ensure non-negative
        points
      });
    }

    // Sort all events by elapsed time
    allEvents.sort((a, b) => a.elapsedTime - b.elapsedTime);

    // Build cumulative scores for each team
    const teamCurrentScores = {};
    for (const teamId of teamIds) {
      teamCurrentScores[teamId] = 0;
    }

    // Track score progression with elapsed time
    for (const event of allEvents) {
      teamCurrentScores[event.teamId] += event.points;
      teamSolves[event.teamId].push({
        elapsedTime: event.elapsedTime,
        score: teamCurrentScores[event.teamId]
      });
    }

    // Calculate final scores and tie-breaking
    const teamRankings = Array.from(teamIds).map(teamId => {
      const solves = teamSolves[teamId];
      const finalScore = solves.length > 0 ? solves[solves.length - 1].score : 0;
      const lastSolveTime = solves.length > 0 ? solves[solves.length - 1].elapsedTime : 0;

      return {
        teamId,
        teamName: teamMap[teamId],
        finalScore,
        lastSolveTime,
        solveCount: solves.length
      };
    }).sort((a, b) => {
      // Sort by score DESC, then by last solve time ASC (earlier is better)
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      return a.lastSolveTime - b.lastSolveTime;
    });

    // Get top N teams
    const topTeams = teamRankings.slice(0, parseInt(limit));

    // Prepare graph data with ZERO START for each team
    const graphData = topTeams.map((team, index) => {
      const solves = teamSolves[team.teamId];
      
      // CRITICAL: Add explicit (0, 0) start point for each team
      const dataPoints = [
        { elapsedTime: 0, score: 0 }
      ];

      // Add actual solve points
      solves.forEach(solve => {
        dataPoints.push({
          elapsedTime: solve.elapsedTime,
          score: solve.score
        });
      });

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        rank: index + 1,
        finalScore: team.finalScore,
        lastSolveTime: team.lastSolveTime,
        solveCount: team.solveCount,
        data: dataPoints
      };
    });

    // Transform data for Recharts format (CTFd-style)
    // Each data point should have: { timestamp, team1Score, team2Score, ... }
    const allTimestamps = new Set();
    
    graphData.forEach(team => {
      team.data.forEach(point => {
        allTimestamps.add(point.elapsedTime);
      });
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Build chart data where each timestamp shows current score for all teams
    const chartData = sortedTimestamps.map(timestamp => {
      const dataPoint = { elapsedTime: timestamp };

      graphData.forEach(team => {
        // Find cumulative score at this timestamp (last score <= timestamp)
        let score = 0;
        for (const point of team.data) {
          if (point.elapsedTime <= timestamp) {
            score = point.score;
          } else {
            break;
          }
        }
        dataPoint[team.teamName] = score;
      });

      return dataPoint;
    });

    // Calculate total available points from all challenges
    const challenges = await Challenge.find({}).select('points dynamicScoring').lean();
    const totalAvailablePoints = challenges.reduce((sum, challenge) => {
      // Use initial points for dynamic scoring, or regular points
      const challengePoints = challenge.dynamicScoring?.enabled 
        ? challenge.dynamicScoring.initial 
        : challenge.points;
      return sum + challengePoints;
    }, 0);

    const response = {
      competition: {
        name: competition.name,
        startTime: competition.startTime,
        startTimeMs: competitionStartTime
      },
      teams: graphData,
      chartData,
      timestamps: sortedTimestamps,
      totalAvailablePoints // Send to frontend for Y-axis scaling
    };

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
    console.error('Scoreboard graph error:', error);
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
