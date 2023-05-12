const express = require('express');

const { imgUpload } = require('../app.js');

const router = express.Router();

const {
  uploadImage
} = require('../controllers/upload.js');

router.post('/image', imgUpload.single('image'), uploadImage);

module.exports = router;