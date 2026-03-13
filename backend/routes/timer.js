const express = require('express');
const router = express.Router();
const CompetitionTimer = require('../models/CompetitionTimer');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/timer
// @desc    Get current competition timer status
// @access  Public
router.get('/', async (req, res) => {
  try {
    let timer = await CompetitionTimer.findOne();
    
    if (!timer) {
      // Create default timer if none exists
      timer = await CompetitionTimer.create({
        isActive: false,
        durationMinutes: 120
      });
    }

    res.json({
      success: true,
      data: timer
    });
  } catch (error) {
    console.error('Timer fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching timer'
    });
  }
});

// @route   POST /api/timer/start
// @desc    Start competition timer
// @access  Private/Admin
router.post('/start', protect, authorize('admin'), async (req, res) => {
  try {
    const { durationMinutes } = req.body;
    const duration = durationMinutes || 120; // Default 2 hours

    let timer = await CompetitionTimer.findOne();
    
    if (!timer) {
      timer = new CompetitionTimer();
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 60000);

    timer.isActive = true;
    timer.startTime = now;
    timer.endTime = endTime;
    timer.durationMinutes = duration;
    timer.createdBy = req.user._id;
    timer.updatedAt = now;

    await timer.save();

    res.json({
      success: true,
      message: `Competition started for ${duration} minutes`,
      data: timer
    });
  } catch (error) {
    console.error('Timer start error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting timer'
    });
  }
});

// @route   POST /api/timer/stop
// @desc    Stop competition timer
// @access  Private/Admin
router.post('/stop', protect, authorize('admin'), async (req, res) => {
  try {
    let timer = await CompetitionTimer.findOne();
    
    if (!timer) {
      return res.status(404).json({
        success: false,
        message: 'No timer found'
      });
    }

    timer.isActive = false;
    timer.updatedAt = new Date();

    await timer.save();

    res.json({
      success: true,
      message: 'Competition stopped',
      data: timer
    });
  } catch (error) {
    console.error('Timer stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Error stopping timer'
    });
  }
});

// @route   POST /api/timer/extend
// @desc    Extend competition timer
// @access  Private/Admin
router.post('/extend', protect, authorize('admin'), async (req, res) => {
  try {
    const { additionalMinutes } = req.body;
    
    if (!additionalMinutes || additionalMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid additional minutes'
      });
    }

    let timer = await CompetitionTimer.findOne();
    
    if (!timer || !timer.isActive) {
      return res.status(400).json({
        success: false,
        message: 'No active competition to extend'
      });
    }

    const newEndTime = new Date(timer.endTime.getTime() + additionalMinutes * 60000);
    timer.endTime = newEndTime;
    timer.durationMinutes += additionalMinutes;
    timer.updatedAt = new Date();

    await timer.save();

    res.json({
      success: true,
      message: `Competition extended by ${additionalMinutes} minutes`,
      data: timer
    });
  } catch (error) {
    console.error('Timer extend error:', error);
    res.status(500).json({
      success: false,
      message: 'Error extending timer'
    });
  }
});

module.exports = router;
