const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const { getRedisClient } = require('../utils/redis');
const User = require('../models/User');
const Team = require('../models/Team');
const Submission = require('../models/Submission');
const Award = require('../models/Award');
const Challenge = require('../models/Challenge');

const redisClient = getRedisClient();

// Cache TTL in seconds (CTFd uses 60s for scoreboard)
const CACHE_TTL = 60;
const GRAPH_CACHE_TTL = 300; // 5 minutes for graph

/**
 * Helper: Get current freeze time if any
 * In a real implementation, this would come from a config/settings model
 */
const getFreezeTime = async () => {
  // TODO: Fetch from EventState or Config model
  return null;
};

/**
 * @route   GET /api/v1/scoreboard
 * @desc    Get full scoreboard (summary)
 * @access  Public (or Private based on settings)
 */
router.get('/', async (req, res) => {
  try {
    const type = req.query.type === 'users' ? 'users' : 'teams';
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');

    // Cache Key
    const cacheKey = `scoreboard:${type}:${isAdmin ? 'admin' : 'public'}`;

    // Try Cache
    const cached = await redisClient.get(cacheKey);
    if (cached && !isAdmin) { // Admins always get fresh data or short cache? keeping consistent
      return res.json(JSON.parse(cached));
    }

    const freezeTime = await getFreezeTime();

    // Aggregation Pipeline
    let standings = [];
    if (type === 'teams') {
      standings = await aggregateTeamStandings(isAdmin, freezeTime);
    } else {
      standings = await aggregateUserStandings(isAdmin, freezeTime);
    }

    const response = {
      success: true,
      data: standings
    };

    // Cache result
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(response));

    res.json(response);
  } catch (error) {
    console.error('Scoreboard Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * @route   GET /api/v1/scoreboard/top/:count
 * @desc    Get detailed scoreboard for top N teams/users (includes detailed solve history)
 */
router.get('/top/:count', async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 10;
    const type = req.query.type === 'users' ? 'users' : 'teams';
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');

    // Use a different cache key for detailed view if needed, or just partial?
    // CTFd returns a dict: { "1": { id, name, score, solves: [...] }, "2": ... }

    const cacheKey = `scoreboard:top:${count}:${type}:${isAdmin ? 'admin' : 'public'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached && !isAdmin) {
      return res.json(JSON.parse(cached));
    }

    const freezeTime = await getFreezeTime();

    // 1. Get Top N Standings First
    let topStandings = [];
    if (type === 'teams') {
      topStandings = await aggregateTeamStandings(isAdmin, freezeTime, count);
    } else {
      topStandings = await aggregateUserStandings(isAdmin, freezeTime, count);
    }

    // 2. For each top entry, fetch detailed solve history
    // This is N+1 but N is small (10-50). aggregated lookup is complex.
    const responseData = {};

    for (let i = 0; i < topStandings.length; i++) {
      const entry = topStandings[i];
      const rank = i + 1;

      // Fetch Solves
      const history = await getSolveHistory(entry.account_id, type === 'teams', freezeTime);

      responseData[rank] = {
        id: entry.account_id,
        name: entry.name,
        score: entry.score,
        solves: history
      };
    }

    const response = {
      success: true,
      data: responseData
    };

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
    res.json(response);

  } catch (error) {
    console.error('Scoreboard Top Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * @route   GET /api/v1/scoreboard/graph
 * @desc    Get score graph data
 */
router.get('/graph', async (req, res) => {
  try {
    const type = req.query.type === 'users' ? 'users' : 'teams';
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');

    const cacheKey = `scoreboard:graph:${type}:${isAdmin ? 'admin' : 'public'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached && !isAdmin) {
      return res.json(JSON.parse(cached));
    }

    const freezeTime = await getFreezeTime();

    // 1. Get Top 10 Standings (Graph usually shows top 10)
    let topStandings = [];
    if (type === 'teams') {
      topStandings = await aggregateTeamStandings(isAdmin, freezeTime, 10);
    } else {
      topStandings = await aggregateUserStandings(isAdmin, freezeTime, 10);
    }

    // 2. Generate Time Series for each
    const graphData = {}; // keyed by rank? CTFd returns object with key as rank string

    for (let i = 0; i < topStandings.length; i++) {
      const entry = topStandings[i];
      const rank = i + 1;

      const history = await getSolveHistory(entry.account_id, type === 'teams', freezeTime);

      // Sort history by date ASC
      history.sort((a, b) => new Date(a.date) - new Date(b.date));

      const series = [];
      let cumulativeScore = 0;

      // Add start point
      // series.push({ time: eventStart, score: 0 }); // Optional, CTFd might not do this

      for (const item of history) {
        cumulativeScore += item.value;
        series.push({
          time: new Date(item.date).getTime(),
          score: cumulativeScore
        });
      }

      graphData[rank] = {
        id: entry.account_id,
        name: entry.name,
        color: '', // Frontend handles color
        data: series
      };
    }

    const response = {
      success: true,
      data: graphData
    };

    await redisClient.setex(cacheKey, GRAPH_CACHE_TTL, JSON.stringify(response));
    res.json(response);

  } catch (error) {
    console.error('Scoreboard Graph Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * Helper: Aggregate User Standings
 * Returns: [{ account_id, name, score, date, rank }, ...]
 */
async function aggregateUserStandings(isAdmin, freezeTime, limit = null) {
  const matchStage = {
    isCorrect: true,
    points: { $gt: 0 } // exclude 0 point solves from summing? CTFd generally sums all. 
    // Actually 0 points solves are fine, but usually challenges have points.
  };

  if (freezeTime) {
    matchStage.submittedAt = { $lt: new Date(freezeTime) };
  }

  // 1. Aggregate Submissions
  const submissionAgg = await Submission.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$user",
        score: { $sum: "$points" },
        lastSolve: { $max: "$submittedAt" }
      }
    }
  ]);

  // 2. Aggregate Awards
  const awardMatch = { value: { $ne: 0 } };
  if (freezeTime) {
    awardMatch.date = { $lt: new Date(freezeTime) };
  }

  // Awards can be given to user directly
  const awardAgg = await Award.aggregate([
    { $match: { ...awardMatch, user: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: "$user",
        score: { $sum: "$value" },
        lastAward: { $max: "$date" }
      }
    }
  ]);

  // 3. Merge and Fetch User Details
  const userMap = new Map();

  // Process Submissions
  for (const sub of submissionAgg) {
    userMap.set(sub._id.toString(), {
      score: sub.score,
      lastDate: new Date(sub.lastSolve)
    });
  }

  // Process Awards
  for (const aw of awardAgg) {
    const uid = aw._id.toString();
    const current = userMap.get(uid) || { score: 0, lastDate: new Date(0) };

    current.score += aw.score;
    if (new Date(aw.lastAward) > current.lastDate) {
      current.lastDate = new Date(aw.lastAward);
    }
    userMap.set(uid, current);
  }

  // Filter Users (Hidden/Banned/Admin)
  const userQuery = { role: 'user' }; // Standard users only usually
  if (!isAdmin) {
    userQuery.hidden = { $ne: true };
    userQuery.banned = { $ne: true };
  }

  const users = await User.find(userQuery).select('_id username hidden banned').lean();

  const results = [];
  for (const user of users) {
    const uid = user._id.toString();
    const data = userMap.get(uid);

    if (data && data.score > 0) {
      results.push({
        account_id: uid,
        name: user.username,
        score: data.score,
        date: data.lastDate,
        account_url: `/users/${uid}`
      });
    }
  }

  // 4. Sort
  results.sort((a, b) => {
    // Score DESC
    if (b.score !== a.score) return b.score - a.score;
    // Date ASC (Earlier is better)
    if (a.date.getTime() !== b.date.getTime()) return a.date - b.date;
    // ID ASC (Tie breaker)
    return a.account_id.localeCompare(b.account_id);
  });

  if (limit) {
    return results.slice(0, limit);
  }

  // Add Rank
  return results.map((r, i) => ({ ...r, pos: i + 1 }));
}

/**
 * Helper: Aggregate Team Standings
 */
async function aggregateTeamStandings(isAdmin, freezeTime, limit = null) {
  // 1. Get all teams and their members first (Reverse mapping needed?)
  // Or we can aggregate from Submissions and lookup Team?
  // Submission -> User -> Team. 
  // Faster to Aggregate Submission -> Lookup User -> Group by User.Team

  const matchStage = {
    isCorrect: true,
    points: { $gt: 0 }
  };
  if (freezeTime) {
    matchStage.submittedAt = { $lt: new Date(freezeTime) };
  }

  // Aggregate Solves grouped by Team
  // This requires a lookup which can be expensive on large datasets, 
  // but standard for Mongo.
  const teamSolves = await Submission.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: '$userInfo' },
    {
      $match: {
        'userInfo.team': { $exists: true, $ne: null },
        // Filter banned/hidden users if strict, but usually team status matters
      }
    },
    {
      $group: {
        _id: '$userInfo.team',
        score: { $sum: '$points' },
        lastSolve: { $max: '$submittedAt' }
      }
    }
  ]);

  // Aggregate Awards (Team Awards + User Awards in Team?)
  // CTFd: Awards given to USER count for TEAM? Yes usually.
  // Awards given to TEAM count for TEAM.

  // Team Specific Awards
  const teamAwardMatch = { value: { $ne: 0 }, team: { $exists: true, $ne: null } };
  if (freezeTime) teamAwardMatch.date = { $lt: new Date(freezeTime) };

  const teamDirectAwards = await Award.aggregate([
    { $match: teamAwardMatch },
    {
      $group: {
        _id: '$team',
        score: { $sum: '$value' },
        lastAward: { $max: '$date' }
      }
    }
  ]);

  // User Awards (mapped to team)
  // NOTE: This might double count if logic isn't careful, but Award model enforces either user OR team.
  // So we just need awards where user -> team.
  const userAwardMatch = { value: { $ne: 0 }, user: { $exists: true, $ne: null } };
  if (freezeTime) userAwardMatch.date = { $lt: new Date(freezeTime) };

  const userAwardsInTeams = await Award.aggregate([
    { $match: userAwardMatch },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: '$userInfo' },
    { $match: { 'userInfo.team': { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$userInfo.team',
        score: { $sum: '$value' },
        lastAward: { $max: '$date' }
      }
    }
  ]);

  // Merge Everything
  const teamMap = new Map();

  const merge = (id, score, date) => {
    const sid = id.toString();
    const current = teamMap.get(sid) || { score: 0, lastDate: new Date(0) };
    current.score += score;
    if (new Date(date) > current.lastDate) {
      current.lastDate = new Date(date);
    }
    teamMap.set(sid, current);
  };

  teamSolves.forEach(t => merge(t._id, t.score, t.lastSolve));
  teamDirectAwards.forEach(t => merge(t._id, t.score, t.lastAward));
  userAwardsInTeams.forEach(t => merge(t._id, t.score, t.lastAward));

  // Fetch Team Metadata & Filter
  const teamQuery = { banned: false }; // Base filter
  if (!isAdmin) {
    teamQuery.hidden = { $ne: true };
  }

  const teams = await Team.find(teamQuery).select('_id teamName hidden banned').lean();

  const results = [];
  for (const team of teams) {
    const tid = team._id.toString();
    const data = teamMap.get(tid);

    if (data && data.score > 0) {
      results.push({
        account_id: tid,
        name: team.teamName,
        score: data.score,
        date: data.lastDate,
        account_url: `/teams/${tid}`
      });
    }
  }

  // Sort
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.date.getTime() !== b.date.getTime()) return a.date - b.date;
    return a.account_id.localeCompare(b.account_id);
  });

  if (limit) return results.slice(0, limit);
  return results.map((r, i) => ({ ...r, pos: i + 1 }));
}

