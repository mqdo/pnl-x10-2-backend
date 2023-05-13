const express = require('express');

const router = express.Router();

const {
  getActivityDetails,
  updateActivityDetails,
  deleteActivity
} = require('../controllers/activities.js');

router.get('/details/:id', getActivityDetails);
router.post('/update/:id', updateActivityDetails);
router.post('/delete/:id', deleteActivity);

module.exports = router;