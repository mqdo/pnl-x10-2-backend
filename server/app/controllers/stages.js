const XLSX = require('xlsx');
const ObjectId = require('mongoose').Types.ObjectId;
const fs = require('fs');

const Projects = require('../models/Projects');
const Stages = require('../models/Stages');
const Tasks = require('../models/Tasks');
const Activities = require('../models/Activities');
const isDate = require('../../config/isDate');
const xlsxDateToJsDate = require('../../config/xlsxDateToJsDate');

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
  let { name = '', page, limit } = req.query;

  if (page && !isNaN(Number(page))) {
    page = Number(page) > 1 ? Number(page) : 1;
  } else {
    page = 1;
  }

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
  let { page, limit } = req.query;

  if (page && !isNaN(Number(page))) {
    page = Number(page) > 1 ? Number(page) : 1;
  } else {
    page = 1;
  }

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
      const lastStage = await Stages.findById(project.stages[0]._id)
        .populate({
          path: 'tasks',
          options: { allowEmptyArray: true }
        });
      if (lastStage.tasks?.length > 0) {
        stage.tasks = lastStage.tasks.filter((task, index) => {
          if (task.status !== 'done' && task.status !== 'cancel') {
            lastStage.tasks.splice(index, 1);
            return true;
          }
          return false;
        });
      }
      await lastStage.save();
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
  let { page, limit } = req.query;

  if (page && !isNaN(Number(page))) {
    page = Number(page) > 1 ? Number(page) : 1;
  } else {
    page = 1;
  }
  limit = limit && Number(limit) > 0 ? Number(limit) : 10;
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

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = stage.reviews.length;
    const reviews = stage.reviews.slice(startIndex, endIndex);

    return res.status(200).json({
      review: reviews,
      total: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
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

    let isManager = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'manager'
    ));
    let isLeader = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'leader'
    ));
    let isSupervisor = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'supervisor'
    ));

    if (!isManager && !isSupervisor && !isLeader) {
      return res.status(401).json({ message: 'User not authorized' });
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

    let isManager = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'manager'
    ));
    let isLeader = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'leader'
    ));
    let isSupervisor = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'supervisor'
    ));

    if (!isManager && !isSupervisor && !isLeader) {
      return res.status(401).json({ message: 'User not authorized' });
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

    let isManager = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'manager'
    ));
    let isLeader = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'leader'
    ));
    let isSupervisor = project?.members.some((member) => (
      member?.data?._id.equals(userId) &&
      member?.role === 'supervisor'
    ));

    if (!isManager && !isSupervisor && !isLeader) {
      return res.status(401).json({ message: 'User not authorized' });
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

exports.getTasksList = async (req, res) => {
  const { id } = req.params;
  let {
    assignee,
    type,
    priority,
    sort
  } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Stage Id is required' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const stageId = new ObjectId(id);
    const stage = await Stages.findById(stageId)
      .populate({
        path: 'tasks',
        populate: [
          {
            path: 'assignee',
            select: '_id avatar fullName username email'
          },
          {
            path: 'createdBy',
            select: '_id avatar fullName username email'
          }
        ],
        select: '-members -activities',
        options: { allowEmptyArray: true }
      });
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [stageId] }
    })
    let isMember = project?.members.some((member) => member?.data.equals(userId));
    if (!isMember) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const filteredTasks = stage.tasks.filter((task) => {
      let assigneeFilter = assignee
        ? task.assignee.equals(new ObjectId(assignee))
        : true;
      let typeFilter = type ? task.type === type : true;
      let priorityFilter = priority
        ? task.priority === priority
        : true;
      return assigneeFilter && typeFilter && priorityFilter;
    });

    const sortedTasks = filteredTasks.sort((a, b) => {
      const priorities = ['open', 'inprogress', 'review', 'reopen', 'done', 'cancel'];
      switch (sort) {
        case 'priority-asc':
          return priorities.indexOf(a.priority) - priorities.indexOf(b.priority);
        case 'priority-desc':
          return priorities.indexOf(b.priority) - priorities.indexOf(a.priority);
        case 'created-asc':
          return a.createdAt - b.createdAt;
        case 'created-desc':
          return b.createdAt - a.createdAt;
        case 'end-asc':
          return a.endDate - b.endDate;
        case 'end-desc':
          return b.endDate - a.endDate;
        default:
          break;
      }
    });

    res.status(200).json({
      tasks: sortedTasks
    });

  } catch (err) {
    console.log(err);
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};

