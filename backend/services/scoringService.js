/**
 * CTFd-Exact Scoring Service
 * 
 * Implements CTFd's scoring algorithms with exact parity:
 * - Static scoring (fixed points)
 * - Linear dynamic scoring (arithmetic decay)
 * - Logarithmic dynamic scoring (exponential decay curve)
 * - Awards integration
 * - Proper tie-breaking rules
 */

const Challenge = require('../models/Challenge');
const Award = require('../models/Award');
const User = require('../models/User');
const Team = require('../models/Team');
const Submission = require('../models/Submission');

/**
 * Calculate current value of a challenge based on solve count
 * @param {Object} challenge - Challenge document
 * @param {Number} solveCount - Number of solves (excluding hidden/banned users)
 * @returns {Number} Current point value
 */
function calculateChallengeValue(challenge, solveCount = null) {
  // Static challenges always return base points
  if (challenge.function === 'static' || !challenge.function) {
    return challenge.points;
  }

  // For dynamic challenges
  const initial = challenge.initial || challenge.points;
  const minimum = challenge.minimum || challenge.points;
  const decay = challenge.decay || 0;

  // If solveCount not provided, use challenge's solvedBy length
  if (solveCount === null) {
    solveCount = challenge.solvedBy?.length || 0;
  }

  // CRITICAL: Use (solveCount - 1) so first solver gets FULL initial value
  const adjustedSolveCount = Math.max(0, solveCount - 1);

  let value;

  if (challenge.function === 'linear') {
    // CTFd Linear Formula: value = initial - (decay * (solve_count - 1))
    value = initial - (decay * adjustedSolveCount);
  } else if (challenge.function === 'logarithmic') {
    // CTFd Logarithmic Formula: value = (((minimum - initial) / (decay^2)) * ((solve_count-1)^2)) + initial
    if (decay === 0) {
      value = initial; // Avoid division by zero
    } else {
      value = (((minimum - initial) / Math.pow(decay, 2)) * Math.pow(adjustedSolveCount, 2)) + initial;
    }
  } else {
    value = challenge.points; // Fallback
  }

  // Ensure value doesn't go below minimum
  value = Math.max(minimum, value);

  return Math.floor(value);
}

/**
 * Get solve count for a challenge (excluding hidden/banned users)
 * @param {String} challengeId - Challenge ID
 * @returns {Promise<Number>} Solve count
 */
async function getValidSolveCount(challengeId) {
  const challenge = await Challenge.findById(challengeId).populate({
    path: 'solvedBy',
    select: 'hidden banned'
  });

  if (!challenge) return 0;

  // Count only non-hidden, non-banned users
  const validSolves = challenge.solvedBy?.filter(user => 
    !user.hidden && !user.banned
  ).length || 0;

  return validSolves;
}

/**
 * Recalculate challenge value after a new solve
 * @param {String} challengeId - Challenge ID
 * @returns {Promise<Number>} New challenge value
 */
async function recalculateChallengeValue(challengeId) {
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new Error('Challenge not found');
  }

  // Only recalculate for dynamic challenges
  if (challenge.function === 'static' || !challenge.function) {
    return challenge.points;
  }

  const solveCount = await getValidSolveCount(challengeId);
  const newValue = calculateChallengeValue(challenge, solveCount);

  // Update the challenge's points field with the new value
  challenge.points = newValue;
  await challenge.save();

  return newValue;
}

/**
 * Calculate total score for a user (solves + awards)
 * @param {String} userId - User ID
 * @param {Boolean} includeHidden - Include hidden challenges (admin view)
 * @param {Date} freezeTime - Freeze timestamp (null = no freeze)
 * @returns {Promise<Object>} { score, lastSolveDate, lastSolveId }
 */
