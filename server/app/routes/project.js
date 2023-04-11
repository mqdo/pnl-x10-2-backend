const express = require('express');

const router = express.Router();

const { getAll, search } = require('../controllers/projects.js');

router.get('/all', getAll);
router.get('/search', search);

module.exports = router;