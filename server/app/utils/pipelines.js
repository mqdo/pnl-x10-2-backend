const pipelines = (
  userId = '',
  page = 1,
  limit = 10,
  name = '.*',
  title = '.*',
  status = '.*',
  assignee = '',
  sort = ''
) => {
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
  ];
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
  ];
  // tasks pipelines
  const populateTasks = [
    {
      '$lookup': {
        from: 'tasks',
        localField: 'stages.tasks',
        foreignField: '_id',
        as: 'stages.tasks'
      }
    }
  ];
  const unwindTasks = [
    {
      '$unwind': '$stages.tasks'
    }
  ];
  const unwindTasksAgain = [
    {
      '$unwind': '$tasks'
    }
  ]
  const filterTasks = [
    {
      '$match': {
        '$and': [
          {
            'stages.tasks.title': {
              '$regex': title,
              '$options': 'i'
            }
          },
          {
            'stages.tasks.status': {
              '$regex': status,
              '$options': 'i'
            }
          },
          assignee ? {
            '$or': [
              {
                'stages.tasks.assignee.username': { $regex: assignee, $options: 'i' }
              },
              {
                'stages.tasks.assignee.fullName': { $regex: assignee, $options: 'i' }
              }
            ]
          } : {}
        ]
      }
    }
  ];
  // prioAsc prioDesc deadlineAsc deadlineDesc
  const addSortField = [
    {
      '$addFields': {
        'stages.tasks.sortId': {
          $switch: {
            branches: [
              { case: { $eq: ['$stages.tasks.priority', 'highest'] }, then: 0 },
              { case: { $eq: ['$stages.tasks.priority', 'high'] }, then: 1 },
              { case: { $eq: ['$stages.tasks.priority', 'medium'] }, then: 2 },
              { case: { $eq: ['$stages.tasks.priority', 'low'] }, then: 3 },
              { case: { $eq: ['$stages.tasks.priority', 'lowest'] }, then: 4 },
            ],
            default: 0,
          }
        }
      }
    }
  ];
  const sortTasks = () => {
    switch (sort) {
      case 'prioAsc':
        return [
          ...addSortField,
          {
            '$sort': {
              'stages.tasks.sortId': -1
            }
          }
        ];
      case 'prioDesc':
        return [
          ...addSortField,
          {
            '$sort': {
              'stages.tasks.sortId': 1
            }
          }
        ];
      case 'deadlineAsc':
        return [
          {
            '$sort': {
              'stages.tasks.deadline': -1
            }
          }
        ];
      case 'deadlineDesc':
      default:
        return [
          {
            '$sort': {
              'stages.tasks.deadline': 1
            }
          }
        ];
    }
  };
  const matchUsers = [
    {
      '$match': {
        '$or': [
          { 'stages.tasks.assignee': userId },
          { 'stages.tasks.createdBy': userId }
        ]
      }
    }
  ];
  const lookupTask = [
    {
      '$lookup': {
        from: 'users',
        let: {
          createdBy: '$stages.tasks.createdBy',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', '$$createdBy'],
              },
            },
          },
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
              _id: 1,
              email: 1,
            },
          },
        ],
        as: 'stages.tasks.createdBy',
      }
    },
    {
      '$lookup': {
        from: 'users',
        let: {
          assignee: '$stages.tasks.assignee',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', '$$assignee']
              }
            }
          },
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
              _id: 1,
              email: 1
            }
          }
        ],
        as: 'stages.tasks.assignee'
      }
    },
    // {
    //   '$lookup': {
    //     from: 'comments',
    //     localField: 'stages.tasks.comments',
    //     foreignField: '_id',
    //     as: 'stages.tasks.comments',
    //   }
    // },
    // {
    //   '$lookup': {
    //     from: 'activities',
    //     localField: 'stages.tasks.activities',
    //     foreignField: '_id',
    //     as: 'stages.tasks.activities',
    //   }
    // }
  ];
  const addTaskFields = [
    {
      '$addFields': {
        'stages.tasks.project.id': '$_id',
        'stages.tasks.project.name': '$name',
        'stages.tasks.project.code': '$code',
        'stages.tasks.stage.id': '$stages._id',
        'stages.tasks.stage.name': '$stages.name',
        'stages.tasks.createdBy': {
          $arrayElemAt: [
            '$stages.tasks.createdBy',
            0
          ]
        },
        'stages.tasks.assignee': {
          $arrayElemAt: [
            '$stages.tasks.assignee',
            0
          ]
        }
      }
    }
  ];
  const removeTaskFields = [
    {
      '$project': {
        'stages.tasks.comments': 0,
        'stages.tasks.activities': 0
      }
    }
  ]
  const groupTasks = [
    {
      '$group': {
        _id: null,
        tasks: {
          $addToSet: '$stages.tasks'
        },
        total: {
          $sum: 1
        }
      }
    }
  ];
  const taskResults = [
    {
      '$project': {
        tasks: 1,
        total: 1,
        _id: 0
      }
    }
  ];
  const groupAndCountTasks = [
    {
      '$group': {
        _id: null,
        count: {
          '$sum': 1,
        },
        tasks: {
          $push: '$stages.tasks'
        }
      }
    }
  ];
  const groupTasksWithPagination = [
    {
      '$group': {
        _id: null,
        total: {
          $first: '$count'
        },
        currentPage: {
          $first: page
        },
        tasks: {
          $push: '$tasks'
        }
      }
    }
  ]
  const taskResultsWithTotalPages = [
    {
      '$project': {
        tasks: 1,
        total: 1,
        currentPage: 1,
        totalPages: {
          '$ceil': {
            '$divide': ['$total', limit]
          }
        },
        _id: 0
      }
    }
  ];
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
    resultWithTotalPages,
    populateTasks,
    unwindTasks,
    unwindTasksAgain,
    sortTasks,
    filterTasks,
    matchUsers,
    lookupTask,
    addTaskFields,
    removeTaskFields,
    groupTasks,
    taskResults,
    groupAndCountTasks,
    groupTasksWithPagination,
    taskResultsWithTotalPages
  }
};

module.exports = pipelines;