async function calculateUserScore(userId, includeHidden = false, freezeTime = null) {
  const user = await User.findById(userId).populate('personallySolvedChallenges');
  if (!user) {
    throw new Error('User not found');
  }

  let score = 0;
  let lastSolveDate = null;
  let lastSolveId = null;

  // Calculate score from solved challenges
  for (const challenge of user.personallySolvedChallenges || []) {
    // Skip hidden challenges unless admin view
    if (!includeHidden && challenge.state === 'hidden') {
      continue;
    }

    // Skip zero-point challenges (don't affect score/tie-breaking)
    const challengeValue = challenge.getCurrentValue();
    if (challengeValue === 0) {
      continue;
    }

    score += challengeValue;

    // Track last solve for tie-breaking (find the submission date)
    const submission = await Submission.findOne({
      user: userId,
      challenge: challenge._id,
      status: 'correct'
    }).select('createdAt _id').sort({ createdAt: -1 });

    if (submission) {
      // Apply freeze time filter
      if (freezeTime && submission.createdAt > freezeTime) {
        continue; // Skip this solve if after freeze
      }

      if (!lastSolveDate || submission.createdAt > lastSolveDate) {
        lastSolveDate = submission.createdAt;
        lastSolveId = submission._id;
      }
    }
  }

  // Add awards
  const awards = await Award.find({ user: userId });
  for (const award of awards) {
    // Apply freeze time filter
    if (freezeTime && award.date > freezeTime) {
      continue;
    }

    // Skip zero-value awards
    if (award.value === 0) {
      continue;
    }

    score += award.value;

    // Track last award for tie-breaking
    if (!lastSolveDate || award.date > lastSolveDate) {
      lastSolveDate = award.date;
      lastSolveId = award._id;
    }
  }

  return {
    score,
    lastSolveDate,
    lastSolveId
  };
}

/**
 * Calculate total score for a team (solves + awards)
 * @param {String} teamId - Team ID
 * @param {Boolean} includeHidden - Include hidden challenges (admin view)
 * @param {Date} freezeTime - Freeze timestamp (null = no freeze)
 * @returns {Promise<Object>} { score, lastSolveDate, lastSolveId }
 */
async function calculateTeamScore(teamId, includeHidden = false, freezeTime = null) {
  const team = await Team.findById(teamId).populate('members');
  if (!team) {
    throw new Error('Team not found');
  }

  let score = 0;
  let lastSolveDate = null;
  let lastSolveId = null;
  const solvedChallenges = new Set();

  // Aggregate solves from all team members
  for (const member of team.members) {
    const user = await User.findById(member._id).populate('personallySolvedChallenges');
    
    for (const challenge of user.personallySolvedChallenges || []) {
      // Skip if already counted
      if (solvedChallenges.has(challenge._id.toString())) {
        continue;
      }

      // Skip hidden challenges unless admin view
      if (!includeHidden && challenge.state === 'hidden') {
        continue;
      }

      // Skip zero-point challenges
      const challengeValue = challenge.getCurrentValue();
      if (challengeValue === 0) {
        continue;
      }

      score += challengeValue;
      solvedChallenges.add(challenge._id.toString());

      // Find earliest solve by any team member for this challenge
      const submission = await Submission.findOne({
        user: { $in: team.members.map(m => m._id) },
        challenge: challenge._id,
        status: 'correct'
      }).select('createdAt _id').sort({ createdAt: 1 }).limit(1);

      if (submission) {
        // Apply freeze time filter
        if (freezeTime && submission.createdAt > freezeTime) {
          continue;
        }

        if (!lastSolveDate || submission.createdAt > lastSolveDate) {
          lastSolveDate = submission.createdAt;
          lastSolveId = submission._id;
        }
      }
    }
  }

  // Add team awards
  const awards = await Award.find({ team: teamId });
  for (const award of awards) {
    // Apply freeze time filter
    if (freezeTime && award.date > freezeTime) {
      continue;
    }

    // Skip zero-value awards
    if (award.value === 0) {
      continue;
    }

    score += award.value;

    // Track last award for tie-breaking
    if (!lastSolveDate || award.date > lastSolveDate) {
      lastSolveDate = award.date;
      lastSolveId = award._id;
    }
  }

  return {
    score,
    lastSolveDate,
    lastSolveId
  };
}

