const express = require('express');

const router = express.Router();

const {
  getAllProjects,
  getAllProjectsWithDetails,
  searchProjects,
  createNewProject,
  updateProject,
  deleteProject,
  getProjectDetails,
  getMembersList,
  addNewMembers,
  updateMember,
  removeMember,
  getStagesList,
  searchStages
} = require('../controllers/projects.js');

router.get('/all', getAllProjects);
router.get('/all/details', getAllProjectsWithDetails);
router.get('/search', searchProjects);
router.get('/details/:id', getProjectDetails);
router.post('/new', createNewProject);
router.post('/update/:id', updateProject);
router.post('/delete/:id', deleteProject);
router.get('/members/:id', getMembersList);
router.post('/members/add/:id', addNewMembers);
router.post('/members/update/:id', updateMember);
router.post('/members/remove/:id', removeMember);
router.get('/stages/:id', getStagesList);
router.get('/stages/search/:id', searchStages);

module.exports = router;