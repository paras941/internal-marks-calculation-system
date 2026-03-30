const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { validate, asyncHandler } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { getUsers, getUser, updateUser, deleteUser, getStudents, getFaculty } = require('../controllers/userController');

router.use(protect);

router.get('/', authorize('admin', 'hod'), asyncHandler(getUsers));
router.get('/students', authorize('admin', 'faculty', 'hod'), asyncHandler(getStudents));
router.get('/faculty', authorize('admin', 'hod'), asyncHandler(getFaculty));
router.get('/:id', [param('id').isMongoId().withMessage('Invalid user ID')], validate, asyncHandler(getUser));
router.put('/:id', [param('id').isMongoId().withMessage('Invalid user ID')], validate, authorize('admin', 'hod'), asyncHandler(updateUser));
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid user ID')], validate, authorize('admin', 'hod'), asyncHandler(deleteUser));

module.exports = router;
