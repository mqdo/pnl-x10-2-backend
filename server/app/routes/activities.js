const express = require('express');

const router = express.Router();

const {
  updateActivityDetails,
  deleteActivity
} = require('../controllers/activities.js');

router.post('/update/:id', updateActivityDetails);
router.post('/delete/:id', deleteActivity);

module.exports = router;