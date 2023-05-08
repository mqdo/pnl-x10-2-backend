const express = require('express');

const router = express.Router();

const {
  getAllStages,
  searchStages,
  addStage,
  updateStage,
  removeStage,
  getStageDetails,
  getReviewsList,
  addReview,
  updateReview,
  deleteReview,
  getTasksList
} = require('../controllers/stages.js')

router.get('/all', getAllStages)
router.get('/search', searchStages)
router.post('/add', addStage)
router.post('/update/:id', updateStage)
router.post('/delete/:id', removeStage)
router.get('/details/:id', getStageDetails)
router.post('/review/add/:id', addReview)
router.get('/review/:id', getReviewsList)
router.post('/review/update/:id', updateReview)
router.post('/review/delete/:id', deleteReview)
router.get('/tasks/:id', getTasksList)

module.exports = router;