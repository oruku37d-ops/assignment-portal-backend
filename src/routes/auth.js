const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/login', validate(authController.loginSchema), authController.login);
router.post('/register', authenticate, authorize('ADMIN'), validate(authController.registerSchema), authController.register);
router.get('/me', authenticate, authController.me);

module.exports = router;
