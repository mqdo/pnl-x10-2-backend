const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Users'
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    immutable: true
  },
  actions: {
    type: [String],
    required: true
  }
});

module.exports = mongoose.model('Activities', activitySchema);
