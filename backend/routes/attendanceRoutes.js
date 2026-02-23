const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { getAttendance, createAttendance, bulkCreateAttendance, getAttendanceSummary } = require('../controllers/attendanceController');

router.use(protect);

router.get('/', getAttendance);
router.get('/summary/:studentId', getAttendanceSummary);
router.post('/', authorize('admin', 'faculty', 'hod'), createAttendance);
router.post('/bulk', authorize('admin', 'faculty', 'hod'), bulkCreateAttendance);

module.exports = router;
