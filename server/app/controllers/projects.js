const ObjectId = require('mongoose').Types.ObjectId;

const Projects = require('../models/Projects.js');
const Users = require('../models/Users.js');
const memberRoles = require('../../config/memberRoles.js');

const allowedStatuses = ['preparing', 'ongoing', 'suspended', 'completed'];
// const allowedRoles = ['manager', 'leader', 'member', 'supervisor'];

const getAllProjects = async (req, res) => {
  // console.log(req?.user);
  const page = req?.queries?.page || 1;
  const limit = req?.queries?.limit || 10;
  try {
    const userId = new ObjectId(req?.user?.id);
    // console.log(userId);
    const total = await Projects.countDocuments({ 'members.data': userId });
    let projects = await Projects.find({
      'members.data': userId
    }, {
      members: 0,
      stages: 0
    })
      .sort({ createdDate: -1 })
      .limit(limit)
      .skip(limit * (page - 1))

    return res.status(200).json({
      projects,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.log(err);
    return res.status(404).json({ message: 'No project found' })
  }
};
const searchProjects = async (req, res) => {
  const {
    name = false,
    status = false,
    page = 1,
    limit = 10
  } = req.query;
  try {
    const userId = new ObjectId(req?.user?.id);
    let projects = [];
    let total = 0;
    // console.log(userId);
    if (name) {
      total = await Projects.countDocuments({
        'members.data': userId,
        'name': {
          '$regex': name,
          '$options': 'i'
        }
      })
      projects = await Projects.find({
        'members.data': userId,
        'name': {
          '$regex': name,
          '$options': 'i'
        }
      }, {
        members: 0,
        stages: 0
      })
        .sort({ createdDate: -1 })
        .limit(limit)
        .skip(limit * (page - 1))
    } else if (status) {
      total = await Projects.countDocuments({
        'members.id': userId,
        'status': status
      });
      projects = await Projects.find({
        'members.id': userId,
        'status': status
      }, {
        members: 0,
        stages: 0
      })
        .sort({ createdDate: -1 })
        .limit(limit)
        .skip(limit * (page - 1))
    } else {
      return res.status(400).json({ message: 'Query not found' });
    }
    return res.status(200).json({
      projects,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    return res.status(404).json({ message: 'No project found' })
  }
};
const createNewProject = async (req, res) => {
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
      status: allowedStatuses.includes(status) ? status : 'preparing'
    });
    project.members.push({
      data: userId,
      role: 'manager'
    });
    await project.save();
    project.members = undefined;
    project.stages = undefined;
    return res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const updateProject = async (req, res) => {
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
    project.members = undefined;
    project.stages = undefined;
    return res.status(200).json({
      message: 'Project updated successfully',
      project
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const getProjectDetails = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'Project\'s ID is required' });
  }
  try {
    let userId = new ObjectId(req?.user?.id);
    let project = await Projects.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let isMember = project?.members.some((member) => member?.data.equals(userId));
    if (!isMember) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    project.members = undefined;
    project.stages = undefined;
    return res.status(200).json({ project });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const getMembersList = async (req, res) => {
  const { id } = req.params;
  let userId = new ObjectId(req?.user?.id);
  try {
    let project = await Projects.findById(id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar'
      });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let isMember = project?.members.some((member) => member?.data.equals(userId));
    if (!isMember) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    return res.status(200).json({
      projectId: project._id,
      members: project.members
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const addNewMembers = async (req, res) => {
  const members = req.body;
  const { id } = req.params;
  let userId = new ObjectId(req?.user?.id);
  try {
    let project = await Projects.findById(id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar'
      });
    let roles = memberRoles(project?.members);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let isManager = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'manager'
    ));
    let isLeader = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'leader'
    ));
    if (!isManager && !isLeader) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    for (const member of members) {
      try {
        let user = await Users.findById(member.id);
        if (!user) continue;
      } catch (err) {
        continue;
      }
      if (!project?.members.some((m) => m?.data?._id.equals(member.id))) {
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
    }
    await project.save();
    return res.status(200).json({
      message: 'Add members successfully',
      projectId: project._id,
      members: project.members
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const removeMember = async (req, res) => {
  const { id: memberId } = req.body;
  const { id } = req.params;
  let userId = new ObjectId(req?.user?.id);
  try {
    let project = await Projects.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let isManager = project?.members.some((member) => member?.data?.equals(userId) && member?.role === 'manager');
    let isLeader = project?.members.some((member) => member?.data?.equals(userId) && member?.role === 'leader');
    if (!isManager && !isLeader) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const memberIndex = project.members.findIndex((m) => m?.data?.equals(memberId));
    if (memberIndex !== -1) {
      const memberRole = project.members[memberIndex].role;
      if (
        isManager ||
        (isLeader && (memberRole !== 'manager' || memberRole === 'leader'))
      ) {
        await project.members.pull({ data: memberId });
        await project.save();
      }
    }
    const updatedProject = await Projects.findById(id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar'
      });

    return res.status(200).json({
      message: 'Remove member successfully',
      projectId: updatedProject._id,
      members: updatedProject.members
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
}

module.exports = {
  getAllProjects,
  searchProjects,
  createNewProject,
  updateProject,
  getProjectDetails,
  getMembersList,
  addNewMembers,
  removeMember
};