exports.downloadTasksList = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'Stage Id is required' });
  }
  try {
    const userId = new ObjectId(req?.user?.id);
    const stageId = new ObjectId(id);
    const stage = await Stages.findById(stageId)
      .populate({
        path: 'tasks',
        populate: [
          {
            path: 'assignee',
            select: '_id avatar fullName username email'
          },
          {
            path: 'createdBy',
            select: '_id avatar fullName username email'
          }
        ],
        select: '-members -activities',
        options: { allowEmptyArray: true }
      });
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [stageId] }
    })
    let isMember = project?.members.some((member) => member?.data.equals(userId));
    if (!isMember) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let rows = [];
    rows.push([
      'STT',
      'Mã công việc',
      'Tên công việc',
      'Link',
      'Người thực hiện',
      'Người tạo',
      'Ngày tạo',
      'Ngày bắt đầu',
      'Ngày kết thúc dự kiến',
      'Ngày kết thúc thực tế',
      'Trạng thái'
    ])

    stage.tasks.forEach((task, index) => {
      rows.push([
        index + 1,
        task.code,
        task.title,
        '',
        task.assignee.username,
        task.createdBy.username,
        task.createdDate,
        task.startDate,
        task.deadline,
        task.endDate || '',
        task.status
      ])
    });

    // create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // write the workbook to a buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // set the response headers to indicate that the response is an XLSX file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=tasks.xlsx');

    // send the XLSX file as the response
    res.end(buffer);

  } catch (err) {
    console.log(err);
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};

exports.uploadTasksList = async (req, res) => {
  const { id } = req.params;
  const url = req?.file?.path;

  if (!id) {
    return res.status(400).json({ message: 'Stage Id is required' });
  }

  try {
    const userId = new ObjectId(req?.user?.id);
    const stageId = new ObjectId(id);
    const stage = await Stages.findById(stageId);
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const project = await Projects.findOne({
      'members.data': userId,
      'stages': { '$in': [stageId] }
    })
    let isMember = project?.members.some((member) => member?.data.equals(userId));
    if (!isMember) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Load the XLSX file
    const workbook = XLSX.readFile(url);

    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert the worksheet to an array of objects
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const rows = data.slice(1);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validStatuses = ['open', 'inprogress', 'review', 'reopen', 'done', 'cancel'];

      const title = row[0];
      const assignee = project?.members.find((member) => member?.data.equals(row[1])) ? new ObjectId(row[1]) : undefined;
      const startDate = isDate(xlsxDateToJsDate(row[2])) ? xlsxDateToJsDate(row[2]) : undefined;
      const deadline = isDate(xlsxDateToJsDate(row[3])) ? new Date(xlsxDateToJsDate(row[3])) : undefined;
      const endDate = isDate(xlsxDateToJsDate(row[4])) ? xlsxDateToJsDate(row[4]) : undefined;
      const status = row[5] ? validStatuses.find((el) => el === row[5].replace(/\s+/g, '').toLowerCase()) : 'open';

      const validDates = startDate && deadline && deadline > startDate && (endDate ? endDate > startDate : true);

      if (title && assignee && validDates) {
        const task = new Tasks({
          title,
          type: 'assignment',
          priority: 'medium',
          startDate,
          deadline,
          description: '',
          status,
          createdBy: userId,
          assignee
        });
        if (isDate(endDate)) {
          task.endDate = new Date(endDate);
        }
        const activity = new Activities({
          userId,
          action: {
            actionType: 'create',
            from: {},
            to: {
              task: task
            }
          }
        })

        activity.markModified('from');
        activity.markModified('to');
        await activity.save();

        task.activities.push(activity._id);

        await task.save();

        stage.tasks.push(task._id);

        await stage.save();
      }
    }

    fs.unlinkSync(url);

    const newStage = await Stages.findById(stageId)
      .populate({
        path: 'tasks',
        populate: [
          {
            path: 'assignee',
            select: '_id avatar fullName username email'
          },
          {
            path: 'createdBy',
            select: '_id avatar fullName username email'
          }
        ],
        select: '-members -activities',
        options: { allowEmptyArray: true }
      });

    return res.status(200).json({
      message: 'Import tasks list successfully',
      tasks: newStage.tasks
    });

  } catch (err) {
    console.log(err);
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
};