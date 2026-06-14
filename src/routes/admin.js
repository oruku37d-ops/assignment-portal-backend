const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/stats', adminController.getStats);
router.get('/activity', adminController.getActivity);
router.get('/records/:table', adminController.getRecords);

module.exports = router;
