const ObjectId = require('mongoose').Types.ObjectId;

const Users = require('../models/Users.js');
const Projects = require('../models/Projects.js');
const Stages = require('../models/Stages.js');
const Tasks = require('../models/Tasks.js');
const Activities = require('../models/Activities.js');
const pipelines = require('../utils/pipelines.js');

const validPriors = ['highest', 'high', 'medium', 'low', 'lowest'];

const getAllTasks = async (req, res) => {
  try {
    const userId = req?.user?.id;
    const {
      matchUserId,
      populateStages,
      sortProjects,
      unwindStages,
      populateTasks,
      unwindTasks,
      lookupTask,
      addTaskFields,
      removeTaskFields,
      groupTasks,
      taskResults
    } = pipelines(userId);

    const tasks = await Projects.aggregate([
      // populate project.stages and sort projects
      ...matchUserId,
      ...populateStages,
      ...sortProjects,
      // create separate documents for each stage and populate stage.tasks
      ...unwindStages,
      ...populateTasks,
      // create separate documents for each task and add/remove its fields
      ...unwindTasks,
      ...lookupTask,
      ...addTaskFields,
      ...removeTaskFields,
      // group them together and return final results
      ...groupTasks,
      ...taskResults
    ]);

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'No tasks were found' });
    }

    const results = tasks[0];

    return res.status(200).json({ ...results });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
}

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
      // console.log(project.members);
      const isMember = project.members.some((member) => member.data.equals(new ObjectId(assignee)));
      if (validUser && isMember) {
        task.assignee = validUser._id;
      } else {
        return res.status(400).json({ message: 'Invalid assignee id or assignee is not a member of this project' });
      }
    }

    task.createdBy = userId;

    const activity = new Activities({
      userId,
      action: {
        actionType: 'create',
        from: {},
        to: {
          task: task
        }
      }
    });

    activity.markModified('action');
    await activity.save();

    task.activities.push(activity._id);

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

    newTask.comments = undefined;
    newTask.activities = undefined;

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
    let actionType = 'update';
    let from = {};
    let to = {};

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

    if ((!isManager && !isLeader) && !isCreator) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (
      (isManager || isLeader) &&
      title &&
      title !== task.title
    ) {
      from.title = task.title;
      to.title = title;
      task.title = title;
    }

    if (
      (isManager || isLeader) &&
      priority &&
      priority !== task.priority
    ) {
      if (validPriors.includes(priority)) {
        from.priority = task.priority;
        to.priority = priority;
        task.priority = priority;
      }
    }

    if (
      (isManager || isLeader) &&
      type !== task.type &&
      (type === 'assignment' || type === 'issue')
    ) {
      from.type = task.type;
      to.type = type;
      task.type = type;
    }

    if (
      (isManager || isLeader) &&
      deadline
    ) {
      const newDeadline = new Date(deadline);
      const newStartDate = startDate ? new Date(startDate) : task.startDate;
      if (
        newDeadline > newStartDate &&
        newDeadline.getTime() != task.deadline.getTime()
      ) {
        from.deadline = task.deadline.toISOString();
        to.deadline = newDeadline.toISOString();
        task.deadline = newDeadline;
      }
    }

    if (
      (isManager || isLeader) &&
      startDate
    ) {
      const newStartDate = new Date(startDate);
      if (
        newStartDate < task.deadline &&
        newStartDate.getTime() !== task.startDate.getTime()
      ) {
        from.startDate = task.startDate.toISOString();
        to.startDate = newStartDate.toISOString();
        task.startDate = newStartDate;
      }
    }

    if (
      (isManager || isLeader) &&
      endDate
    ) {
      const newEndDate = new Date(endDate);
      if (
        newEndDate > task.startDate &&
        newEndDate.getTime() !== task?.endDate?.getTime()
      ) {
        from.endDate = task?.endDate?.toISOString() || '';
        to.endDate = newEndDate.toISOString();
        task.endDate = newEndDate;
      }
    }

    if (
      (isManager || isLeader) &&
      description &&
      description !== task.description
    ) {
      from.description = task.description;
      to.description = description;
      task.description = description;
    }

    if (
      (isManager || isLeader) &&
      assignee &&
      assignee !== task.assignee
    ) {
      const current = await Users.findById(task.assignee);
      const validUser = await Users.findById(assignee);
      if (validUser) {
        from.assignee = current.username;
        to.assignee = validUser.username;
        task.assignee = validUser._id;
      }
    }

    if (status && status !== task.status) {
      switch (status) {
        case 'open':
          if (isManager || isLeader) {
            from.status = task.status;
            to.status = status;
            task.status = status;
          }
          break;
        case 'inprogress':
          if (
            isManager ||
            isLeader ||
            task.status === 'open' ||
            task.status === 'reopen'
          ) {
            from.status = task.status;
            to.status = status;
            task.status = status;
          }
          break;
        case 'review':
          if (
            isManager ||
            isLeader ||
            task.status === 'inprogress'
          ) {
            from.status = task.status;
            to.status = status;
            task.status = status;
          }
          break;
        case 'reopen':
          if (
            isManager ||
            isLeader ||
            task.status === 'review'
          ) {
            task.status = status;
          }
          break;
        case 'done':
          if (
            isManager ||
            isLeader ||
            task.status === 'review'
          ) {
            from = { status: task.status };
            to = { status: status };
            actionType = 'complete';
            task.status = status;
          }
          break;
        case 'cancel':
          const validStatuses = ['open', 'inprogress', 'review', 'reopen'];
          if (
            isManager ||
            isLeader ||
            validStatuses.includes(task.status)
          ) {
            from = { status: task.status };
            to = { status: status };
            actionType = 'cancel';
            task.status = status;
          }
          break;
        default:
          break;
      }
    }

    const activity = new Activities({
      userId,
      action: {
        actionType,
        from,
        to
      }
    })

    activity.markModified('action');
    await activity.save();

    if (task.activities?.length > 0) {
      task.activities.unshift(activity);
    } else {
      task.activities.push(activity);
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

    newTask.comments = undefined;
    newTask.activities = undefined;

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

    task.comments = undefined;
    task.activities = undefined;

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json({ task });

  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const getTaskActivities = async (req, res) => {
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
        path: 'activities',
        options: { allowEmptyArray: true },
        populate: {
          path: 'userId',
          select: '_id fullName email avatar username'
        }
      });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json({
      taskId: task._id,
      activities: task.activities
    });

  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const swapTaskActivities = async (req, res) => {
  const { id } = req.params;
  const { firstActivity, secondActivity } = req.body;
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
        path: 'activities',
        options: { allowEmptyArray: true },
        populate: {
          path: 'userId',
          select: '_id fullName email avatar username'
        }
      });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const firstIndex = task.activities.findIndex((activity) => activity.id.equals(new ObjectId(firstActivity)));
    const secondIndex = task.activities.findIndex((activity) => activity.id.equals(new ObjectId(secondActivity)));

    [task.activities[firstIndex], task.activities[secondIndex]] = [task.activities[secondIndex], task.activities[firstIndex]];

    await task.save();

    return res.status(200).json({
      message: 'Task activities swap successfully',
      activities: task.activities
    });

  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};
const deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    const userId = new ObjectId(req?.user?.id);
    const task = await Tasks.findById(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const stage = await Stages.findOne({
      'tasks': { '$in': [task._id] }
    });

    if (!stage) {
      return res.status(400).json({ message: 'Task not found in any stage' });
    }

    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [stage._id] }
    });

    if (!project) {
      return res.status(400).json({ message: 'Project of the stage not found or user not authorized' });
    }

    for (const activity of task.activities) {
      await Activities.findByIdAndDelete(activity);
    }

    const taskIndex = stage.tasks.indexOf(task._id);
    if (taskIndex !== -1) {
      stage.tasks.splice(taskIndex, 1);
      await stage.save();
    }

    const deleted = await Tasks.findByIdAndDelete(id);

    return res.status(200).json({
      message: 'Task removed successfully'
    })

  } catch (err) {
    console.log(err);
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};

module.exports = {
  getAllTasks,
  addNewTask,
  updateTask,
  getTaskDetails,
  getTaskActivities,
  swapTaskActivities,
  deleteTask
}