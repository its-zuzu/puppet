const mongoose = require('mongoose');

const EventStateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['not_started', 'started', 'ended'],
    default: 'not_started',
    required: true
  },
  startedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
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

// Index for fast lookups
EventStateSchema.index({ status: 1 });

module.exports = mongoose.model('EventState', EventStateSchema);
