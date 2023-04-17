const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const Users = require('../models/Users.js');
const isEmail = require('../../config/isEmail.js');

const secretKey = process.env.JWT_SECRET_KEY;

const login = async (req, res) => {
  const { credential, password, rememberMe = false } = req.body;
  if (!credential || !password) {
    return res.status(400).json({ message: 'Username (or email) and password must be provided' });
  }
  let user;
  try {
    if (isEmail(credential)) {
      user = await Users.findOne({ email: credential });
    } else {
      user = await Users.findOne({ username: credential });
    }
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Password mismatch' });
    }
    const duration = rememberMe ? '30d' : '1d';
    const token = jwt.sign({
      id: user._id,
      fullName: user.fullName
    }, secretKey, {
      expiresIn: duration
    });
    let { '_doc': { password: userPassword, ...data } } = user;
    return res.status(200).json({ 'message': 'Login successfully', token, data });
  } catch (err) {
    return res.status(500).json({ message: 'Error: ' + err.message || 'Something went wrong!' });
  }
};
const signup = async (req, res) => {
  const { fullName, email, username, password, rememberMe = false } = req.body;
  if (!fullName || !email || !username || !password) {
    return res.status(401).json({ message: 'All fields must be provided' });
  }
  try {
    let emailExisted = await Users.findOne({ email: email });
    if (emailExisted) {
      return res.status(401).json({ message: 'Email has already been used' });
    }
    let usernameExisted = await Users.findOne({ username: username });
    if (usernameExisted) {
      return res.status(401).json({ message: 'Username has already been used' });
    }
    const hashPassword = bcrypt.hashSync(password, 10);
    const user = new Users({
      fullName: fullName,
      email: email,
      username: username,
      password: hashPassword
    });
    user.save();
    const duration = rememberMe ? '30d' : '1d'
    const token = jwt.sign({
      id: user._id,
      fullName: user.fullName
    }, secretKey, {
      expiresIn: duration
    })
    let { '_doc': { password: userPassword, ...data } } = user;
    return res.status(200).json({ 'message': 'Signup successfully', token, data });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Something went wrong!' });
  }
};

module.exports = {
  login,
  signup
}