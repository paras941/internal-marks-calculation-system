const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { getMarks, getMark, createMarks, updateMarks, deleteMarks, bulkUploadMarks, recalculateMarks, approveMarks } = require('../controllers/marksController');

// Configure multer for CSV upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
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

router.get('/', getMarks);
router.get('/:id', [param('id').isMongoId().withMessage('Invalid marks ID')], validate, getMark);
router.post('/', authorize('admin', 'faculty', 'hod'), createMarks);
router.put('/:id', [param('id').isMongoId().withMessage('Invalid marks ID')], validate, authorize('admin', 'faculty', 'hod'), updateMarks);
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid marks ID')], validate, authorize('admin'), deleteMarks);
router.post('/bulk', authorize('admin', 'faculty', 'hod'), upload.single('file'), bulkUploadMarks);
router.post('/recalculate/:subjectId', [param('subjectId').isMongoId().withMessage('Invalid subject ID')], validate, authorize('admin', 'faculty', 'hod'), recalculateMarks);
router.put('/approve/:id', [param('id').isMongoId().withMessage('Invalid marks ID')], validate, authorize('admin', 'hod'), approveMarks);

module.exports = router;
