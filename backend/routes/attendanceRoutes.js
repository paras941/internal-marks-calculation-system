const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { validate, asyncHandler } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { getAttendance, createAttendance, bulkCreateAttendance, getAttendanceSummary } = require('../controllers/attendanceController');

router.use(protect);

router.get('/', asyncHandler(getAttendance));
router.get('/summary/:studentId', asyncHandler(getAttendanceSummary));
router.post('/', authorize('admin', 'faculty', 'hod'), asyncHandler(createAttendance));
router.post('/bulk', authorize('admin', 'faculty', 'hod'), asyncHandler(bulkCreateAttendance));

module.exports = router;
