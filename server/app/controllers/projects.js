const ObjectId = require('mongoose').Types.ObjectId;

const Projects = require('../models/Projects.js');

const getAll = async (req, res) => {
  // console.log(req?.user);
  try {
    let userId = new ObjectId(req?.user?.id);
    // console.log(userId);
    let projects = await Projects.find({ 'members.data': userId })
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar'
      }).lean()
    // .populate({ path: 'stages', options: { allowEmptyArray: true } });

    return res.status(200).json({ projects: projects, n: projects.length });
  } catch (err) {
    console.log(err);
    return res.status(404).json({ message: 'No project found' })
  }
};
const search = async (req, res) => {
  const { name, status } = req.query;
  try {
    let userId = new ObjectId(req?.user?.id);
    let projects = [];
    // console.log(userId);
    if (name) {
      projects = await Projects.find({
        'members.data': userId,
        'name': {
          '$regex': name
        }
      }).populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar'
      }).lean()
      // .populate({ path: 'stages', options: { allowEmptyArray: true } });
    } else if (status) {
      projects = await Projects.find({
        'members.id': userId,
        'status': status
      });
    } else {
      return res.status(400).json({ message: 'Query not found' });
    }

    return res.status(200).json({ projects: projects, n: projects.length });
  } catch (err) {
    return res.status(404).json({ message: 'No project found' })
  }
};

module.exports = { getAll, search };