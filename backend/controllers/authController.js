const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { mapErrorToHttp, requireFields, validateObjectId } = require('../utils/controllerError');
const mongoose = require('mongoose');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Private (Admin only)
exports.register = async (req, res) => {
  try {
    console.log('[AUTH_REGISTER] Request received', {
      requestedBy: req.user?._id ? req.user._id.toString() : null,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      ip: req.ip
    });

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body is required'
      });
    }

    const {
      name,
      email,
      password,
      firstName: bodyFirstName,
      lastName: bodyLastName,
      role,
      department,
      semester,
      section,
      enrollmentNumber
    } = req.body;

    const missingCore = requireFields(req.body, ['email', 'password', 'role']);
    if (missingCore.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingCore.join(', ')}`
      });
    }

    // Support either `name` or `firstName` + `lastName` payload styles.
    let firstName = bodyFirstName;
    let lastName = bodyLastName;

    if ((!firstName || !lastName) && name && String(name).trim()) {
      const tokens = String(name).trim().split(/\s+/);
      firstName = tokens[0];
      lastName = tokens.length > 1 ? tokens.slice(1).join(' ') : '-';
    }

    if (!firstName || !lastName) {
      console.warn('[AUTH_REGISTER] Missing required fields', {
        hasFirstName: Boolean(firstName),
        hasLastName: Boolean(lastName)
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName/lastName (or name)'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    // For students, enrollment number is required
    if (role === 'student' && !enrollmentNumber) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment number is required for students'
      });
    }

    // Build user data, only including non-empty optional fields
    // This prevents Mongoose CastErrors (e.g. semester: '' -> Number)
    // and duplicate key errors (e.g. enrollmentNumber: '' on unique index)
    const userData = {
      email: String(email).trim().toLowerCase(),
      password,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      role: String(role).trim().toLowerCase()
    };
    if (department) userData.department = String(department).trim();
    if (semester !== undefined && semester !== '') {
      const parsedSemester = Number(semester);
      if (!Number.isInteger(parsedSemester) || parsedSemester < 1 || parsedSemester > 8) {
        return res.status(400).json({
          success: false,
          message: 'Semester must be an integer between 1 and 8'
        });
      }
      userData.semester = parsedSemester;
    }
    if (section) userData.section = String(section).trim().toUpperCase();
    if (enrollmentNumber) userData.enrollmentNumber = String(enrollmentNumber).trim();

    // Create user
    const user = await User.create(userData);

    console.log('[AUTH_REGISTER] User created', {
      createdUserId: user._id.toString(),
      email: user.email,
      role: user.role
    });

    // Create audit log (req.user is undefined for self-registration)
    try {
      const auditUserId = req.user?.role === 'admin' ? req.user._id : user._id;
      if (mongoose.Types.ObjectId.isValid(auditUserId)) {
        await AuditLog.create({
          userId: auditUserId,
          action: 'CREATE',
          entityType: 'USER',
          entityId: user._id,
          description: `Created new ${role} user: ${email}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
    } catch (auditError) {
      console.error('[AUTH_REGISTER] Audit log creation failed', {
        email: userData.email,
        error: auditError.message
      });
    }

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('[AUTH_REGISTER] Unexpected error', {
      email: req.body?.email,
      errorName: error.name,
      errorCode: error.code,
      errorMessage: error.message,
      stack: error.stack
    });

    // Surface password hashing failures (bcrypt pre-save hook) as server errors with clear message.
    const isHashingError =
      /bcrypt/i.test(error.message || '') ||
      /hash/i.test(error.message || '') ||
      /salt/i.test(error.message || '');

    if (isHashingError) {
      return res.status(500).json({
        success: false,
        message: 'Password hashing failed during registration'
      });
    }

    const mapped = mapErrorToHttp(error);
    res.status(mapped.statusCode).json({
      success: false,
      message: error.code === 11000 && error.keyPattern?.email
        ? 'Email is already registered'
        : mapped.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    console.log('[AUTH_LOGIN] Request received', {
      bodyKeys: req.body ? Object.keys(req.body) : [],
      params: req.params,
      ip: req.ip
    });

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body is required'
      });
    }

    const { email, password } = req.body;
    const missingFields = requireFields(req.body, ['email', 'password']);

    // Validate email & password
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check for user
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create audit log (best effort)
    try {
      await AuditLog.create({
        userId: user._id,
        action: 'LOGIN',
        entityType: 'AUTH',
        description: 'User logged in',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (auditError) {
      console.error('[AUTH_LOGIN] Audit log creation failed', {
        userId: user._id.toString(),
        error: auditError.message
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('[AUTH_LOGIN] Unexpected error', {
      email: req.body?.email,
      params: req.params,
      errorName: error.name,
      errorCode: error.code,
      errorMessage: error.message,
      stack: error.stack
    });

    const mapped = mapErrorToHttp(error);
    res.status(mapped.statusCode).json({
      success: false,
      message: mapped.message
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    console.log('[AUTH_LOGOUT] Request received', {
      userId: req.user?._id ? req.user._id.toString() : null,
      params: req.params,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      ip: req.ip
    });

    if (!req.user?._id || !validateObjectId(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid authenticated user id'
      });
    }

    // Create audit log (best effort)
    try {
      await AuditLog.create({
        userId: req.user._id,
        action: 'LOGOUT',
        entityType: 'AUTH',
        description: 'User logged out',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (auditError) {
      console.error('[AUTH_LOGOUT] Audit log creation failed', {
        userId: req.user._id.toString(),
        error: auditError.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('[AUTH_LOGOUT] Unexpected error', {
      userId: req.user?._id ? req.user._id.toString() : null,
      params: req.params,
      errorName: error.name,
      errorCode: error.code,
      errorMessage: error.message,
      stack: error.stack
    });

    const mapped = mapErrorToHttp(error);
    res.status(mapped.statusCode).json({
      success: false,
      message: mapped.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    console.log('[AUTH_ME] Request received', {
      userId: req.user?._id ? req.user._id.toString() : null,
      params: req.params,
      ip: req.ip
    });

    if (!req.user?._id || !validateObjectId(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid authenticated user id'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('[AUTH_ME] Unexpected error', {
      userId: req.user?._id ? req.user._id.toString() : null,
      params: req.params,
      errorName: error.name,
      errorCode: error.code,
      errorMessage: error.message,
      stack: error.stack
    });

    const mapped = mapErrorToHttp(error);
    res.status(mapped.statusCode).json({
      success: false,
      message: mapped.message
    });
  }
};

// Helper function to get token and send response
const sendTokenResponse = (user, statusCode, res) => {
  try {
    const token = user.getSignedJwtToken();

    // Remove password from output
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(statusCode).json({
      success: true,
      token,
      data: userResponse
    });
  } catch (tokenError) {
    console.error('[SEND_TOKEN_RESPONSE] Token generation failed', {
      userId: user._id.toString(),
      error: tokenError.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to generate authentication token. Please try again.'
    });
  }
};

