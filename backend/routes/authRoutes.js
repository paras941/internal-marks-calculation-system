const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate, asyncHandler } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { register, login, logout, getMe } = require('../controllers/authController');

router.post('/register', [
  body('name')
    .optional()
    .isString().withMessage('name must be a string')
    .trim(),
  body('firstName')
    .optional()
    .isString().withMessage('firstName must be a string')
    .trim(),
  body('lastName')
    .optional()
    .isString().withMessage('lastName must be a string')
    .trim(),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').exists({ checkFalsy: true }).withMessage('email is required'),
  body('password').exists({ checkFalsy: true }).withMessage('password is required'),
  body('role').exists({ checkFalsy: true }).withMessage('role is required'),
  body().custom((value) => {
    const hasName = Boolean(value?.name && String(value.name).trim());
    const hasFirstAndLast = Boolean(
      value?.firstName && String(value.firstName).trim() &&
      value?.lastName && String(value.lastName).trim()
    );

    if (!hasName && !hasFirstAndLast) {
      throw new Error('Provide either name, or both firstName and lastName');
    }

    return true;
  }),
  body('role').isIn(['admin', 'faculty', 'hod', 'student']).withMessage('Invalid role')
], validate, protect, authorize('admin', 'hod'), asyncHandler(register));

router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], validate, asyncHandler(login));

router.post('/logout', protect, asyncHandler(logout));

router.get('/me', protect, asyncHandler(getMe));

module.exports = router;

