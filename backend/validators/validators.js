const { body, param, query } = require('express-validator');

// User validators
const userValidators = {
  register: [
    body('email')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/\d/).withMessage('Password must contain at least one number'),
    body('firstName')
      .trim().notEmpty().withMessage('First name is required'),
    body('lastName')
      .trim().notEmpty().withMessage('Last name is required'),
    body('role')
      .isIn(['admin', 'faculty', 'hod', 'student']).withMessage('Invalid role'),
    body('department')
      .optional().trim(),
    body('semester')
      .optional().isInt({ min: 1, max: 8 }),
    body('section')
      .optional().trim().isUppercase(),
    body('enrollmentNumber')
      .optional().trim()
  ],
  login: [
    body('email')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('firstName')
      .optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName')
      .optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('department')
      .optional().trim(),
    body('semester')
      .optional().isInt({ min: 1, max: 8 }),
    body('section')
      .optional().trim().isUppercase(),
    body('isActive')
      .optional().isBoolean()
  ]
};

// Evaluation Scheme validators
const schemeValidators = {
  create: [
    body('department')
      .trim().notEmpty().withMessage('Department is required'),
    body('semester')
      .isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
    body('subjectCode')
      .trim().notEmpty().withMessage('Subject code is required')
      .isUppercase().withMessage('Subject code must be uppercase'),
    body('subjectName')
      .trim().notEmpty().withMessage('Subject name is required'),
    body('components')
      .isArray({ min: 1 }).withMessage('At least one component is required'),
    body('components.*.name')
      .notEmpty().withMessage('Component name is required'),
    body('components.*.maxMarks')
      .isFloat({ min: 0 }).withMessage('Max marks must be a positive number'),
    body('components.*.weightage')
      .isFloat({ min: 0, max: 100 }).withMessage('Weightage must be between 0 and 100')
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid scheme ID'),
    body('department')
      .optional().trim().notEmpty(),
    body('semester')
      .optional().isInt({ min: 1, max: 8 }),
    body('subjectCode')
      .optional().trim().isUppercase(),
    body('subjectName')
      .optional().trim().notEmpty(),
    body('components')
      .optional().isArray({ min: 1 })
  ]
};

// Marks validators
const marksValidators = {
  create: [
    body('studentId')
      .isMongoId().withMessage('Invalid student ID'),
    body('subjectId')
      .isMongoId().withMessage('Invalid subject ID'),
    body('marks')
      .isArray().withMessage('Marks must be an array'),
    body('marks.*.componentId')
      .isMongoId().withMessage('Invalid component ID'),
    body('marks.*.marksObtained')
      .isFloat({ min: 0 }).withMessage('Marks obtained must be a positive number'),
    body('marks.*.maxMarks')
      .isFloat({ min: 0 }).withMessage('Max marks must be a positive number'),
    body('marks.*.isAbsent')
      .optional().isBoolean()
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid marks ID'),
    body('marks')
      .optional().isArray(),
    body('marks.*.componentId')
      .optional().isMongoId(),
    body('marks.*.marksObtained')
      .optional().isFloat({ min: 0 }),
    body('graceMarksApplied')
      .optional().isFloat({ min: 0, max: 10 }),
    body('status')
      .optional().isIn(['draft', 'calculated', 'submitted', 'approved'])
  ],
  bulkUpload: [
    body('subjectId')
      .isMongoId().withMessage('Invalid subject ID')
  ]
};

// Attendance validators
const attendanceValidators = {
  create: [
    body('studentId')
      .isMongoId().withMessage('Invalid student ID'),
    body('subjectId')
      .isMongoId().withMessage('Invalid subject ID'),
    body('totalClasses')
      .isInt({ min: 0 }).withMessage('Total classes must be a positive number'),
    body('attendedClasses')
      .isInt({ min: 0 }).withMessage('Attended classes must be a positive number'),
    body('month')
      .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    body('year')
      .isInt({ min: 2020, max: 2030 }).withMessage('Invalid year')
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid attendance ID'),
    body('totalClasses')
      .optional().isInt({ min: 0 }),
    body('attendedClasses')
      .optional().isInt({ min: 0 })
  ]
};

// Analytics validators
const analyticsValidators = {
  classAverage: [
    query('subjectId')
      .optional().isMongoId(),
    query('department')
      .optional().trim(),
    query('semester')
      .optional().isInt({ min: 1, max: 8 })
  ],
  subjectPerformance: [
    query('department')
      .optional().trim(),
    query('semester')
      .optional().isInt({ min: 1, max: 8 })
  ]
};

module.exports = {
  userValidators,
  schemeValidators,
  marksValidators,
  attendanceValidators,
  analyticsValidators
};
