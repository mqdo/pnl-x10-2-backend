const ObjectId = require('mongoose').Types.ObjectId;

const Projects = require('../models/Projects.js');
const Users = require('../models/Users.js');
const memberRoles = require('../utils/memberRoles.js');
const isDate = require('../utils/isDate.js');

const allowedStatuses = ['preparing', 'ongoing', 'suspended', 'completed'];
// const allowedRoles = ['manager', 'leader', 'member', 'supervisor'];

const getAllProjects = async (req, res) => {
  // console.log(req?.user);
  let { page, limit } = req.query;

  if (page && !isNaN(Number(page))) {
    page = Number(page) > 1 ? Number(page) : 1;
  } else {
    page = 1;
  }
  limit = limit && Number(limit) > 0 ? Number(limit) : 10;
  try {
    const userId = new ObjectId(req?.user?.id);
    // console.log(userId);
    const total = await Projects.countDocuments({ 'members.data': userId });
    let projects = await Projects.find({
      'members.data': userId
    }, { stages: 0 })
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar username'
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
const getAllProjectsWithDetails = async (req, res) => {
  try {
    const userId = new ObjectId(req?.user?.id);
    // console.log(userId);
    const total = await Projects.countDocuments({ 'members.data': userId });
    let projects = await Projects.find({
      'members.data': userId
    })
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar username'
      })
      .populate({
        path: 'stages',
        options: { allowEmptyArray: true },
        select: '_id name'
      })
      .populate({
        path: 'stages.tasks',
        options: { allowEmptyArray: true },
        select: '_id title'
      })
      .sort({ createdDate: -1 })

    return res.status(200).json({
      projects,
      total
    });
  } catch (err) {
    console.log(err);
    return res.status(404).json({ message: 'No project found' })
  }
};
const searchProjects = async (req, res) => {
  let {
    name = '',
    status = '',
    page,
    limit
  } = req.query;

  if (page && !isNaN(Number(page))) {
    page = Number(page) > 1 ? Number(page) : 1;
  } else {
    page = 1;
  }
  limit = limit && Number(limit) > 0 ? Number(limit) : 10;
  try {
    const userId = new ObjectId(req?.user?.id);
    let projects = [];
    let total = 0;
    // console.log(userId);
    total = await Projects.countDocuments({
      'members.data': userId,
      'name': {
        '$regex': name,
        '$options': 'i'
      },
      'status': status
    })
    projects = await Projects.find({
      'members.data': userId,
      'name': {
        '$regex': name,
        '$options': 'i'
      },
      'status': status
    }, {
      stages: 0
    })
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar username'
      })
      .sort({ createdDate: -1 })
      .limit(limit)
      .skip(limit * (page - 1));
      
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
      startDate: isDate(startDate) ? new Date(startDate) : Date.now(),
      estimatedEndDate: isDate(estimatedEndDate) ? new Date(estimatedEndDate) : Date.now(),
      description: description,
      status: allowedStatuses.includes(status) ? status : 'preparing'
    });
    project.members.push({
      data: userId,
      role: 'manager'
    });
    await project.save();

    const newProject = await Projects.findById(project._id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar username'
      });

    return res.status(201).json({
      message: 'Project created successfully',
      project: newProject
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
    if (isDate(startDate)) {
      project.startDate = new Date(startDate);
    }
    if (isDate(estimatedEndDate)) {
      project.estimatedEndDate = new Date(estimatedEndDate);
    }
    if (description) {
      project.description = description;
    }
    if (status && allowedStatuses.includes(status)) {
      project.status = status;
    }
    await project.save();

    const newProject = await Projects.findById(project._id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar username'
      });

    return res.status(201).json({
      message: 'Project updated successfully',
      project: newProject
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const deleteProject = async (req, res) => {
  const { id } = req.params;
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
    await Projects.findByIdAndDelete(id);
    return res.status(200).json({
      message: 'Project deleted successfully'
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
  let { page, limit, credential } = req.query;

  if (page && !isNaN(Number(page))) {
    page = Number(page) > 1 ? Number(page) : 1;
  } else {
    page = 1;
  }
  limit = limit && Number(limit) > 0 ? Number(limit) : 10;
  let userId = new ObjectId(req?.user?.id);
  try {
    let project = await Projects.findById(id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar username'
      });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let isMember = project?.members.some((member) => member?.data?._id?.equals(userId));
    if (!isMember) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    let filteredList;
    if (credential) {
      filteredList = project.members.filter((member) => {
        const regex = new RegExp(credential, 'gi');
        return (
          member.data?.fullName.match(regex) ||
          member.data?.email.match(regex) ||
          member.data?.username.match(regex)
        )
      })
    } else {
      filteredList = project.members;
    }
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = filteredList.length;
    const result = filteredList.slice(startIndex, endIndex);
    return res.status(200).json({
      projectId: project._id,
      members: result,
      total: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const getFullMembersList = async (req, res) => {
  const { id } = req.params;
  let userId = new ObjectId(req?.user?.id);
  try {
    let project = await Projects.findById(id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar username'
      });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let isMember = project?.members.some((member) => member?.data?._id?.equals(userId));
    if (!isMember) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const total = project.members.length;
    return res.status(200).json({
      projectId: project._id,
      members: project.members,
      total: total
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
        select: '_id fullName email avatar username'
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
    let newProject = await Projects.findById(id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar username'
      });
    return res.status(200).json({
      message: 'Add members successfully',
      projectId: newProject._id,
      members: newProject.members
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const updateMember = async (req, res) => {
  const member = req.body;
  const { id } = req.params;
  let userId = new ObjectId(req?.user?.id);
  try {
    let project = await Projects.findById(id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar username'
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
    for (const m of project.members) {
      if (m.data?._id.equals(member.id)) {
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
        if (isDate(member.joiningDate)) {
          m.joiningDate = new Date(member.joiningDate);
        }
        m.role = newRole;
      }
    }
    await project.save();
    const newProject = await Projects.findById(id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar username'
      });
    return res.status(200).json({
      message: 'Update member successfully',
      projectId: newProject._id,
      members: newProject.members
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
    for (const index in project.members) {
      if (project.members[index]?.data.equals(memberId)) {
        const memberRole = project.members[index].role;
        if (
          isManager ||
          (isLeader && (memberRole !== 'manager' || memberRole === 'leader'))
        ) {
          await project.members.pull({ data: memberId });
          await project.save();
        }
      }
    }
    const updatedProject = await Projects.findById(id)
      .populate({
        path: 'members.data',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar username'
      });

    return res.status(200).json({
      message: 'Remove member successfully',
      projectId: updatedProject._id,
      members: updatedProject.members
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const getStagesList = async (req, res) => {
  const { id } = req.params;
  let { page, limit } = req.query;

  if (page && !isNaN(Number(page))) {
    page = Number(page) > 1 ? Number(page) : 1;
  } else {
    page = 1;
  }
  limit = limit && Number(limit) > 0 ? Number(limit) : 10;
  let userId = new ObjectId(req?.user?.id);
  try {
    let project = await Projects.findById(id)
      .populate({
        path: 'stages',
        options: { allowEmptyArray: true }
      });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let isMember = project?.members.some((member) => member?.data.equals(userId));
    if (!isMember) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = project.stages.length;
    const result = project.stages.slice(startIndex, endIndex);
    return res.status(200).json({
      projectId: project._id,
      stages: result,
      total: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const searchStages = async (req, res) => {
  const { id } = req.params;
  let { name = '', page, limit } = req.query;

  if (page && !isNaN(Number(page))) {
    page = Number(page) > 1 ? Number(page) : 1;
  } else {
    page = 1;
  }
  limit = limit && Number(limit) > 0 ? Number(limit) : 10;
  let userId = new ObjectId(req?.user?.id);
  try {
    let project = await Projects.findById(id)
      .populate({
        path: 'stages',
        options: { allowEmptyArray: true }
      });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let isMember = project?.members.some((member) => member?.data.equals(userId));
    if (!isMember) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const regex = new RegExp(name, 'i');
    const stages = project.stages.filter((stage) => regex.test(stage.name));
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = stages.length;
    const result = stages.slice(startIndex, endIndex);
    return res.status(200).json({
      projectId: project._id,
      stages: result,
      total: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};

module.exports = {
  getAllProjects,
  getAllProjectsWithDetails,
  searchProjects,
  createNewProject,
  updateProject,
  deleteProject,
  getProjectDetails,
  getMembersList,
  getFullMembersList,
  addNewMembers,
  updateMember,
  removeMember,
  getStagesList,
  searchStages
};