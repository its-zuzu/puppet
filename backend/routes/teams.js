const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/teams
// @desc    Create a new team (Admin only)
// @access  Private/Admin
router.post('/', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { name, description, members, captain, maxMembers } = req.body;
    const MAX_TEAM_MEMBERS = maxMembers || parseInt(process.env.MAX_TEAM_MEMBERS) || 2;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    if (members && members.length > MAX_TEAM_MEMBERS) {
      return res.status(400).json({
        success: false,
        message: `A team can have maximum ${MAX_TEAM_MEMBERS} members`
      });
    }

    // Validate member IDs exist and are valid users
    if (members && members.length > 0) {
      const validMembers = await User.find({
        _id: { $in: members },
        role: 'user',
        team: { $exists: false }
      });

      if (validMembers.length !== members.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more selected users are invalid or already in a team'
        });
      }

      // Validate captain is in members list
      if (captain && !members.includes(captain)) {
        return res.status(400).json({
          success: false,
          message: 'Captain must be a selected team member'
        });
      }
    }

    const team = await Team.create({
      name,
      description,
      members: members || [],
      captain: captain || null,
      createdBy: req.user._id || req.user.id
    });

    if (members && members.length > 0) {
      await User.updateMany(
        { _id: { $in: members } },
        { team: team._id }
      );
    }

    const populatedTeam = await team.populate('members createdBy captain');

    res.status(201).json({
      success: true,
      data: populatedTeam
    });
  } catch (error) {
    console.error('Team creation error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error creating team'
    });
  }
});

// @route   GET /api/teams/my/team
// @desc    Get current user's team
// @access  Private
router.get('/my/team', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('team');

    if (!user || !user.team) {
      return res.status(404).json({
        success: false,
        message: 'You are not part of any team'
      });
    }

    const team = await Team.findById(user.team)
      .populate('members', 'username email points solvedChallenges')
      .populate('captain', 'username email points solvedChallenges')
      .populate('createdBy', 'username');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Error fetching user team:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team'
    });
  }
});

// @route   GET /api/teams
// @desc    Get all teams with pagination
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.q || '';

    const query = search ? { name: { $regex: search, $options: 'i' } } : {};

    const total = await Team.countDocuments(query);
    
    // Check if user is admin
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    
    // Hide emails only, keep solvedChallenges visible for transparency
    const memberFields = isAdmin ? 'username email points' : 'username points';
    const captainFields = isAdmin ? 'username email points' : 'username points';
    
    const teams = await Team.find(query)
      .populate('members', memberFields)
      .populate('captain', captainFields)
      .populate('createdBy', 'username')
      .sort({ points: -1 })
      .limit(limit)
      .skip(skip);

    res.json({
      success: true,
      count: teams.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching teams'
    });
  }
});

