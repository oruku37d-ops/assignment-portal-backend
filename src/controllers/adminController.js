const {
  User, Assignment, Submission, Report, ActivityLog, GradeHistory, LecturerStudent,
} = require('../models');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { serialize } = require('../utils/serialize');

const getStats = async (req, res, next) => {
  try {
    const [adminCount, lecturerCount, studentCount, totalSubmissions, gradedCount, pendingCount, recentActivity] =
      await Promise.all([
        User.countDocuments({ role: 'ADMIN' }),
        User.countDocuments({ role: 'LECTURER' }),
        User.countDocuments({ role: 'STUDENT' }),
        Submission.countDocuments(),
        Submission.countDocuments({ status: 'GRADED' }),
        Submission.countDocuments({ status: 'PENDING' }),
        ActivityLog.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'name email'),
      ]);

    const graded = await Submission.find({ status: 'GRADED', grade: { $ne: null } }).select('grade');

    const distribution = graded.reduce((acc, s) => {
      acc[s.grade] = (acc[s.grade] || 0) + 1;
      return acc;
    }, {});

    res.json({
      stats: {
        users: {
          admin: adminCount,
          lecturer: lecturerCount,
          student: studentCount,
          total: adminCount + lecturerCount + studentCount,
        },
        submissions: { total: totalSubmissions, graded: gradedCount, pending: pendingCount },
        gradingDistribution: distribution,
        recentActivity: recentActivity.map((log) => {
          const entry = serialize(log);
          entry.user = log.userId ? serialize(log.userId) : null;
          delete entry.userId;
          return entry;
        }),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getActivity = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [logs, total] = await Promise.all([
      ActivityLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email role'),
      ActivityLog.countDocuments(),
    ]);

    const data = logs.map((log) => {
      const entry = serialize(log);
      entry.user = log.userId ? serialize(log.userId) : null;
      delete entry.userId;
      return entry;
    });

    res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    next(err);
  }
};

const TABLE_MAP = {
  users: { model: User, sort: 'createdAt' },
  assignments: { model: Assignment, sort: 'createdAt' },
  submissions: { model: Submission, sort: 'submittedAt' },
  reports: { model: Report, sort: 'createdAt' },
  activity: { model: ActivityLog, sort: 'createdAt' },
  'grade-history': { model: GradeHistory, sort: 'changedAt' },
  'lecturer-students': { model: LecturerStudent, sort: 'assignedAt' },
};

const getRecords = async (req, res, next) => {
  try {
    const table = TABLE_MAP[req.params.table];
    if (!table) return res.status(400).json({ error: 'Invalid table name' });

    const { page, limit, skip } = getPagination(req.query);
    const sortField = table.sort;

    const [data, total] = await Promise.all([
      table.model.find().sort({ [sortField]: -1 }).skip(skip).limit(limit),
      table.model.countDocuments(),
    ]);

    res.json(paginatedResponse(serialize(data), total, page, limit));
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getActivity, getRecords };
