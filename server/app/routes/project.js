const express = require('express');

const router = express.Router();

const { getAll, search, create, update, details, addNewMembers, removeMembers } = require('../controllers/projects.js');

router.get('/all', getAll);
router.get('/search', search);
router.get('/details/:id', details);
router.post('/new', create);
router.post('/update/:id', update);
router.post('/members/add/:id', addNewMembers);
router.post('/members/remove/:id', removeMembers);

module.exports = router;