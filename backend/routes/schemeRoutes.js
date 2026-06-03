const express = require('express');
const router = express.Router();
const multer = require('multer');
const { param } = require('express-validator');
const { validate, asyncHandler } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { getSchemes, getScheme, createScheme, updateScheme, deleteScheme, getMySubjects, bulkUploadSchemes } = require('../controllers/schemeController');

const upload = multer({ dest: process.env.UPLOAD_PATH || 'uploads/' });

router.use(protect);

router.get('/', asyncHandler(getSchemes));
router.get('/faculty/my-subjects', authorize('admin', 'faculty', 'hod'), asyncHandler(getMySubjects));
router.post('/bulk', authorize('admin', 'hod'), upload.single('file'), asyncHandler(bulkUploadSchemes));
router.get('/:id', [param('id').isMongoId().withMessage('Invalid scheme ID')], validate, asyncHandler(getScheme));
router.post('/', authorize('admin', 'hod'), asyncHandler(createScheme));
router.put('/:id', [param('id').isMongoId().withMessage('Invalid scheme ID')], validate, authorize('admin', 'hod'), asyncHandler(updateScheme));
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid scheme ID')], validate, authorize('admin', 'hod'), asyncHandler(deleteScheme));

module.exports = router;
