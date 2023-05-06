const ObjectId = require('mongoose').Types.ObjectId;

const Users = require('../models/Users.js');
const Projects = require('../models/Projects.js');
const Stages = require('../models/Stages.js');
const Tasks = require('../models/Tasks.js');

const validPriors = ['highest', 'high', 'medium', 'low', 'lowest'];

const addNewTask = async (req, res) => {
  console.log('huh');
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
    return res.status(400).json({ message: 'stageId, title, priority, startDate and deadline are required' });
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

    if (newDeadline <= newStartDate) {
      return res.status(400).json({ message: 'deadline of the task must be after startDate' });
    }

    const task = new Tasks({
      title,
      startDate: newStartDate,
      deadline: newDeadline
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
      const isMember = project.members.data.includes(assignee._id);
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

    return res.status(201).json({ message: 'Created new task successfully', task })

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

    if (startDate || deadline || endDate) {
      const newStartDate = new Date(startDate) || task.startDate;
      const newDeadline = new Date(endDate) || task.endDate;
      const newEndDate = new Date(endDate) || undefined;
      if (newEndDate && newEndDate > newStartDate) {
        task.endDate = newEndDate;
        task.startDate = newStartDate;
      }
      if (newDeadline && newDeadline > newStartDate) {
        task.deadline = newDeadline;
      }
      if (newStartDate && newStartDate < newDeadline) {
        task.startDate = newStartDate;
      }
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

    return res.status(201).json({ message: 'Updated task successfully', task })

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

    const task = await Tasks.findById(id);

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