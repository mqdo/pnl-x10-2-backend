const ObjectId = require('mongoose').Types.ObjectId;

const Projects = require('../models/Projects');
const Stages = require('../models/Stages');

const pipelines = (userId = '', page = 1, limit = 10, name = '') => {
  const matchUserId = [
    {
      '$match': { 'members.data': userId }
    }
  ];
  const populateStages = [
    {
      '$lookup': {
        from: 'stages',
        localField: 'stages',
        foreignField: '_id',
        as: 'stages'
      }
    }
  ];
  const sortProjects = [
    {
      '$sort': {
        'createdDate': -1
      }
    }
  ];
  const unwindStages = [
    {
      '$unwind': '$stages'
    }
  ];
  const selectFields = [
    {
      '$project': {
        'stages.tasks': 0
      }
    }
  ];
  const groupAndCount = [
    {
      '$group': {
        '_id': null,
        count: {
          '$sum': 1
        },
        stages: {
          '$push': '$stages'
        }
      }
    }
  ];
  const filterByName = [
    {
      '$match': {
        'stages.name': {
          '$regex': name,
          '$options': 'i'
        }
      }
    }
  ];
  const paginate = [
    {
      '$skip': limit * (page - 1)
    },
    {
      '$limit': limit
    }
  ];
  const sortStages = [
    {
      '$sort': {
        'stages.endDateActual': -1
      }
    }
  ]
  const groupWithPagination = [
    {
      '$group': {
        '_id': null,
        'stages': {
          '$addToSet': '$stages'
        },
        'currentPage': {
          '$first': page
        },
        'total': {
          '$first': '$count'
        }
      }
    }
  ];
  const resultWithTotalPages = [
    {
      '$project': {
        '_id': 0,
        stages: 1,
        currentPage: 1,
        total: 1,
        totalPages: {
          '$ceil': {
            '$divide': ['$total', limit]
          }
        }
      }
    }
  ]
  return {
    matchUserId,
    populateStages,
    sortProjects,
    unwindStages,
    selectFields,
    filterByName,
    groupAndCount,
    paginate,
    sortStages,
    groupWithPagination,
    resultWithTotalPages
  }
};

