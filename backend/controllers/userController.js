const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin, HOD)
exports.getUsers = async (req, res) => {
  try {
    const { role, department, semester, section, search, page = 1, limit = 10 } = req.query;

    let query = {};

    if (role) {
      query.role = role;
    }

    if (department) {
      query.department = department;
    } else if (req.user.role === 'hod') {
      query.department = req.user.department;
    }

    if (semester) {
      query.semester = semester;
    }

    if (section) {
      query.section = section.toUpperCase();
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    await AuditLog.create({
      userId: req.user._id,
      action: 'READ',
      entityType: 'USER',
      description: `Viewed user list with filters: ${JSON.stringify(req.query)}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

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
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin, HOD)
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, department, semester, section, isActive, assignedSubjects } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldValue = user.toObject();

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (department) user.department = department;
    if (semester) user.semester = semester;
    if (section) user.section = section.toUpperCase();
    if (isActive !== undefined) user.isActive = isActive;
    if (assignedSubjects) user.assignedSubjects = assignedSubjects;

    await user.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE',
      entityType: 'USER',
      entityId: user._id,
      oldValue,
      newValue: user.toObject(),
      description: `Updated user: ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const userEmail = user.email;

    await user.deleteOne();

    await AuditLog.create({
      userId: req.user._id,
      action: 'DELETE',
      entityType: 'USER',
      entityId: user._id,
      description: `Deleted user: ${userEmail}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
};

// @desc    Get students
// @route   GET /api/users/students
// @access  Private (Faculty, HOD, Admin)
exports.getStudents = async (req, res) => {
  try {
    const { department, semester, section } = req.query;

    let query = { role: 'student' };

    if (department) {
      query.department = department;
    }

    if (semester) {
      query.semester = semester;
    }

    if (section) {
      query.section = section.toUpperCase();
    }

    const students = await User.find(query)
      .select('-password')
      .sort({ firstName: 1 });

    res.status(200).json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students'
    });
  }
};

// @desc    Get faculty
// @route   GET /api/users/faculty
// @access  Private (Admin, HOD)
exports.getFaculty = async (req, res) => {
  try {
    let query = { role: { $in: ['faculty', 'hod'] } };

    if (req.user.role === 'hod') {
      query.department = req.user.department;
    }

    const faculty = await User.find(query)
      .select('-password')
      .sort({ firstName: 1 });

    res.status(200).json({
      success: true,
      data: faculty
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching faculty'
    });
  }
};
