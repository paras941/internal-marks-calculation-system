const express = require('express');
const router = express.Router();
const multer = require('multer');
const { param } = require('express-validator');
const { validate, asyncHandler } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { getAttendance, createAttendance, bulkCreateAttendance, getAttendanceSummary, bulkUploadAttendanceCsv } = require('../controllers/attendanceController');

const upload = multer({ dest: process.env.UPLOAD_PATH || 'uploads/' });

router.use(protect);

router.get('/', asyncHandler(getAttendance));
router.get('/summary/:studentId', asyncHandler(getAttendanceSummary));
router.post('/', authorize('admin', 'faculty', 'hod'), asyncHandler(createAttendance));
router.post('/bulk', authorize('admin', 'faculty', 'hod'), asyncHandler(bulkCreateAttendance));
router.post('/bulk-csv', authorize('admin', 'faculty', 'hod'), upload.single('file'), asyncHandler(bulkUploadAttendanceCsv));

module.exports = router;
