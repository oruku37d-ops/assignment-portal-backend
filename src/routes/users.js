const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const userController = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN'), userController.listUsers);
router.post('/', authorize('ADMIN'), validate(userController.createUserSchema), userController.createUser);
router.get('/students/mine', authorize('LECTURER'), userController.myStudents);
router.get('/:id', authorize('ADMIN', 'LECTURER', 'STUDENT'), userController.getUser);
router.patch('/:id', authorize('ADMIN'), validate(userController.updateUserSchema), userController.updateUser);
router.post('/:id/assign-student', authorize('ADMIN', 'LECTURER'), validate(userController.assignStudentSchema), userController.assignStudent);

module.exports = router;
