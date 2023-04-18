const ObjectId = require('mongoose').Types.ObjectId;

const Projects = require('../models/Projects.js');
const memberRoles = require('../../config/memberRoles.js');

const allowedStatuses = ['open', 'ongoing', 'suspended', 'completed'];
const allowedRoles = ['manager', 'leader', 'member', 'supervisor'];

const getAll = async (req, res) => {
  // console.log(req?.user);
  let page = req?.queries?.page || 1;
  try {
    let userId = new ObjectId(req?.user?.id);
    // console.log(userId);
    let projects = await Projects.find({ 'members.data': userId })
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar'
      })
      .sort({ createdDate: -1 })
      .limit(10)
      .skip(10 * (page - 1))
    // .populate({ path: 'stages', options: { allowEmptyArray: true } });

    return res.status(200).json({ projects: projects, n: projects.length });
  } catch (err) {
    console.log(err);
    return res.status(404).json({ message: 'No project found' })
  }
};
const search = async (req, res) => {
  const { name = false, status = false, page = 1 } = req.query;
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
      })
        .populate({
          path: 'members.data',
          options: { allowEmptyArray: true },
          select: '_id fullName email avatar'
        })
        .sort({ createdDate: -1 })
        .limit(10)
        .skip(10 * (page - 1))
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
const create = async (req, res) => {
  const { name, startDate, estimatedEndDate, description, status } = req.body;
  if (!name || !startDate || !estimatedEndDate || !description) {
    return res.status(400).json({ message: 'All fields are required' });
  };
  try {
    let userId = new ObjectId(req?.user?.id);
    let project = new Projects({
      name: name,
      startDate: new Date(startDate),
      estimatedEndDate: new Date(estimatedEndDate),
      description: description,
      status: allowedStatuses.includes(status) ? status : 'open'
    });
    project.members.push({
      data: userId,
      role: 'manager'
    });
    await project.save();
    let newProject = await Projects.findById(project._id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar'
      });
    return res.status(200).json({ message: 'Project created successfully', project: newProject });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Something went wrong' });
  }
};
const update = async (req, res) => {
  const { id } = req.params;
  const { name, startDate, estimatedEndDate, description, status } = req.body;
  try {
    let userId = new ObjectId(req?.user?.id);
    let project = await Projects.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let isAuthorized = project?.members.some((member) => member?.data.equals(userId) && (member?.role === 'manager' || member?.role === 'leader'));
    if (!isAuthorized) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (name) {
      project.name = name;
    }
    if (startDate) {
      project.startDate = new Date(startDate);
    }
    if (estimatedEndDate) {
      project.estimatedEndDate = new Date(estimatedEndDate);
    }
    if (description) {
      project.description = description;
    }
    if (status && allowedStatuses.includes(status)) {
      project.status = status;
    }
    await project.save();
    let newProject = await Projects.findById(project._id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar'
      });
    return res.status(200).json({ message: 'Project updated successfully', project: newProject });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Something went wrong' });
  }
};
const details = async (req, res) => {
  const { id } = req.params;
  try {
    let userId = new ObjectId(req?.user?.id);
    let project = await Projects.findById(id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar'
      });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let isMember = project?.members.some((member) => member?.data?._id.equals(userId));
    if (!isMember) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    return res.status(200).json({ project: project });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Something went wrong' });
  }
};
const addNewMembers = async (req, res) => {
  const members = req.body;
  const { id } = req.params;
  let userId = new ObjectId(req?.user?.id);
  try {
    let project = await Projects.findById(id);
    let roles = memberRoles(project?.members);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let isManager = project?.members.some((member) => member?.data.equals(userId) && member?.role === 'manager');
    let isLeader = project?.members.some((member) => member?.data.equals(userId) && member?.role === 'leader');
    if (!isManager && !isLeader) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    members.forEach((member) => {
      if (!project.members.some((m) => m.data.equals(member.id))) {
        let newRole = 'member';
        switch (member.role) {
          case 'leader':
            if (roles.leader < 3) {
              newRole = 'leader';
              roles.leader++;
            }
            break;
          case 'supervisor':
          case 'member':
            newRole = member.role;
            roles[member.role]++;
            break;
          case 'manager':
          default:
            break;
        }
        project.members.push({
          data: member.id,
          role: newRole,
          joiningDate: member.joiningDate || Date.now()
        });
      }
    });
    await project.save();
    let newProject = await Projects.findById(id);
    return res.status(200).json({ message: 'Add members successfully', project: newProject });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Something went wrong' });
  }
};
const removeMembers = async (req, res) => {
  const members = req.body;
  const { id } = req.params;
  let userId = new ObjectId(req?.user?.id);
  try {
    let project = await Projects.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let isManager = project?.members.some((member) => member?.data.equals(userId) && member?.role === 'manager');
    let isLeader = project?.members.some((member) => member?.data.equals(userId) && member?.role === 'leader');
    if (!isManager && !isLeader) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    members.forEach((member) => {
      const memberIndex = project.members.findIndex((m) => m.data.equals(member));
      if (memberIndex !== -1) {
        const memberRole = project.members[memberIndex].role;
        if (isManager || (isLeader && memberRole !== 'manager')) {
          project.members.pull({ data: member });
        }
      }
    });
    await project.save();
    let newProject = await Projects.findById(id);
    return res.status(200).json({ message: 'Remove members successfully', project: newProject });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Something went wrong' });
  }
}

module.exports = { getAll, search, create, update, details, addNewMembers, removeMembers };