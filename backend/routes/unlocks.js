const express = require('express');
const router = express.Router();
const Unlock = require('../models/Unlock');
const User = require('../models/User');
const Team = require('../models/Team');
const Challenge = require('../models/Challenge');
const { protect } = require('../middleware/auth');
const { checkEventNotEnded } = require('../middleware/eventState');

/**
 * CTFd-style Unlocks API
 * POST /api/unlocks - Create an unlock (unlock a hint)
 * GET /api/unlocks - Get user's unlocks (admin only)
 */

// @route   POST /api/unlocks
// @desc    Unlock a hint by spending points (CTFd-style)
// @access  Private
router.post('/', protect, checkEventNotEnded, async (req, res) => {
  try {
    const { target, type, challenge: challengeId } = req.body;
    const userId = req.user._id || req.user.id;

    console.log('[Unlock] Request:', { userId, challengeId, target, type });

    // Validate required fields
    if (type !== 'hints') {
      return res.status(400).json({
        success: false,
        errors: { type: 'Only hints are supported for unlocking' }
      });
    }

    if (target === undefined || target < 0) {
      return res.status(400).json({
        success: false,
        errors: { target: 'Invalid target (hint index)' }
      });
    }

    if (!challengeId) {
      return res.status(400).json({
        success: false,
        errors: { challenge: 'Challenge ID is required' }
      });
    }

    // Get challenge
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        errors: { challenge: 'Challenge not found' }
      });
    }

    // Check if hint exists
    if (!challenge.hints || !challenge.hints[target]) {
      return res.status(404).json({
        success: false,
        errors: { target: 'Hint not found' }
      });
    }

    const hint = challenge.hints[target];

    // Get user with team info
    const user = await User.findById(userId).populate('team');
    if (!user) {
      return res.status(404).json({
        success: false,
        errors: { user: 'User not found' }
      });
    }

    // Check for existing unlock (prevent double unlock)
    const query = {
      challenge: challengeId,
      target: target,
      type: 'hints'
    };

    if (user.team) {
      // In team mode, check if either user or team has unlocked
      query.$or = [
        { user: userId },
        { team: user.team._id }
      ];
    } else {
      query.user = userId;
    }

    const existingUnlock = await Unlock.findOne(query);
    if (existingUnlock) {
      return res.status(400).json({
        success: false,
        errors: { target: "You've already unlocked this target" }
      });
    }

    // Calculate available points (team or individual)
    let availablePoints = user.points;
    let teamData = null;

    if (user.team) {
      const team = await Team.findById(user.team._id).populate('members', 'points');
      if (team) {
        teamData = team;
        
        // Team points = sum of member points + team awards (includes negative values)
        const memberPoints = team.members.reduce((sum, member) => sum + (member.points || 0), 0);
        
        // Get team awards (includes hint unlock deductions as negative awards)
        const Award = require('../models/Award');
        const awards = await Award.find({ team: team._id }).select('value');
        const awardPoints = awards.reduce((sum, award) => sum + (award.value || 0), 0);
        
        availablePoints = Math.max(0, memberPoints + awardPoints);
        
        console.log('[Unlock] Team points calculation:', {
          memberPoints,
          awardPoints,
          totalAvailable: availablePoints
        });
      }
    }

    console.log('[Unlock] Points check:', { 
      required: hint.cost, 
      available: availablePoints, 
      isTeam: !!teamData 
    });

    // Check if enough points
    if (availablePoints < hint.cost) {
      return res.status(400).json({
        success: false,
        errors: {
          score: 'You do not have enough points to unlock this hint'
        }
      });
    }

    // Create unlock record (logs who unlocked and when)
    const unlock = new Unlock({
      user: userId,
      team: user.team ? user.team._id : null,
      challenge: challengeId,
      target: target,
      type: 'hints'
    });

    await unlock.save();

    // Deduct cost from TEAM score (not individual user)
    // CTFd-style: Create negative award for the team
    if (hint.cost > 0 && teamData) {
      const Award = require('../models/Award');
      
      await Award.create({
        team: teamData._id,
        user: null, // Team award, not user award
        name: `Hint Unlock: ${challenge.title}`,
        description: `Hint #${target + 1} unlocked by ${user.username}`,
        value: -hint.cost, // NEGATIVE value to deduct points
        category: 'hints',
        icon: 'hint'
      });

      console.log('[Unlock] Team award created:', { 
        team: teamData.name,
        cost: hint.cost,
        unlockedBy: user.username
      });
    }

    console.log('[Unlock] Success:', { 
      hintIndex: target, 
      cost: hint.cost,
      teamMode: !!teamData,
      unlockedBy: user.username
    });

    // Return CTFd-style response
    res.json({
      success: true,
      data: {
        id: unlock._id,
        user_id: unlock.user,
        team_id: unlock.team,
        target: unlock.target,
        type: unlock.type,
        date: unlock.date
      }
    });
  } catch (error) {
    console.error('[Unlock] Error:', error);
    
    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        errors: { target: "You've already unlocked this target" }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/unlocks
// @desc    Get all unlocks for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).populate('team');

    const query = { type: 'hints' };

    if (user.team) {
      query.$or = [
        { user: userId },
        { team: user.team._id }
      ];
    } else {
      query.user = userId;
    }

    const unlocks = await Unlock.find(query)
      .populate('challenge', 'title category')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: unlocks.map(unlock => ({
        id: unlock._id,
        target: unlock.target,
        type: unlock.type,
        date: unlock.date,
        challenge: unlock.challenge
      }))
    });
  } catch (error) {
    console.error('[Unlock] Get error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
