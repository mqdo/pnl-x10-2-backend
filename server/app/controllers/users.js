const bcrypt = require('bcrypt');
const ObjectId = require('mongoose').Types.ObjectId;

const Users = require('../models/Users.js');
const isEmail = require('../../config/isEmail.js');

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
    if (fullName?.length > 4) {
      user.fullName = fullName;
    }
    if (allowedGenders.includes(gender)) {
      user.gender = gender;
    }
    if (dob?.length > 4) {
      user.dob = new Date(dob);
    }
    if (url) {
      user.avatar = url;
    }
    if (phone?.length > 4) {
      user.phone = phone;
    }
    await user.save();
    const newUser = await Users.findById(userId, { password: 0, '__v': 0 });
    return res.status(200).json({
      user: newUser,
      message: 'All fields are updated successfully'
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
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Old and new passwords are required' });
      }
      if (!bcrypt.compareSync(oldPassword, user.password)) {
        return res.status(401).json({ message: 'Password mismatch' });
      }
    }
    if (newPassword?.length > 4) {
      const hashPassword = bcrypt.hashSync(newPassword, 10);
      user.password = hashPassword;
    } else {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
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