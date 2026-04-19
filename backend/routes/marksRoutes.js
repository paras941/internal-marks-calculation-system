const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body, param } = require('express-validator');
const { validate, asyncHandler } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { marksValidators } = require('../validators/validators');
const { getMarks, getMark, createMarks, updateMarks, deleteMarks, bulkUploadMarks, recalculateMarks, approveMarks, submitMarks, getCSVTemplate } = require('../controllers/marksController');

// Configure multer for CSV upload
const uploadPath = process.env.UPLOAD_PATH || (process.env.VERCEL ? '/tmp/uploads' : 'uploads/');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

router.use(protect);

// Specific routes first
router.get('/template/:subjectId', [param('subjectId').isMongoId().withMessage('Invalid subject ID')], validate, asyncHandler(getCSVTemplate));
router.post('/bulk', authorize('admin', 'faculty', 'hod'), upload.single('file'), asyncHandler(bulkUploadMarks));
router.post('/recalculate/:subjectId', [param('subjectId').isMongoId().withMessage('Invalid subject ID')], validate, authorize('admin', 'faculty', 'hod'), asyncHandler(recalculateMarks));
router.put('/submit/:id', [param('id').isMongoId().withMessage('Invalid marks ID')], validate, authorize('admin', 'faculty', 'hod'), asyncHandler(submitMarks));
router.put('/approve/:id', [param('id').isMongoId().withMessage('Invalid marks ID')], validate, authorize('admin', 'hod'), asyncHandler(approveMarks));

// Generic routes last
router.get('/', asyncHandler(getMarks));
router.get('/:id', [param('id').isMongoId().withMessage('Invalid marks ID')], validate, asyncHandler(getMark));
router.post(
  '/',
  [
    ...marksValidators.create,
    body('studentId').exists({ checkFalsy: true }).withMessage('studentId is required'),
    body('subjectId').exists({ checkFalsy: true }).withMessage('subjectId is required'),
    body('marks').exists().withMessage('marks is required')
  ],
  validate,
  authorize('admin', 'faculty', 'hod'),
  asyncHandler(createMarks)
);
router.put('/:id', marksValidators.update, validate, authorize('admin', 'faculty', 'hod'), asyncHandler(updateMarks));
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid marks ID')], validate, authorize('admin', 'hod'), asyncHandler(deleteMarks));

module.exports = router;