/**
 * Helper: Get detailed solve history for graph/top view
 */
async function getSolveHistory(accountId, isTeam, freezeTime) {
  const history = [];
  const ids = [];

  if (isTeam) {
    // Get team members first
    const users = await User.find({ team: accountId }).select('_id');
    ids.push(...users.map(u => u._id));
  } else {
    ids.push(accountId);
  }

  // Solves
  const solveQuery = {
    user: { $in: ids },
    isCorrect: true,
    points: { $gt: 0 }
  };
  if (freezeTime) solveQuery.submittedAt = { $lt: new Date(freezeTime) };

  const solves = await Submission.find(solveQuery)
    .populate('challenge', 'title') // simplified
    .select('points submittedAt challenge')
    .lean();

  solves.forEach(s => {
    history.push({
      challenge_id: s.challenge?._id,
      challenge_name: s.challenge?.title || 'Unknown',
      value: s.points,
      date: s.submittedAt
    });
  });

  // Awards
  const awardQuery = { value: { $ne: 0 } };
  if (isTeam) {
    // Awards for team directly OR users in team
    awardQuery.$or = [
      { team: accountId },
      { user: { $in: ids } }
    ];
  } else {
    awardQuery.user = accountId;
  }
  if (freezeTime) awardQuery.date = { $lt: new Date(freezeTime) };

  const awards = await Award.find(awardQuery).select('value date name').lean();

  awards.forEach(a => {
    history.push({
      challenge_id: null,
      challenge_name: a.name || 'Award',
      value: a.value,
      date: a.date
    });
  });

  return history;
}

module.exports = router;
