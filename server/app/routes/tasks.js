const express = require('express');

const router = express.Router();

const {
  addNewTask,
  updateTask,
  getTask
} = require('../controllers/tasks.js');

router.get('/details/:id', getTask);
router.post('/new', addNewTask);
router.post('/update/:id', updateTask);

module.exports = router;