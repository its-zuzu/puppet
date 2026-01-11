const mongoose = require('mongoose');

const CompetitionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Static method to get current active competition
CompetitionSchema.statics.getCurrentCompetition = async function() {
  return await this.findOne({ isActive: true }).sort({ startTime: -1 });
};

module.exports = mongoose.model('Competition', CompetitionSchema);