/**
 * Get user standings with CTFd-exact tie-breaking
 * @param {Object} options - { limit, includeHidden, freezeTime }
 * @returns {Promise<Array>} Sorted standings
 */
async function getUserStandings(options = {}) {
  const { limit = null, includeHidden = false, freezeTime = null } = options;

  // Get all non-hidden, non-banned users
  const users = await User.find({ 
    hidden: false, 
    banned: false,
    role: { $ne: 'admin' } // Exclude admins
  });

  const standings = [];

  for (const user of users) {
    const scoreData = await calculateUserScore(user._id, includeHidden, freezeTime);
    
    // Only include users with score > 0
    if (scoreData.score > 0) {
      standings.push({
        id: user._id,
        name: user.username,
        score: scoreData.score,
        lastSolveDate: scoreData.lastSolveDate,
        lastSolveId: scoreData.lastSolveId
      });
    }
  }

  // CTFd-exact sorting: score DESC, date ASC, id ASC
  standings.sort((a, b) => {
    // 1. Higher score wins
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // 2. Earlier last solve wins (ASC)
    if (a.lastSolveDate && b.lastSolveDate) {
      const dateDiff = a.lastSolveDate - b.lastSolveDate;
      if (dateDiff !== 0) {
        return dateDiff;
      }
    } else if (a.lastSolveDate) {
      return -1; // a has solve, b doesn't
    } else if (b.lastSolveDate) {
      return 1; // b has solve, a doesn't
    }

    // 3. Lower ID wins (ASC)
    if (a.lastSolveId && b.lastSolveId) {
      return a.lastSolveId.toString().localeCompare(b.lastSolveId.toString());
    }

    return 0;
  });

  // Apply limit if specified
  if (limit && limit > 0) {
    return standings.slice(0, limit);
  }

  return standings;
}

/**
 * Get team standings with CTFd-exact tie-breaking
 * @param {Object} options - { limit, includeHidden, freezeTime }
 * @returns {Promise<Array>} Sorted standings
 */
async function getTeamStandings(options = {}) {
  const { limit = null, includeHidden = false, freezeTime = null } = options;

  const teams = await Team.find({ 
    hidden: false, 
    banned: false
  });

  const standings = [];

  for (const team of teams) {
    const scoreData = await calculateTeamScore(team._id, includeHidden, freezeTime);
    
    // Only include teams with score > 0
    if (scoreData.score > 0) {
      standings.push({
        id: team._id,
        name: team.teamName,
        score: scoreData.score,
        lastSolveDate: scoreData.lastSolveDate,
        lastSolveId: scoreData.lastSolveId
      });
    }
  }

  // CTFd-exact sorting: score DESC, date ASC, id ASC
  standings.sort((a, b) => {
    // 1. Higher score wins
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // 2. Earlier last solve wins (ASC)
    if (a.lastSolveDate && b.lastSolveDate) {
      const dateDiff = a.lastSolveDate - b.lastSolveDate;
      if (dateDiff !== 0) {
        return dateDiff;
      }
    } else if (a.lastSolveDate) {
      return -1;
    } else if (b.lastSolveDate) {
      return 1;
    }

    // 3. Lower ID wins (ASC)
    if (a.lastSolveId && b.lastSolveId) {
      return a.lastSolveId.toString().localeCompare(b.lastSolveId.toString());
    }

    return 0;
  });

  // Apply limit if specified
  if (limit && limit > 0) {
    return standings.slice(0, limit);
  }

  return standings;
}

module.exports = {
  calculateChallengeValue,
  getValidSolveCount,
  recalculateChallengeValue,
  calculateUserScore,
  calculateTeamScore,
  getUserStandings,
  getTeamStandings
};
