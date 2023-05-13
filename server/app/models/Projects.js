const mongoose = require('mongoose');

const generateCode = require('../../config/generateCode.js');

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
  createdDate: {
    type: Date,
    immutable: true,
    default: Date.now
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
    enum: ['preparing', 'ongoing', 'suspended', 'completed'],
    default: 'preparing',
    required: true
  },
  members: [{
    data: {
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
      default: Date.now,
      immutable: true,
    },
    _id: false
  }],
  stages: [{
    type: mongoose.Types.ObjectId,
    ref: 'Stages',
    _id: false
  }]
});

projectsSchema.pre('save', (next) => {
  if (!this.code) {
    this.code = generateCode();
  }
  next();
})

module.exports = mongoose.model('Projects', projectsSchema)