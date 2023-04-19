const express = require('express');

const router = express.Router();

const {
  getAllProjects,
  searchProjects,
  createNewProject,
  updateProject,
  getProjectDetails,
  getMembersList,
  addNewMembers,
  removeMember
} = require('../controllers/projects.js');

router.get('/all', getAllProjects);
router.get('/search', searchProjects);
router.get('/details/:id', getProjectDetails);
router.post('/new', createNewProject);
router.post('/update/:id', updateProject);
router.get('/members/:id', getMembersList);
router.post('/members/add/:id', addNewMembers);
router.post('/members/remove/:id', removeMember);

module.exports = router;