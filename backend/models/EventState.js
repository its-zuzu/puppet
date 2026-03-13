const mongoose = require('mongoose');

const EventStateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['not_started', 'started', 'ended'],
    default: 'not_started',
    required: true
  },
  // CTFd-style competition times
  startedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },
  freezeAt: {
    type: Date,
    default: null
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  pausedAt: {
    type: Date,
    default: null
  },
  pausedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resumedAt: {
    type: Date,
    default: null
  },
  resumedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  startedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  endedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  customMessage: {
    type: String,
    default: null,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one EventState document exists
// Use a fixed _id to guarantee singleton pattern
EventStateSchema.statics.getEventState = async function () {
  const FIXED_ID = '000000000000000000000001'; // Fixed ObjectId for singleton

  // Use findByIdAndUpdate with upsert for atomic operation (prevents race conditions)
  // Note: Don't set updatedAt/createdAt here - timestamps: true handles it automatically
  const eventState = await this.findByIdAndUpdate(
    FIXED_ID,
    {
      $setOnInsert: {
        status: 'not_started'
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  return eventState;
};

EventStateSchema.statics.updateEventState = async function (status, userId) {
  const FIXED_ID = '000000000000000000000001';
  const updateData = {
    status,
    updatedAt: new Date()
  };

  if (status === 'started') {
    updateData.startedAt = new Date();
    updateData.startedBy = userId;
  } else if (status === 'ended') {
    updateData.endedAt = new Date();
    updateData.endedBy = userId;
  }

  return await this.findByIdAndUpdate(
    FIXED_ID,
    updateData,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

// CTFd-style helper: set competition times with validation
EventStateSchema.statics.setCompetitionTimes = async function ({ startTime, endTime, freezeTime }, userId = null) {
  const FIXED_ID = '000000000000000000000001';

  const startDate = startTime ? new Date(startTime) : null;
  const endDate = endTime ? new Date(endTime) : null;
  const freezeDate = freezeTime ? new Date(freezeTime) : null;

  if (startDate && Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid start time');
  }
  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid end time');
  }
  if (freezeDate && Number.isNaN(freezeDate.getTime())) {
    throw new Error('Invalid freeze time');
  }

  if (startDate && endDate && startDate >= endDate) {
    throw new Error('Start time must be before end time');
  }

  if (freezeDate) {
    if (!startDate || !endDate) {
      throw new Error('Freeze time requires both start and end time');
    }
    if (freezeDate <= startDate || freezeDate >= endDate) {
      throw new Error('Freeze time must be between start and end time');
    }
  }

  const now = new Date();
  let derivedStatus = 'not_started';
  if (startDate && now >= startDate) derivedStatus = 'started';
  if (endDate && now >= endDate) derivedStatus = 'ended';

  return await this.findByIdAndUpdate(
    FIXED_ID,
    {
      startedAt: startDate,
      endedAt: endDate,
      freezeAt: freezeDate,
      status: derivedStatus,
      isPaused: false,
      pausedAt: null,
      pausedBy: null,
      resumedAt: userId ? now : null,
      resumedBy: userId,
      updatedAt: now
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

// Index for fast lookups
EventStateSchema.index({ status: 1 });

module.exports = mongoose.model('EventState', EventStateSchema);
