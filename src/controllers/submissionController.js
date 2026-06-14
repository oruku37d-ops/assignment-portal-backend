const Joi = require('joi');
const { Submission, Assignment, LecturerStudent, GradeHistory } = require('../models');
const { scoreToGrade } = require('../utils/grading');
const { logActivity } = require('../utils/activityLogger');
const { serialize } = require('../utils/serialize');

const gradeSchema = Joi.object({
  score: Joi.number().min(0).max(100).required(),
});

const commentSchema = Joi.object({
  comment: Joi.string().required(),
});

const formatSubmission = (s) => {
  const json = serialize(s);
  if (s.assignmentId && s.assignmentId._id) {
    json.assignment = serialize(s.assignmentId);
    delete json.assignmentId;
  }
  if (s.studentId && s.studentId._id) {
    json.student = serialize(s.studentId);
    delete json.studentId;
  }
  return json;
};

const listSubmissions = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let filter = {};

    if (role === 'STUDENT') {
      filter = { studentId: id };
    } else if (role === 'LECTURER') {
      const links = await LecturerStudent.find({ lecturerId: id });
      const studentIds = links.map((l) => l.studentId);
      const lecturerAssignments = await Assignment.find({ createdById: id }).select('_id');
      const assignmentIds = lecturerAssignments.map((a) => a._id);
      filter = {
        $or: [
          { studentId: { $in: studentIds } },
          { assignmentId: { $in: assignmentIds } },
        ],
      };
    }

    const submissions = await Submission.find(filter)
      .populate('assignmentId', 'title module')
      .populate('studentId', 'name email')
      .sort({ submittedAt: -1 });

    res.json({ submissions: submissions.map(formatSubmission) });
  } catch (err) {
    next(err);
  }
};

const getSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('assignmentId')
      .populate('studentId', 'name email');

    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const { role, id } = req.user;
    if (role === 'STUDENT' && submission.studentId._id.toString() !== id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const json = formatSubmission(submission);

    const history = await GradeHistory.find({ submissionId: submission._id })
      .populate('changedById', 'name')
      .sort({ changedAt: -1 });

    json.gradeHistory = history.map((h) => {
      const entry = serialize(h);
      entry.changedBy = serialize(h.changedById);
      delete entry.changedById;
      return entry;
    });

    res.json({ submission: json });
  } catch (err) {
    next(err);
  }
};

const submitAssignment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const fileUrl = `/uploads/${req.file.filename}`;

    const submission = await Submission.findOneAndUpdate(
      { assignmentId: assignment._id, studentId: req.user.id },
      {
        assignmentId: assignment._id,
        studentId: req.user.id,
        fileUrl,
        title: req.body.title || null,
        status: 'PENDING',
        score: null,
        grade: null,
        comment: null,
        gradedAt: null,
        submittedAt: new Date(),
      },
      { upsert: true, new: true },
    ).populate('assignmentId', 'title module');

    await logActivity({
      userId: req.user.id,
      action: 'SUBMISSION_CREATED',
      entityType: 'Submission',
      entityId: submission.id,
    });

    const io = req.app.get('io');
    if (io) io.emit('submission:created', { submissionId: submission.id });

    res.status(201).json({ submission: formatSubmission(submission) });
  } catch (err) {
    next(err);
  }
};

const gradeSubmission = async (req, res, next) => {
  try {
    const { score } = req.body;
    const grade = scoreToGrade(score);

    const existing = await Submission.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Submission not found' });

    if (existing.score !== null && existing.score !== undefined) {
      await GradeHistory.create({
        submissionId: existing._id,
        previousScore: existing.score,
        previousGrade: existing.grade,
        newScore: score,
        newGrade: grade,
        changedById: req.user.id,
      });
    }

    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { score, grade, status: 'GRADED', gradedAt: new Date() },
      { new: true },
    )
      .populate('studentId', 'name email')
      .populate('assignmentId', 'title');

    await logActivity({
      userId: req.user.id,
      action: 'SUBMISSION_GRADED',
      entityType: 'Submission',
      entityId: submission.id,
      metadata: { score, grade },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('submission:graded', {
        submissionId: submission.id,
        studentId: submission.studentId._id.toString(),
      });
    }

    res.json({ submission: formatSubmission(submission) });
  } catch (err) {
    next(err);
  }
};

const commentSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { comment: req.body.comment },
      { new: true },
    );
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    res.json({ submission: serialize(submission) });
  } catch (err) {
    next(err);
  }
};

const getGradeHistory = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const { role, id } = req.user;
    if (role === 'STUDENT' && submission.studentId.toString() !== id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const history = await GradeHistory.find({ submissionId: req.params.id })
      .populate('changedById', 'name')
      .sort({ changedAt: -1 });

    res.json({
      history: history.map((h) => {
        const entry = serialize(h);
        entry.changedBy = serialize(h.changedById);
        delete entry.changedById;
        return entry;
      }),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listSubmissions, getSubmission, submitAssignment,
  gradeSubmission, commentSubmission, getGradeHistory,
  gradeSchema, commentSchema,
};
