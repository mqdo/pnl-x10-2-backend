const mongoose = require('mongoose');

const projectsSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true
  },
  estimatedEndDate: {
    type: Date,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['open', 'ongoing', 'suspended', 'completed'],
    default: 'open',
    required: true
  },
  members: [{
    id: {
      type: mongoose.Types.ObjectId,
      ref: 'Users'
    },
    role: {
      type: String,
      required: true,
      enum: ['manager', 'leader', 'member', 'supervisor']
    },
    joiningDate: {
      type: Date,
      required: true,
      default: Date.now
    }
  }]
})

module.exports = mongoose.model('Projects', projectsSchema)