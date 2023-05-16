const express = require('express');

const router = express.Router();
const {
  addComment,
  getComments,
  deleteComment,
  updateComment
} = require("../controllers/comments")
const {
  addNewTask,
  updateTask,
  getTaskDetails,
  getTaskActivities,
  swapTaskActivities,
  deleteTask
} = require('../controllers/tasks.js');

router.get('/details/:id', getTaskDetails);
router.post('/new', addNewTask);
router.post('/update/:id', updateTask);
router.post('/delete/:id', deleteTask);
router.get('/activities/:id', getTaskActivities);
router.post('/activities/swap/:id', swapTaskActivities);
router.post('/:id/addcomment', addComment);
router.get('/:id/getcomments', getComments);
router.delete('/:id/deletecomment/:commentid', deleteComment);
router.put('/:id/updatecomment/:commentid',updateComment)
module.exports = router;