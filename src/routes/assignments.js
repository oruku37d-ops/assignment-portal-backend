const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const assignmentController = require('../controllers/assignmentController');
const submissionController = require('../controllers/submissionController');

const router = express.Router();

router.use(authenticate);

router.get('/', assignmentController.listAssignments);
router.get('/:id', assignmentController.getAssignment);
router.post('/create', authorize('LECTURER', 'ADMIN'), validate(assignmentController.createAssignmentSchema), assignmentController.createAssignment);
router.post('/:id/submit', authorize('STUDENT'), (req, res, next) => {
  upload.single('file')(req, res, (err) => (err ? next(err) : next()));
}, submissionController.submitAssignment);

module.exports = router;
