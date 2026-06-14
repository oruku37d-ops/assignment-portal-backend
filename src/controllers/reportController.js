const Joi = require('joi');
const { Report, Submission, LecturerStudent, GradeHistory } = require('../models');
const { scoreToGrade } = require('../utils/grading');
const { logActivity } = require('../utils/activityLogger');
const { serialize } = require('../utils/serialize');

const createReportSchema = Joi.object({
  submissionId: Joi.string().required(),
  message: Joi.string().min(10).required(),
  requestResubmission: Joi.boolean().default(false),
});

const respondSchema = Joi.object({
  lecturerResponse: Joi.string().min(5).required(),
  adjustScore: Joi.number().min(0).max(100).allow(null),
});

const formatReport = (r) => {
  const json = serialize(r);
  if (r.studentId?._id) {
    json.student = serialize(r.studentId);
    delete json.studentId;
  }
  if (r.submissionId?._id) {
    const sub = serialize(r.submissionId);
    if (r.submissionId.assignmentId?._id) {
      sub.assignment = serialize(r.submissionId.assignmentId);
      delete sub.assignmentId;
    }
    json.submission = sub;
    delete json.submissionId;
  }
  return json;
};

const listReports = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let filter = {};

    if (role === 'STUDENT') {
      filter = { studentId: id };
    } else if (role === 'LECTURER') {
      const links = await LecturerStudent.find({ lecturerId: id });
      filter = { studentId: { $in: links.map((l) => l.studentId) } };
    }

    const reports = await Report.find(filter)
      .populate('studentId', 'name email')
      .populate({
        path: 'submissionId',
        populate: { path: 'assignmentId', select: 'title module' },
      })
      .sort({ createdAt: -1 });

    res.json({ reports: reports.map(formatReport) });
  } catch (err) {
    next(err);
  }
};

const getReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate({ path: 'submissionId', populate: { path: 'assignmentId' } });

    if (!report) return res.status(404).json({ error: 'Report not found' });

    const { role, id } = req.user;
    if (role === 'STUDENT' && report.studentId._id.toString() !== id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json({ report: formatReport(report) });
  } catch (err) {
    next(err);
  }
};

const createReport = async (req, res, next) => {
  try {
    const { submissionId, message, requestResubmission } = req.body;

    const submission = await Submission.findById(submissionId);
    if (!submission || submission.studentId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Invalid submission' });
    }

    const report = await Report.create({
      submissionId,
      studentId: req.user.id,
      message,
      requestResubmission,
    });

    await report.populate({
      path: 'submissionId',
      populate: { path: 'assignmentId', select: 'title' },
    });

    await logActivity({
      userId: req.user.id,
      action: 'REPORT_CREATED',
      entityType: 'Report',
      entityId: report.id,
    });

    res.status(201).json({ report: formatReport(report) });
  } catch (err) {
    next(err);
  }
};

const respondToReport = async (req, res, next) => {
  try {
    const { lecturerResponse, adjustScore } = req.body;
    const report = await Report.findById(req.params.id).populate('submissionId');

    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (adjustScore !== null && adjustScore !== undefined) {
      const existing = report.submissionId;
      const grade = scoreToGrade(adjustScore);

      if (existing.score !== null && existing.score !== undefined) {
        await GradeHistory.create({
          submissionId: existing._id,
          previousScore: existing.score,
          previousGrade: existing.grade,
          newScore: adjustScore,
          newGrade: grade,
          changedById: req.user.id,
        });
      }

      await Submission.findByIdAndUpdate(existing._id, {
        score: adjustScore,
        grade,
        status: 'GRADED',
        gradedAt: new Date(),
      });
    }

    const updated = await Report.findByIdAndUpdate(
      req.params.id,
      { lecturerResponse, status: 'RESOLVED', resolvedAt: new Date() },
      { new: true },
    )
      .populate('studentId', 'name')
      .populate({
        path: 'submissionId',
        populate: { path: 'assignmentId', select: 'title' },
      });

    await logActivity({
      userId: req.user.id,
      action: 'REPORT_RESOLVED',
      entityType: 'Report',
      entityId: updated.id,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('report:resolved', {
        reportId: updated.id,
        studentId: updated.studentId._id.toString(),
      });
    }

    res.json({ report: formatReport(updated) });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listReports, getReport, createReport, respondToReport,
  createReportSchema, respondSchema,
};
