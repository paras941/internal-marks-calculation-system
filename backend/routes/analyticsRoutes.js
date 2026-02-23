const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getClassAverage, getSubjectPerformance, getAttendanceDistribution, getStudentProgress, getDashboardStats } = require('../controllers/analyticsController');

router.use(protect);

router.get('/class-average', getClassAverage);
router.get('/subject-performance', getSubjectPerformance);
router.get('/attendance-distribution', getAttendanceDistribution);
router.get('/student-progress/:studentId?', getStudentProgress);
router.get('/dashboard', getDashboardStats);

module.exports = router;
