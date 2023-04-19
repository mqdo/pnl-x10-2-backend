const express = require('express');

const { upload } = require('../app.js');

const router = express.Router();

const {
  getUserDetails,
  getUserDetailsById,
  updateUserDetails,
  updateUserPrivateDetails,
  deleteUser,
  getAllUsers,
  searchUsers
} = require('../controllers/users.js');

router.get('/details', getUserDetails);
router.get('/details/:id', getUserDetailsById);
router.post('/update', upload.single('avatar'), updateUserDetails);
router.post('/update/private', updateUserPrivateDetails);
router.post('/delete', deleteUser);
router.get('/all', getAllUsers);
router.get('/search', searchUsers);

module.exports = router;