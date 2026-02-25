const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { register, login, logout, getMe } = require('../controllers/authController');

router.post('/register', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['admin', 'faculty', 'hod', 'student']).withMessage('Invalid role')
], validate, register);

router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], validate, login);

router.post('/logout', protect, logout);

router.get('/me', protect, getMe);

module.exports = router;