// @route   GET /api/teams/:id
// @desc    Get single team
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    
    // Hide emails only, show solvedChallenges and unlockedHints for transparency
    const memberFields = isAdmin 
      ? 'username email points solvedChallenges personallySolvedChallenges unlockedHints'
      : 'username points solvedChallenges personallySolvedChallenges unlockedHints';
    const captainFields = isAdmin 
      ? 'username email points solvedChallenges personallySolvedChallenges unlockedHints'
      : 'username points solvedChallenges personallySolvedChallenges unlockedHints';
    
    const team = await Team.findById(req.params.id)
      .populate('members', memberFields)
      .populate('captain', captainFields)
      .populate('createdBy', 'username');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Calculate points dynamically for each member from submissions (like scoreboard does)
    const Submission = require('../models/Submission');
    const mongoose = require('mongoose');
    const memberIds = team.members.map(m => m._id);
    
    const memberStatsAgg = await Submission.aggregate([
      { $match: { user: { $in: memberIds }, isCorrect: true } },
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
          _id: '$user',
          totalPoints: { $sum: '$challengeData.points' },
          solvedCount: { $sum: 1 },
          solvedChallenges: { $addToSet: '$challenge' }
        }
      }
    ]);
    
    // Create a map of userId -> calculated stats
    const statsMap = new Map();
    memberStatsAgg.forEach(item => {
      const userId = item._id.toString();
      statsMap.set(userId, {
        points: item.totalPoints,
        solvedCount: item.solvedCount,
        personalSolvedChallenges: item.solvedChallenges
      });
    });
    
    // Update each member with their calculated stats
    team.members.forEach(member => {
      const memberId = member._id.toString();
      const stats = statsMap.get(memberId);
      if (stats) {
        member.points = stats.points;
        member.personallySolvedCount = stats.solvedCount;
        member.personallySolvedChallenges = stats.personalSolvedChallenges;
      } else {
        member.points = 0;
        member.personallySolvedCount = 0;
        member.personallySolvedChallenges = [];
      }
      // Remove the misleading solvedChallenges array (team-wide)
      delete member.solvedChallenges;
    });
    
    // Calculate team points from calculated member points
    const memberPoints = team.members.reduce((sum, member) => sum + (member.points || 0), 0);
    
    // Get team awards (includes negative awards for hint unlocks)
    const Award = require('../models/Award');
    const awards = await Award.find({ team: team._id }).select('value');
    const awardPoints = awards.reduce((sum, award) => sum + (award.value || 0), 0);
    
    const calculatedPoints = Math.max(0, memberPoints + awardPoints);

    // Calculate team rank
    const teamsWithHigherPoints = await Team.countDocuments({
      _id: { $ne: team._id }
    });
    
    // Get all teams to calculate rank properly (include awards in calculations)
    const allTeams = await Team.find().populate('members', 'points').lean();
    const teamsWithPoints = await Promise.all(allTeams.map(async (t) => {
      const tMemberPoints = t.members.reduce((sum, m) => sum + (m.points || 0), 0);
      const tAwards = await Award.find({ team: t._id }).select('value').lean();
      const tAwardPoints = tAwards.reduce((sum, a) => sum + (a.value || 0), 0);
      return {
        _id: t._id,
        totalPoints: Math.max(0, tMemberPoints + tAwardPoints)
      };
    }));
    teamsWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);
    
    const rank = teamsWithPoints.findIndex(t => t._id.toString() === team._id.toString()) + 1;
    
    // Calculate total solved challenges (unique challenges across team from actual submissions)
    const allSolvedChallenges = new Set();
    team.members.forEach(member => {
      if (member.personallySolvedChallenges && Array.isArray(member.personallySolvedChallenges)) {
        member.personallySolvedChallenges.forEach(challenge => {
          allSolvedChallenges.add(challenge.toString());
        });
      }
    });

    // Update team object with calculated values
    const teamData = team.toObject();
    teamData.totalPoints = calculatedPoints;
    teamData.points = calculatedPoints; // Keep for backward compatibility
    teamData.rank = rank;
    teamData.solvedChallenges = allSolvedChallenges.size;

    res.json({
      success: true,
      data: teamData
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team'
    });
  }
});

// @route   PUT /api/teams/:id
// @desc    Update team (Admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (members && members.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'A team must have exactly 2 members'
      });
    }

    let team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const oldMembers = team.members || [];

    if (name) team.name = name;
    if (description) team.description = description;
    if (members) {
      team.members = members;

      await User.updateMany(
        { _id: { $in: oldMembers } },
        { $unset: { team: 1 } }
      );

      await User.updateMany(
        { _id: { $in: members } },
        { team: team._id }
      );
    }

    team = await team.save();
    await team.populate('members createdBy');

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating team'
    });
  }
});

// @route   DELETE /api/teams/:id
// @desc    Delete team (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    await User.updateMany(
      { team: req.params.id },
      { $unset: { team: 1 } }
    );

    await Team.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting team'
    });
  }
});

// @route   POST /api/teams/:id/members/:userId
// @desc    Add member to team (Admin only)
// @access  Private/Admin
router.post('/:id/members/:userId', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    if (team.members.length >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Team already has 2 members'
      });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (team.members.includes(req.params.userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this team'
      });
    }

    team.members.push(req.params.userId);
    await team.save();

    user.team = team._id;
    await user.save();

    await team.populate('members createdBy');

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding member to team'
    });
  }
});

// @route   DELETE /api/teams/:id/members/:userId
// @desc    Remove member from team (Admin only)
// @access  Private/Admin
router.delete('/:id/members/:userId', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    team.members = team.members.filter(id => id.toString() !== req.params.userId);
    await team.save();

    await User.findByIdAndUpdate(req.params.userId, { $unset: { team: 1 } });

    await team.populate('members createdBy');

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing member from team'
    });
  }
});

module.exports = router;
