const express = require('express');

const router = express.Router();
const {
  addComment,
  getComments,
  deleteComment
} = require("../controllers/comments")
const {
  addNewTask,
  updateTask,
  getTaskDetails,
  getTaskActivities,
  swapTaskActivities
} = require('../controllers/tasks.js');

router.get('/details/:id', getTaskDetails);
router.post('/new', addNewTask);
router.post('/update/:id', updateTask);
router.get('/activities/:id', getTaskActivities);
router.post('/activities/swap/:id', getTaskActivities);
router.post('/:id/addcomment', addComment);
router.get('/:id/getcomments', getComments);
router.delete('/:id/deletecomment/:commentid', deleteComment);

module.exports = router;