const ObjectId = require('mongoose').Types.ObjectId;

const Activities = require('../models/Activities.js');
const Projects = require('../models/Projects.js');
const Stages = require('../models/Stages.js');
const Tasks = require('../models/Tasks.js');

const updateActivityDetails = async (req, res) => {
  const { id } = req.params;
  const {
    userId: taskUserId,
    action
  } = req.body;
  if (!id) {
    return res.status(400).json({ message: 'Activity Id is required' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const activityId = new ObjectId(id);

    const task = await Tasks.findOne({
      'activities': { '$in': [activityId] }
    }).populate({
      path: 'activities',
      options: { allowEmptyArray: true }
    });

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
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const activity = await Activities.findById(activityId)
      .populate({
        path: 'userId',
        select: '_id fullName email avatar username'
      });

    if (taskUserId) {
      const id = new ObjectId(taskUserId);
      const isMember = project.members.find((member) => member.data.equals(id));
      if (isMember) {
        activity.userId = taskUserId;
      }
    }

    if (action) {
      activity.action = action;
    }

    activity.markModified('from');
    activity.markModified('to');
    await activity.save();

    return res.status(200).json({
      message: 'Activity updated successfully',
      activity
    });

  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};

const deleteActivity = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'Activity Id is required' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const activityId = new ObjectId(id);

    const task = await Tasks.findOne({
      'activities': { '$in': [activityId] }
    }).populate({
      path: 'activities',
      options: { allowEmptyArray: true }
    });

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
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await task.activities.pull({ _id: activityId });

    await Activities.findByIdAndDelete(activityId);

    return res.status(200).json({
      message: 'Removed task activity successfully'
    });

  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};

module.exports = {
  updateActivityDetails,
  deleteActivity
};