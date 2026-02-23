const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Private (Admin only)
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, department, semester, section, enrollmentNumber } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // For students, enrollment number is required
    if (role === 'student' && !enrollmentNumber) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment number is required for students'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role,
      department,
      semester,
      section,
      enrollmentNumber
    });

    // Create audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE',
      entityType: 'USER',
      entityId: user._id,
      description: `Created new ${role} user: ${email}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

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

    // Create audit log
    await AuditLog.create({
      userId: user._id,
      action: 'LOGIN',
      entityType: 'AUTH',
      description: 'User logged in',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Create audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'LOGOUT',
      entityType: 'AUTH',
      description: 'User logged out',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error getting user'
    });
  }
};

// Helper function to get token and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  // Remove password from output
  const userResponse = user.toObject();
  delete userResponse.password;

  res.status(statusCode).json({
    success: true,
    token,
    data: userResponse
  });
};
