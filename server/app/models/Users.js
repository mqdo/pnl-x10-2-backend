const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  dob: {
    type: Date,
    default: Date.now
  },
  avatar: {
    type: String,
    default: 'https://res.cloudinary.com/dkt51586m/image/upload/v1680687930/profile-icon-design-free-vector_j3b3g7.jpg'
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    default: '',
  },
  username: {
    type: String,
    unique: true
  },
  password: {
    type: String,
    default: '',
  },
  userType: {
    type: String,
    enum: ['default', 'google'],
    default: 'default',
    required: true
  },
})

module.exports = mongoose.model('Users', usersSchema)