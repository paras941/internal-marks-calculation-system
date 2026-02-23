const User = require('../models/User');

// Check if user has required role
const checkRole = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Check if user belongs to department
const checkDepartment = (paramName = 'department') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const department = req.params[paramName] || req.body.department;
    
    // Admin and HOD can access all departments
    if (req.user.role === 'admin' || req.user.role === 'hod') {
      return next();
    }

    // Faculty and students can only access their own department
    if (req.user.department && department && req.user.department !== department) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own department'
      });
    }

    next();
  };
};

// Check if user can modify specific student marks
const canModifyMarks = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Admin can modify any marks
  if (req.user.role === 'admin') {
    return next();
  }

  // Faculty can modify marks for subjects they teach
  if (req.user.role === 'faculty' || req.user.role === 'hod') {
    const subjectId = req.params.id || req.body.subjectId;
    
    if (subjectId && req.user.assignedSubjects) {
      const canModify = req.user.assignedSubjects.some(
        id => id.toString() === subjectId
      );
      
      if (!canModify) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this subject'
        });
      }
    }
    
    return next();
  }

  // Students can only view their own marks
  return res.status(403).json({
    success: false,
    message: 'You can only view your own marks'
  });
};

module.exports = {
  checkRole,
  checkDepartment,
  canModifyMarks
};
