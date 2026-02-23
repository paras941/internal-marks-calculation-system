const EvaluationScheme = require('../models/EvaluationScheme');
const AuditLog = require('../models/AuditLog');

// @desc    Get all evaluation schemes
// @route   GET /api/schemes
// @access  Private
exports.getSchemes = async (req, res) => {
  try {
    const { department, semester, section, subjectCode, isActive } = req.query;

    let query = {};

    if (department) {
      query.department = department;
    } else if (req.user.role === 'hod') {
      query.department = req.user.department;
    }

    if (semester) {
      query.semester = parseInt(semester);
    }

    if (subjectCode) {
      query.subjectCode = { $regex: subjectCode, $options: 'i' };
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const schemes = await EvaluationScheme.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ semester: 1, subjectCode: 1 });

    res.status(200).json({
      success: true,
      data: schemes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching evaluation schemes'
    });
  }
};

// @desc    Get single evaluation scheme
// @route   GET /api/schemes/:id
// @access  Private
exports.getScheme = async (req, res) => {
  try {
    const scheme = await EvaluationScheme.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation scheme not found'
      });
    }

    res.status(200).json({
      success: true,
      data: scheme
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching evaluation scheme'
    });
  }
};

// @desc    Create evaluation scheme
// @route   POST /api/schemes
// @access  Private (Admin, HOD)
exports.createScheme = async (req, res) => {
  try {
    const { department, semester, subjectCode, subjectName, components, graceMarks, attendanceThreshold, bestOfTwoLogic } = req.body;

    // Check if scheme already exists
    const existingScheme = await EvaluationScheme.findOne({
      department,
      semester: parseInt(semester),
      subjectCode: subjectCode.toUpperCase()
    });

    if (existingScheme) {
      return res.status(400).json({
        success: false,
        message: 'Evaluation scheme already exists for this subject'
      });
    }

    // Validate total weightage
    const totalWeightage = components.reduce((sum, c) => sum + c.weightage, 0);
    if (totalWeightage > 100) {
      return res.status(400).json({
        success: false,
        message: 'Total weightage cannot exceed 100%'
      });
    }

    const scheme = await EvaluationScheme.create({
      department,
      semester: parseInt(semester),
      subjectCode: subjectCode.toUpperCase(),
      subjectName,
      components,
      graceMarks,
      attendanceThreshold,
      bestOfTwoLogic,
      createdBy: req.user._id
    });

    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE',
      entityType: 'EVALUATION_SCHEME',
      entityId: scheme._id,
      newValue: scheme.toObject(),
      description: `Created evaluation scheme: ${subjectCode}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: scheme
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error creating evaluation scheme'
    });
  }
};

// @desc    Update evaluation scheme
// @route   PUT /api/schemes/:id
// @access  Private (Admin, HOD)
exports.updateScheme = async (req, res) => {
  try {
    const { department, semester, subjectCode, subjectName, components, graceMarks, attendanceThreshold, bestOfTwoLogic, isActive } = req.body;

    let scheme = await EvaluationScheme.findById(req.params.id);

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation scheme not found'
      });
    }

    const oldValue = scheme.toObject();

    // Validate total weightage if components are being updated
    if (components) {
      const totalWeightage = components.reduce((sum, c) => sum + c.weightage, 0);
      if (totalWeightage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Total weightage cannot exceed 100%'
        });
      }
      scheme.components = components;
    }

    if (department) scheme.department = department;
    if (semester) scheme.semester = parseInt(semester);
    if (subjectCode) scheme.subjectCode = subjectCode.toUpperCase();
    if (subjectName) scheme.subjectName = subjectName;
    if (graceMarks) scheme.graceMarks = graceMarks;
    if (attendanceThreshold) scheme.attendanceThreshold = attendanceThreshold;
    if (bestOfTwoLogic) scheme.bestOfTwoLogic = bestOfTwoLogic;
    if (isActive !== undefined) scheme.isActive = isActive;

    await scheme.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE',
      entityType: 'EVALUATION_SCHEME',
      entityId: scheme._id,
      oldValue,
      newValue: scheme.toObject(),
      description: `Updated evaluation scheme: ${scheme.subjectCode}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      data: scheme
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error updating evaluation scheme'
    });
  }
};

// @desc    Delete evaluation scheme
// @route   DELETE /api/schemes/:id
// @access  Private (Admin only)
exports.deleteScheme = async (req, res) => {
  try {
    const scheme = await EvaluationScheme.findById(req.params.id);

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation scheme not found'
      });
    }

    const subjectCode = scheme.subjectCode;

    await scheme.deleteOne();

    await AuditLog.create({
      userId: req.user._id,
      action: 'DELETE',
      entityType: 'EVALUATION_SCHEME',
      entityId: req.params.id,
      description: `Deleted evaluation scheme: ${subjectCode}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Evaluation scheme deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error deleting evaluation scheme'
    });
  }
};

// @desc    Get subjects by faculty
// @route   GET /api/schemes/faculty/my-subjects
// @access  Private (Faculty)
exports.getMySubjects = async (req, res) => {
  try {
    const user = req.user;
    
    let query = { isActive: true };

    // For faculty, get assigned subjects
    if (user.role === 'faculty' && user.assignedSubjects && user.assignedSubjects.length > 0) {
      query._id = { $in: user.assignedSubjects };
    } else if (user.role === 'hod') {
      query.department = user.department;
    }

    const schemes = await EvaluationScheme.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ semester: 1, subjectCode: 1 });

    res.status(200).json({
      success: true,
      data: schemes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subjects'
    });
  }
};
