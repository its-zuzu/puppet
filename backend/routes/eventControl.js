const express = require('express');
const router = express.Router();
const EventState = require('../models/EventState');
const { protect, authorize } = require('../middleware/auth');
const { getEventState, refreshEventStateCache } = require('../middleware/eventState');
const { getRedisClient } = require('../utils/redis');

const redisClient = getRedisClient();

/**
 * @route   GET /api/event-control/status
 * @desc    Get current event state (public endpoint)
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const eventState = await getEventState();

    res.json({
      success: true,
      data: {
        status: eventState.status,
        startedAt: eventState.startedAt,
        endedAt: eventState.endedAt,
        customMessage: eventState.customMessage
        // Removed startedBy and endedBy (admin info not needed for public)
      }
    });
  } catch (error) {
    console.error('Error fetching event status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event status'
    });
  }
});

/**
 * @route   POST /api/event-control/start
 * @desc    Start the CTF event (admin only)
 * @access  Private/Admin
 */
router.post('/start', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const currentState = await getEventState();

    // Check if event is already started
    if (currentState.status === 'started') {
      return res.status(400).json({
        success: false,
        message: 'CTF event is already started'
      });
    }

    // Check if event was previously ended (can restart after ending)
    if (currentState.status === 'ended') {
      // Allow restarting after end (creates new event cycle)
      const updatedState = await EventState.updateEventState('started', req.user._id);

      // Refresh cache
      const stateObj = {
        status: updatedState.status,
        startedAt: updatedState.startedAt,
        endedAt: null,
        startedBy: updatedState.startedBy,
        endedBy: null
      };
      await refreshEventStateCache(stateObj);

      // Publish event to Redis for real-time updates
      try {
        await redisClient.publish('ctf:event:state', JSON.stringify({
          type: 'event_started',
          status: 'started',
          startedAt: updatedState.startedAt,
          startedBy: req.user.username || req.user._id
        }));
      } catch (err) {
        console.warn('[EventControl] Failed to publish event state change:', err.message);
      }

      return res.json({
        success: true,
        message: 'CTF event started successfully',
        data: {
          status: updatedState.status,
          startedAt: updatedState.startedAt,
          startedBy: updatedState.startedBy
        }
      });
    }

    // Start event from 'not_started' state
    const updatedState = await EventState.updateEventState('started', req.user._id);

    // Refresh cache
    const stateObj = {
      status: updatedState.status,
      startedAt: updatedState.startedAt,
      endedAt: null,
      startedBy: updatedState.startedBy,
      endedBy: null
    };
    await refreshEventStateCache(stateObj);

    // Publish event to Redis for real-time updates
    try {
      await redisClient.publish('ctf:event:state', JSON.stringify({
        type: 'event_started',
        status: 'started',
        startedAt: updatedState.startedAt,
        startedBy: req.user.username || req.user._id
      }));
    } catch (err) {
      console.warn('[EventControl] Failed to publish event state change:', err.message);
    }

    console.log(`[EventControl] CTF event started by admin ${req.user.username || req.user._id}`);

    res.json({
      success: true,
      message: 'CTF event started successfully',
      data: {
        status: updatedState.status,
        startedAt: updatedState.startedAt,
        startedBy: updatedState.startedBy
      }
    });
  } catch (error) {
    console.error('Error starting event:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting CTF event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/event-control/end
 * @desc    End the CTF event (admin only)
 * @access  Private/Admin
 */
router.post('/end', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const currentState = await getEventState();

    // Check if event is already ended
    if (currentState.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'CTF event is already ended'
      });
    }

    // Check if event was never started
    if (currentState.status === 'not_started') {
      return res.status(400).json({
        success: false,
        message: 'Cannot end event that has not been started'
      });
    }

    // End the event
    const updatedState = await EventState.updateEventState('ended', req.user._id);

    // Refresh cache
    const stateObj = {
      status: updatedState.status,
      startedAt: updatedState.startedAt,
      endedAt: updatedState.endedAt,
      startedBy: updatedState.startedBy,
      endedBy: updatedState.endedBy
    };
    await refreshEventStateCache(stateObj);

    // Publish event to Redis for real-time updates
    try {
      await redisClient.publish('ctf:event:state', JSON.stringify({
        type: 'event_ended',
        status: 'ended',
        endedAt: updatedState.endedAt,
        endedBy: req.user.username || req.user._id
      }));
    } catch (err) {
      console.warn('[EventControl] Failed to publish event state change:', err.message);
    }

    console.log(`[EventControl] CTF event ended by admin ${req.user.username || req.user._id}`);

    res.json({
      success: true,
      message: 'CTF event ended successfully. All submissions are now blocked.',
      data: {
        status: updatedState.status,
        startedAt: updatedState.startedAt,
        endedAt: updatedState.endedAt,
        endedBy: updatedState.endedBy
      }
    });
  } catch (error) {
    console.error('Error ending event:', error);
    res.status(500).json({
      success: false,
      message: 'Error ending CTF event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/event-control/set-message
 * @desc    Set custom message for event (admin only)
 * @access  Private/Admin
 */
router.post('/set-message', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { message } = req.body;

    // Validate message
    if (message && message.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 500 characters'
      });
    }

    const FIXED_ID = '000000000000000000000001';

    // Update custom message
    const updatedState = await EventState.findByIdAndUpdate(
      FIXED_ID,
      {
        customMessage: message || null,
        updatedAt: new Date()
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Refresh cache
    const stateObj = {
      status: updatedState.status,
      startedAt: updatedState.startedAt,
      endedAt: updatedState.endedAt,
      startedBy: updatedState.startedBy,
      endedBy: updatedState.endedBy,
      customMessage: updatedState.customMessage
    };
    await refreshEventStateCache(stateObj);

    // Publish event to Redis for real-time updates
    try {
      await redisClient.publish('ctf:event:state', JSON.stringify({
        type: 'message_updated',
        customMessage: updatedState.customMessage,
        updatedBy: req.user.username || req.user._id
      }));
    } catch (err) {
      console.warn('[EventControl] Failed to publish message update:', err.message);
    }

    console.log(`[EventControl] Custom message ${message ? 'set' : 'cleared'} by admin ${req.user.username || req.user._id}`);

    res.json({
      success: true,
      message: message ? 'Custom message set successfully' : 'Custom message cleared',
      data: {
        customMessage: updatedState.customMessage
      }
    });
  } catch (error) {
    console.error('Error setting custom message:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting custom message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
