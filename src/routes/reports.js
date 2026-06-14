const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.use(authenticate);

router.get('/', reportController.listReports);
router.get('/:id', reportController.getReport);
router.post('/create', authorize('STUDENT'), validate(reportController.createReportSchema), reportController.createReport);
router.patch('/:id/respond', authorize('LECTURER', 'ADMIN'), validate(reportController.respondSchema), reportController.respondToReport);

module.exports = router;
