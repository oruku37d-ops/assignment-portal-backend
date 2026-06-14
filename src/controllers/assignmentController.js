const Joi = require('joi');
const { Assignment, LecturerStudent, Submission } = require('../models');
const { logActivity } = require('../utils/activityLogger');
const { serialize } = require('../utils/serialize');

const createAssignmentSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow('', null),
  module: Joi.string().required(),
  dueDate: Joi.date().iso().allow(null),
});

const listAssignments = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let filter = {};

    if (role === 'LECTURER') {
      filter = { createdById: id };
    } else if (role === 'STUDENT') {
      const links = await LecturerStudent.find({ studentId: id });
      const lecturerIds = links.map((l) => l.lecturerId);
      filter = { createdById: { $in: lecturerIds } };
    }

    const assignments = await Assignment.find(filter)
      .populate('createdById', 'name email')
      .sort({ createdAt: -1 });

    const result = await Promise.all(
      assignments.map(async (a) => {
        const json = serialize(a);
        json.createdBy = serialize(a.createdById);
        delete json.createdById;
        const count = await Submission.countDocuments({ assignmentId: a._id });
        json._count = { submissions: count };
        return json;
      }),
    );

    res.json({ assignments: result });
  } catch (err) {
    next(err);
  }
};

const getAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('createdById', 'name email');
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const json = serialize(assignment);
    json.createdBy = serialize(assignment.createdById);
    delete json.createdById;

    const submissionFilter = req.user.role === 'STUDENT'
      ? { assignmentId: assignment._id, studentId: req.user.id }
      : { assignmentId: assignment._id };

    const submissions = await Submission.find(submissionFilter).populate('studentId', 'name email');
    json.submissions = submissions.map((s) => {
      const sub = serialize(s);
      sub.student = serialize(s.studentId);
      delete sub.studentId;
      return sub;
    });

    res.json({ assignment: json });
  } catch (err) {
    next(err);
  }
};

const createAssignment = async (req, res, next) => {
  try {
    const data = { ...req.body, createdById: req.user.id };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);

    const assignment = await Assignment.create(data);
    await assignment.populate('createdById', 'name');

    const json = serialize(assignment);
    json.createdBy = serialize(assignment.createdById);
    delete json.createdById;

    await logActivity({
      userId: req.user.id,
      action: 'ASSIGNMENT_CREATED',
      entityType: 'Assignment',
      entityId: json.id,
    });

    res.status(201).json({ assignment: json });
  } catch (err) {
    next(err);
  }
};

module.exports = { listAssignments, getAssignment, createAssignment, createAssignmentSchema };
