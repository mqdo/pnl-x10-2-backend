const express = require('express');

const router = express.Router();

const {
  getAllProjects,
  searchProjects,
  createNewProject,
  updateProject,
  deleteProject,
  getProjectDetails,
  getMembersList,
  addNewMembers,
  removeMember,
  getStagesList
} = require('../controllers/projects.js');

router.get('/all', getAllProjects);
router.get('/search', searchProjects);
router.get('/details/:id', getProjectDetails);
router.post('/new', createNewProject);
router.post('/update/:id', updateProject);
router.post('/delete/:id', deleteProject);
router.get('/members/:id', getMembersList);
router.post('/members/add/:id', addNewMembers);
router.post('/members/remove/:id', removeMember);
router.get('/stages/:id', getStagesList);

module.exports = router;