exports.searchStages = async (req, res) => {
  const name = req?.query?.name || '';
  const page = parseInt(req?.query?.page) || 1;
  const limit = parseInt(req?.query?.limit) || 10;

  try {
    const userId = new ObjectId(req?.user?.id);
    const {
      matchUserId,
      populateStages,
      sortProjects,
      unwindStages,
      selectFields,
      filterByName,
      groupAndCount,
      paginate,
      sortStages,
      groupWithPagination,
      resultWithTotalPages
    } = pipelines(userId, page, limit, name);

    const stages = await Projects.aggregate([
      // get all projects user joined and populate stages
      ...matchUserId,
      ...populateStages,
      ...sortProjects,
      // create documents from stages and filter them by 'name' (regex)
      ...unwindStages,
      ...selectFields,
      ...filterByName,
      // group them into one document and count total documents
      ...groupAndCount,
      // separate into documents again and paginate
      ...unwindStages,
      ...paginate,
      ...sortStages,
      // combine all documents after pagination and get the final results
      ...groupWithPagination,
      ...resultWithTotalPages
    ]);

    if (stages.length === 0) {
      return res.status(404).json({ message: 'No stages found' });
    }

    const results = stages[0];

    return res.status(200).json({ ...results });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};

exports.getAllStages = async (req, res) => {
  const page = parseInt(req?.query?.page) || 1;
  const limit = parseInt(req?.query?.limit) || 10;
  try {
    const userId = new ObjectId(req?.user?.id);
    const {
      matchUserId,
      populateStages,
      sortProjects,
      unwindStages,
      selectFields,
      groupAndCount,
      paginate,
      groupWithPagination,
      resultWithTotalPages
    } = pipelines(userId, page, limit);

    const stages = await Projects.aggregate([
      // get all projects user joined and populate stages
      ...matchUserId,
      ...populateStages,
      ...sortProjects,
      // create documents from stages
      ...unwindStages,
      ...selectFields,
      // group them into one document and count total documents
      ...groupAndCount,
      // separate into documents again and paginate
      ...unwindStages,
      ...paginate,
      // combine all documents after pagination and get the final results
      ...groupWithPagination,
      ...resultWithTotalPages
    ]);

    if (stages.length === 0) {
      return res.status(404).json({ message: 'No stages found' });
    }

    const results = stages[0];

    return res.status(200).json({ ...results });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};


exports.addStage = async (req, res) => {
  const { projectId, name, startDate, endDateExpected } = req.body;
  if (
    !projectId ||
    !name ||
    !startDate ||
    !endDateExpected
  ) {
    return res.status(400).json({ message: 'All fields are required!' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const project = await Projects.findById(projectId)
      .populate({
        path: 'stages',
        options: { allowEmptyArray: true }
      });
    if (!project) {
      return res.status(400).json({ message: 'ProjectId incorrect or project not found' })
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
    const newStartDate = new Date(startDate);
    const newEndDateExpected = new Date(endDateExpected);
    const lastEndDate = project.stages.length > 0 ? project.stages[0]?.endDateActual || project.stages[0]?.endDateExpected : 0;
    const validDates = (newStartDate - lastEndDate) > 0 && (newEndDateExpected - newStartDate) > 0;
    if (!validDates) {
      return res.status(400).json({ message: 'New start date must be after last end date and before new expected end date', lastEndDate })
    }
    const stage = new Stages({
      name: name,
      startDate: newStartDate,
      endDateExpected: newEndDateExpected
    });
    const newProject = await Projects.findById(project._id);
    if (project.stages?.length > 0) {
      const lastStage = await Projects.findById(project.stages[0]._id)
        .populate({
          path: 'tasks',
          options: { allowEmptyArray: true }
        });
      if (lastStage.tasks?.length > 0) {
        stage.tasks = lastStage.tasks.filter(task => {
          if (task.status !== 'done' && task.status !== 'cancel') {
            lastStage.tasks.pull({ _id: task._id });
            return true;
          }
          return false;
        });
      }
      newProject.stages.unshift(stage._id);
    } else {
      newProject.stages.push(stage._id);
    }
    await stage.save();
    await newProject.save();
    stage.tasks = undefined;
    return res.status(201).json({
      message: 'Stage created successfully',
      projectId: newProject._id,
      stage
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Bad request' });
  }
};

exports.updateStage = async (req, res) => {
  const { id } = req.params;
  const { name, startDate, endDateExpected, endDateActual } = req.body;
  if (!id) {
    return res.status(400).json({ message: 'Stage Id is required' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const stageId = new ObjectId(id);
    const stage = await Stages.findById(id);
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [stageId] }
    })
      .populate({
        path: 'stages',
        options: { allowEmptyArray: true }
      });

    if (!project) {
      return res.status(400).json({ message: 'Project of the stage not found or user not authorized' });
    }

    if (name) {
      stage.name = name;
    }

    for (const index in project.stages) {
      if (project.stages[index].equals(stage._id)) {
        const nextIndex = parseInt(index) + 1;
        const prevIndex = parseInt(index) - 1;
        if (startDate) {
          const newStartDate = new Date(startDate);
          const lastEndDate = project.stages[nextIndex]?.endDateActual || project.stages[nextIndex]?.endDateExpected || 0;
          const validDate = (newStartDate - lastEndDate) > 0;
          if (!validDate) {
            return res.status(400).json({ message: 'New start date must be after last end date', lastEndDate })
          }
          stage.startDate = newStartDate;
        }
        if (endDateExpected) {
          const newEndDateExpected = new Date(endDateExpected);
          const nextStartDate = project.stages[prevIndex]?.startDate;
          const validDate = (nextStartDate ? (nextStartDate - newEndDateExpected) > 0 : true) && (newEndDateExpected - stage.startDate) > 0;
          if (!validDate) {
            return res.status(400).json({
              message: 'New expected end date must be before next start date and after current start date',
              startDate: nextStartDate || stage.startDate
            })
          }
          stage.endDateExpected = newEndDateExpected;
        }
        if (endDateActual) {
          const newEndDateActual = new Date(endDateActual);
          const nextStartDate = project.stages[prevIndex]?.startDate;
          const validDate = (nextStartDate ? (nextStartDate - newEndDateActual) > 0 : true) && (newEndDateActual - stage.startDate) > 0;
          if (!validDate) {
            return res.status(400).json({
              message: 'New actual end date must be before (next) start date and after current start date',
              startDate: nextStartDate || stage.startDate
            })
          }
          stage.endDateActual = newEndDateActual;
        }
      }
    }
    await stage.save();
    stage.tasks = undefined;
    return res.status(201).json({
      message: 'Stage updated successfully',
      stage
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Bad request' });
  }
};

exports.removeStage = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'Stage Id is required' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const stageId = new ObjectId(id);
    const stage = await Stages.findById(id);
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [stageId] }
    })
      .populate({
        path: 'stages',
        options: { allowEmptyArray: true }
      });

    if (!project) {
      return res.status(400).json({ message: 'Project of the stage not found or user not authorized' });
    }

    await Stages.findByIdAndDelete(id);
    await Projects.updateOne({ _id: project._id },
      {
        $pull: {
          stages: { $in: [stageId] }
        }
      }
    );

    return res.status(200).json({
      message: 'Stage removed successfully'
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Bad request' });
  }
};

exports.getStageDetails = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'Stage Id is required' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const stageId = new ObjectId(id);
    const stage = await Stages.findById(id)
      .populate({
        path: 'reviews.reviewer',
        options: { allowEmptyArray: true },
        select: '_id fullName email avatar username'
      });
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [stageId] }
    })
      .populate({
        path: 'stages',
        options: { allowEmptyArray: true }
      });

    if (!project) {
      return res.status(400).json({ message: 'Project of the stage not found or user not authorized' });
    }
    stage.tasks = undefined;

    return res.status(200).json({
      projectId: project._id,
      stage
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Bad request' });
  }
};

exports.getReviewsList = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'StageId are required' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const stageId = new ObjectId(id);
    const stage = await Stages.findById(id)
      .populate({
        path: 'reviews.reviewer',
        select: '_id avatar fullName username email',
        options: { allowEmptyArray: true }
      });
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [stageId] }
    })
      .populate({
        path: 'stages',
        options: { allowEmptyArray: true }
      });

    if (!project) {
      return res.status(400).json({ message: 'Project not found or user not authorized' });
    }

    stage.tasks = undefined;
    return res.status(200).json({
      review: stage.reviews
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Bad request' });
  }
};
exports.addReview = async (req, res) => {
  const { id } = req.params;
  const { review } = req.body;
  if (!id) {
    return res.status(400).json({ message: 'StageId are required' });
  }
  if (!review) {
    return res.status(400).json({ message: 'Review content must not be empty' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const stageId = new ObjectId(id);
    const stage = await Stages.findById(id);
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [stageId] }
    })
      .populate({
        path: 'stages',
        options: { allowEmptyArray: true }
      });

    if (!project) {
      return res.status(400).json({ message: 'Project not found or user not authorized' });
    }

    stage.reviews.push({
      content: review,
      reviewer: userId
    })

    await stage.save();

    const newStage = await Stages.findById(id)
      .populate({
        path: 'reviews.reviewer',
        select: '_id avatar fullName username email',
        options: { allowEmptyArray: true }
      });

    newStage.tasks = undefined;
    return res.status(201).json({
      message: 'Review added successfully',
      review: newStage.reviews
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Bad request' });
  }
};

exports.updateReview = async (req, res) => {
  const { id } = req.params;
  const { review, id: reviewId } = req.body;
  if (!id) {
    return res.status(400).json({ message: 'StageId are required' });
  }
  if (!review || !reviewId) {
    return res.status(400).json({ message: 'Review content or id must not be empty' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const stageId = new ObjectId(id);
    const stage = await Stages.findById(id);
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [stageId] }
    })
      .populate({
        path: 'stages',
        options: { allowEmptyArray: true }
      });

    if (!project) {
      return res.status(400).json({ message: 'Project not found or user not authorized' });
    }

    for (const rv of stage.reviews) {
      if (rv.reviewer.equals(userId) && rv._id.equals(reviewId)) {
        rv.content = review;
        rv.updatedAt = Date.now();
      }
    }

    await stage.save();

    const newStage = await Stages.findById(id)
      .populate({
        path: 'reviews.reviewer',
        select: '_id avatar fullName username email',
        options: { allowEmptyArray: true }
      });

    newStage.tasks = undefined;

    return res.status(200).json({
      message: 'Review updated successfully',
      review: newStage.reviews
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Bad request' });
  }
};

exports.deleteReview = async (req, res) => {
  const { id } = req.params;
  const { id: reviewId } = req.body;
  if (!id) {
    return res.status(400).json({ message: 'StageId are required' });
  }
  if (!reviewId) {
    return res.status(400).json({ message: 'Review id must not be empty' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const stageId = new ObjectId(id);
    const stage = await Stages.findById(id);
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [stageId] }
    })
      .populate({
        path: 'stages',
        options: { allowEmptyArray: true }
      });

    if (!project) {
      return res.status(400).json({ message: 'Project not found or user not authorized' });
    }

    await stage.reviews.pull({ _id: reviewId });

    await stage.save();

    const newStage = await Stages.findById(id)
      .populate({
        path: 'reviews.reviewer',
        select: '_id avatar fullName username email',
        options: { allowEmptyArray: true }
      });

    newStage.tasks = undefined;

    return res.status(200).json({
      message: 'Review deleted successfully',
      review: newStage.reviews
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Bad request' });
  }
};
