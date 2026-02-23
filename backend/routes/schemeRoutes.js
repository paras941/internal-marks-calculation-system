const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { getSchemes, getScheme, createScheme, updateScheme, deleteScheme, getMySubjects } = require('../controllers/schemeController');

router.use(protect);

router.get('/', getSchemes);
router.get('/faculty/my-subjects', authorize('admin', 'faculty', 'hod'), getMySubjects);
router.get('/:id', [param('id').isMongoId().withMessage('Invalid scheme ID')], validate, getScheme);
router.post('/', authorize('admin', 'hod'), createScheme);
router.put('/:id', [param('id').isMongoId().withMessage('Invalid scheme ID')], validate, authorize('admin', 'hod'), updateScheme);
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid scheme ID')], validate, authorize('admin'), deleteScheme);

module.exports = router;
