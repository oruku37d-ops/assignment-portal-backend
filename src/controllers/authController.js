const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { User } = require('../models');
const { signToken } = require('../utils/jwt');
const { logActivity } = require('../utils/activityLogger');
const { serialize } = require('../utils/serialize');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).required(),
  role: Joi.string().valid('ADMIN', 'LECTURER', 'STUDENT').required(),
});

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const safe = serialize(user);
    const token = signToken({ id: safe.id, role: safe.role });
    await logActivity({ userId: safe.id, action: 'LOGIN', entityType: 'User', entityId: safe.id });

    res.json({ token, user: safe });
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({ email: email.toLowerCase(), password: hashed, name, role });

    await logActivity({
      userId: req.user.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      metadata: { role },
    });

    res.status(201).json({ user: serialize(user) });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { login, register, me, loginSchema, registerSchema };
