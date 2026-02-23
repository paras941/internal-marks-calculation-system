const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { getUsers, getUser, updateUser, deleteUser, getStudents, getFaculty } = require('../controllers/userController');

router.use(protect);

router.get('/', authorize('admin', 'hod'), getUsers);
router.get('/students', authorize('admin', 'faculty', 'hod'), getStudents);
router.get('/faculty', authorize('admin', 'hod'), getFaculty);
router.get('/:id', [param('id').isMongoId().withMessage('Invalid user ID')], validate, getUser);
router.put('/:id', [param('id').isMongoId().withMessage('Invalid user ID')], validate, authorize('admin', 'hod'), updateUser);
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid user ID')], validate, authorize('admin'), deleteUser);

module.exports = router;
