const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { User, LecturerStudent } = require('../models');
const { logActivity } = require('../utils/activityLogger');
const { serialize } = require('../utils/serialize');

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).required(),
  role: Joi.string().valid('LECTURER', 'STUDENT').required(),
});

const updateUserSchema = Joi.object({
  email: Joi.string().email(),
  name: Joi.string().min(2),
  password: Joi.string().min(6),
}).min(1);

const assignStudentSchema = Joi.object({
  studentId: Joi.string().required(),
});

const listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users: serialize(users) });
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({ email: email.toLowerCase(), password: hashed, name, role });

    await logActivity({
      userId: req.user.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
    });

    res.status(201).json({ user: serialize(user) });
  } catch (err) {
    next(err);
  }
};

const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    if (role === 'STUDENT' && id !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (role === 'LECTURER' && id !== userId) {
      const link = await LecturerStudent.findOne({ lecturerId: userId, studentId: id });
      if (!link) return res.status(403).json({ error: 'Student not assigned to you' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = serialize(user);

    if (role === 'LECTURER') {
      const links = await LecturerStudent.find({ lecturerId: userId }).populate('studentId', 'name email');
      result.studentLinks = links.map((l) => ({ student: serialize(l.studentId) }));
    }

    if (role === 'STUDENT') {
      const links = await LecturerStudent.find({ studentId: userId }).populate('lecturerId', 'name email');
      result.lecturerLinks = links.map((l) => ({ lecturer: serialize(l.lecturerId) }));
    }

    res.json({ user: result });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.password) data.password = await bcrypt.hash(data.password, 10);
    if (data.email) data.email = data.email.toLowerCase();

    const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user: serialize(user) });
  } catch (err) {
    next(err);
  }
};

const assignStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;
    const lecturerId = req.user.role === 'ADMIN' ? id : req.user.id;

    const student = await User.findById(studentId);
    if (!student || student.role !== 'STUDENT') {
      return res.status(400).json({ error: 'Invalid student' });
    }

    const link = await LecturerStudent.findOneAndUpdate(
      { lecturerId, studentId },
      { lecturerId, studentId, assignedAt: new Date() },
      { upsert: true, new: true },
    );

    await logActivity({
      userId: req.user.id,
      action: 'STUDENT_ASSIGNED',
      entityType: 'LecturerStudent',
      entityId: link.id,
    });

    res.status(201).json({ link: serialize(link) });
  } catch (err) {
    next(err);
  }
};

const myStudents = async (req, res, next) => {
  try {
    const links = await LecturerStudent.find({ lecturerId: req.user.id }).populate('studentId', '-password');
    res.json({ students: links.map((l) => serialize(l.studentId)) });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers, createUser, getUser, updateUser, assignStudent, myStudents,
  createUserSchema, updateUserSchema, assignStudentSchema,
};
