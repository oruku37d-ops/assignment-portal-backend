const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const submissionController = require('../controllers/submissionController');

const router = express.Router();

router.use(authenticate);

router.get('/', submissionController.listSubmissions);
router.get('/:id', submissionController.getSubmission);
router.get('/:id/history', authorize('LECTURER', 'ADMIN', 'STUDENT'), submissionController.getGradeHistory);
router.patch('/:id/grade', authorize('LECTURER', 'ADMIN'), validate(submissionController.gradeSchema), submissionController.gradeSubmission);
router.patch('/:id/comment', authorize('LECTURER', 'ADMIN'), validate(submissionController.commentSchema), submissionController.commentSubmission);

module.exports = router;
