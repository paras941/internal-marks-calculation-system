const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/validate');
const { getClassAverage, getSubjectPerformance, getAttendanceDistribution, getStudentProgress, getDashboardStats } = require('../controllers/analyticsController');

router.use(protect);

router.get('/class-average', asyncHandler(getClassAverage));
router.get('/subject-performance', asyncHandler(getSubjectPerformance));
router.get('/attendance-distribution', asyncHandler(getAttendanceDistribution));
router.get('/student-progress/:studentId?', asyncHandler(getStudentProgress));
router.get('/dashboard', asyncHandler(getDashboardStats));

module.exports = router;
