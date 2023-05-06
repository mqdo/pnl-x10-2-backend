const express = require('express');

const router = express.Router();

const {
  addNewTask,
  updateTask,
  getTaskDetails
} = require('../controllers/tasks.js');

router.get('/details/:id', getTaskDetails);
router.post('/new', addNewTask);
router.post('/update/:id', updateTask);

module.exports = router;