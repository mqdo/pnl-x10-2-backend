const mongoose = require('mongoose');

const { ObjectId, Mixed } = mongoose.Schema.Types;

const activitySchema = new mongoose.Schema({
  userId: {
    type: ObjectId,
    required: true,
    ref: 'Users'
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    immutable: true
  },
  action: {
    actionType: {
      type: String,
      enum: ['create', 'update', 'comment', 'complete', 'cancel'],
      required: true
    },
    from: {
      type: Mixed,
      required: true
    },
    to: {
      type: Mixed,
      required: true
    }
  }
});

module.exports = mongoose.model('Activities', activitySchema);
