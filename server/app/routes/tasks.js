const express = require('express');

const router = express.Router();
const {addcomment, getcomments } = require("../controllers/comments")
const {
  addNewTask,
  updateTask,
  getTaskDetails
} = require('../controllers/tasks.js');

router.get('/details/:id', getTaskDetails);
router.post('/new', addNewTask);
router.post('/update/:id', updateTask);
router.post("/:id/addcomment",addcomment)
router.get("/:id/getcomments",getcomments)

module.exports = router;