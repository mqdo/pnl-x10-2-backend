const ObjectId = require('mongoose').Types.ObjectId;

const Users = require('../models/Users.js');
const Projects = require('../models/Projects.js');
const Stages = require('../models/Stages.js');
const Tasks = require('../models/Tasks.js');

const validPriors = ['highest', 'high', 'medium', 'low', 'lowest'];

const addNewTask = async (req, res) => {
  const {
    stageId,
    title,
    type,
    priority,
    startDate,
    deadline,
    description,
    assignee
  } = req.body;
  if (
    !stageId ||
    !title ||
    !priority ||
    !startDate ||
    !deadline
  ) {
    return res.status(400).json({ message: 'stageId, title, priority, startDate, deadline and endDate are required' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const stage = await Stages.findById(stageId);
    if (!stage) {
      return res.status(400).json({ message: 'stageId incorrect or stage not found' });
    }

    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [new ObjectId(stageId)] }
    });

    if (!project) {
      return res.status(400).json({ message: 'Project of the stage not found or user not authorized' });
    }

    const newStartDate = new Date(startDate);
    const newDeadline = new Date(deadline);
    const newEndDate = new Date(endDate);

    if (newDeadline <= newStartDate) {
      return res.status(400).json({ message: 'deadline of the task must be after startDate' });
    }

    if (newEndDate <= newStartDate) {
      return res.status(400).json({ message: 'endDate of the task must be after startDate' });
    }

    const task = new Tasks({
      title,
      startDate: newStartDate,
      deadline: newDeadline,
      endDate: newEndDate
    });

    if (!validPriors.includes(priority)) {
      return res.status(400).json({ message: 'priority of the task must be highest, high, medium, low or lowest' });
    }

    task.priority = priority;

    if (type === 'assignment' || type === 'issue') {
      task.type = type;
    }

    if (description) {
      task.description = description;
    }

    if (assignee) {
      const validUser = await Users.findById(assignee);
      // console.log(project.members);
      const isMember = project.members.some((member) => member.data.equals(new ObjectId(assignee)));
      if (validUser && isMember) {
        task.assignee = validUser._id;
      } else {
        return res.status(400).json({ message: 'Invalid assignee id or assignee is not a member of this project' });
      }
    }

    task.createdBy = userId;

    await task.save();

    stage.tasks.push(task._id);

    await stage.save();

    const newTask = await Tasks.findById(task._id)
      .populate({
        path: 'createdBy',
        select: '_id fullName email avatar username'
      })
      .populate({
        path: 'assignee',
        select: '_id fullName email avatar username'
      });

    newTask.projectId = project._id;
    newTask.projectCode = project.code;
    newTask.stageId = stage._id;
    newTask.comments = undefined;

    return res.status(201).json({
      message: 'Created new task successfully',
      task: newTask
    })

  } catch (err) {
    console.log(err);
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
}

const updateTask = async (req, res) => {
  const { id } = req.params;
  const {
    stageId,
    title,
    type,
    priority,
    startDate,
    endDate,
    deadline,
    description,
    status,
    assignee
  } = req.body;
  try {
    const userId = new ObjectId(req?.user?.id);

    const task = await Tasks.findById(id);
    if (!task) {
      return res.status(400).json({ message: 'Task not found' });
    }

    const stage = await Stages.findOne({
      _id: new ObjectId(stageId),
      'tasks': { '$in': [id] }
    });
    if (!stage) {
      return res.status(400).json({ message: 'stageId incorrect or stage not found' });
    }

    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [new ObjectId(stageId)] }
    });

    if (!project) {
      return res.status(400).json({ message: 'Project of the stage not found or user not authorized' });
    }

    let isManager = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'manager'
    ));
    let isLeader = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'leader'
    ));
    let isCreator = task.createdBy.equals(userId);

    if ((!isManager && !isLeader) || !isCreator) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (title) {
      task.title = title;
    }

    if (priority) {
      if (validPriors.includes(priority)) {
        task.priority = priority;
      }
    }

    if (type === 'assignment' || type === 'issue') {
      task.type = type;
    }

    if (status) {
      switch (status) {
        case 'open':
          break;
        case 'inprogress':
          if (task.status === 'open' || task.status === 'reopen') {
            task.status = status;
          }
          break;
        case 'review':
          if (task.status === 'inprogress') {
            task.status = status;
          }
          break;
        case 'reopen':
        case 'done':
          if (task.status === 'review') {
            task.status = status;
          }
          break;
        case 'cancel':
          const validStatuses = ['open', 'inprogress', 'review', 'reopen'];
          if (validStatuses.includes(status)) {
            task.status = status;
          }
          break;
        default:
          break;
      }
    }

    const newStartDate = startDate ? new Date(startDate) : task.startDate;
    const newDeadline = deadline ? new Date(deadline) : task.endDate;
    const newEndDate = endDate ? new Date(endDate) : task.endDate;
    if (newEndDate > newStartDate && newDeadline > newStartDate) {
      task.endDate = newEndDate;
      task.deadline = newDeadline;
      task.startDate = newStartDate;
    }

    if (description) {
      task.description = description;
    }

    if (assignee) {
      const validUser = await Users.findById(assignee);
      if (validUser) {
        task.assignee = validUser._id;
      }
    }

    await task.save();

    const newTask = await Tasks.findById(id)
      .populate({
        path: 'createdBy',
        select: '_id fullName email avatar username'
      })
      .populate({
        path: 'assignee',
        select: '_id fullName email avatar username'
      });

    newTask.projectId = project._id;
    newTask.projectCode = project.code;
    newTask.stageId = stage._id;
    newTask.comments = undefined;

    return res.status(201).json({
      message: 'Updated task successfully',
      task: newTask
    });

  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};

const getTaskDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const userId = new ObjectId(req?.user?.id);
    const taskId = new ObjectId(id);

    const stage = await Stages.findOne({
      'tasks': { '$in': [taskId] }
    });

    if (!stage) {
      return res.status(400).json({ message: 'Task not found in any stage' });
    }

    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [stage._id] }
    });

    if (!project) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await Tasks.findById(id)
      .populate({
        path: 'createdBy',
        select: '_id fullName email avatar username'
      })
      .populate({
        path: 'assignee',
        select: '_id fullName email avatar username'
      });

    task.projectId = project._id;
    task.projectCode = project.code;
    task.stageId = stage._id;
    task.comments = undefined;

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json({ task });

  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};

module.exports = {
  addNewTask,
  updateTask,
  getTaskDetails
}