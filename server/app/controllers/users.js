const bcrypt = require('bcrypt');
const ObjectId = require('mongoose').Types.ObjectId;

const Users = require('../models/Users.js');
const Projects = require('../models/Projects.js');
const Stages = require('../models/Stages.js');
const Tasks = require('../models/Tasks.js');
const Comments = require('../models/Comments.js');
const isEmail = require('../../config/isEmail.js');
const dateRegex = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/;

const basicInfo = {
  fullName: 1,
  avatar: 1,
  email: 1,
  username: 1,
  _id: 1
};
const allowedGenders = ['male', 'female', 'other'];

const getUserDetails = async (req, res) => {
  try {
    const userId = new ObjectId(req?.user?.id);
    const user = await Users.findById(userId, { password: 0, '__v': 0 });
    return res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    return res.status(404).json({ message: 'User not found' });
  }
};
const getUserDetailsById = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await Users.findById(id, { password: 0, '__v': 0 });
    return res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    return res.status(404).json({ message: 'User not found' });
  }
};
const updateUserDetails = async (req, res) => {
  const {
    fullName,
    gender,
    dob,
    phone
  } = req.body;
  try {
    const userId = new ObjectId(req?.user?.id);
    const user = await Users.findById(userId);
    const url = req?.file?.path;
    let changes = [];
    if (fullName?.length > 4) {
      user.fullName = fullName;
      changes.push('fullname');
    }
    if (allowedGenders.includes(gender)) {
      user.gender = gender;
      changes.push('gender');
    }
    if (dob && dateRegex.test(dob)) {
      user.dob = new Date(dob);
      changes.push('dob');
    }
    if (url) {
      user.avatar = url;
      changes.push('avatar');
    }
    if (phone?.length > 4) {
      user.phone = phone;
      changes.push('phone');
    }
    await user.save();
    const newUser = await Users.findById(userId, { password: 0, '__v': 0 });
    const message = changes.length > 0
      ? `User updated successfully (${changes.length} change(s): ${changes.join(', ')})`
      : 'No changes were made':
    return res.status(200).json({
      user: newUser,
      message
    });
  } catch (error) {
    console.log(error);
    return res.status(404).json({ message: 'User not found' });
  }
};
const updateUserPrivateDetails = async (req, res) => {
  const {
    email,
    username,
    oldPassword,
    newPassword
  } = req.body;
  try {
    const userId = new ObjectId(req?.user?.id);
    const user = await Users.findById(userId);
    let message = [];
    if (user.userType === 'default') {
      if (!oldPassword) {
        return res.status(400).json({ message: 'Old password is required' });
      }
      if (!bcrypt.compareSync(oldPassword, user.password)) {
        return res.status(401).json({ message: 'Password mismatch' });
      }
    }
    if (newPassword) {
      if (newPassword?.length >= 8 && newPassword?.length <= 16) {
        const hashPassword = bcrypt.hashSync(newPassword, 10);
        user.password = hashPassword;
      } else {
        return res.status(400).json({ message: 'New password must be between 8 and 16 characters' });
      }
    }
    if (isEmail(email)) {
      let emailExisted = await Users.findOne({ email });
      if (emailExisted) {
        message.push('Email has already been used');
      } else {
        user.email = email;
      }
    }
    if (username?.length > 4) {
      let usernameExisted = await Users.findOne({ username });
      if (usernameExisted && !usernameExisted._id.equals(user._id)) {
        message.push('Username has already been used');
      } else {
        user.username = username;
      }
    }
    await user.save();
    const newUser = await Users.findById(userId, { password: 0, '__v': 0 });
    return res.status(200).json({
      user: newUser,
      message: message.length > 0 ? message.join(', ') : 'All fields are updated successfully'
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: message.length > 0 ? message.join(', ') : 'User not found' });
  }
};
const deleteUser = async (req, res) => {
  const password = req.body?.password;
  const username = req.body?.username;
  try {
    const userId = new ObjectId(req?.user?.id);
    const user = await Users.findById(userId);
    if (user.userType === 'default') {
      if (!password || !username) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: 'Password mismatch' });
      }
      if (user.username !== username) {
        return res.status(401).json({ message: 'Username incorrect' });
      }
    }
    await Users.findByIdAndDelete(userId);
    await Projects.updateMany(
      { 'members.data': userId },
      { $pull: { members: { data: userId } } }
    );
    await Stages.updateMany(
      { 'reviews.reviewer': userId },
      { $pull: { reviewers: userId } }
    );
    await Tasks.updateMany(
      { $or: [{ createdBy: userId }, { assignedTo: userId }] },
      { $unset: { createdBy: userId, assignedTo: userId } }
    );
    await Comments.updateMany(
      { 'commenter': userId },
      { $pull: { commenter: userId } }
    );
    return res.status(200).json({ message: 'User delete successfully' });
  } catch (error) {
    console.log(error);
    return res.status(404).json({ message: 'User not found' });
  }
};
const getAllUsers = async (req, res) => {
  const page = req?.queries?.page || 1;
  const limit = req?.queries?.limit || 10;
  try {
    const total = await Users.countDocuments({});
    let users = await Users.find({}, basicInfo)
      .sort({ fullName: 1 })
      .limit(limit)
      .skip(limit * (page - 1))
    return res.status(200).json({
      users,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (err) {
    console.log(err);
    return res.status(404).json({ message: 'No user found' })
  }
};
const searchUsers = async (req, res) => {
  const query = req.query?.query || '';
  try {
    const total = await Users.countDocuments({
      $or: [
        { fullName: { '$regex': query, '$options': 'i' } },
        { email: { '$regex': query, '$options': 'i' } },
        { username: { '$regex': query, '$options': 'i' } }
      ]
    });
    let users = await Users.find({
      $or: [
        { fullName: { '$regex': query, '$options': 'i' } },
        { email: { '$regex': query, '$options': 'i' } },
        { username: { '$regex': query, '$options': 'i' } }
      ]
    }, basicInfo).sort({ fullName: 1 })

    return res.status(200).json({
      users,
      total
    })
  } catch (err) {
    console.log(err);
    return res.status(404).json({ message: 'No user found' })
  }
};

module.exports = {
  getUserDetails,
  getUserDetailsById,
  updateUserDetails,
  updateUserPrivateDetails,
  deleteUser,
  getAllUsers,
  searchUsers
};