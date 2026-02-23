const StudentMarks = require('../models/StudentMarks');
const EvaluationScheme = require('../models/EvaluationScheme');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { calculateMarks, recalculateAllMarks } = require('../utils/calculationEngine');
const { processBulkMarksUpload, parseCSV } = require('../utils/csvParser');
const fs = require('fs');

// @desc    Get all marks
// @route   GET /api/marks
// @access  Private
exports.getMarks = async (req, res) => {
  try {
    const { studentId, subjectId, department, semester, section, status } = req.query;

    let query = {};

    // Students can only see their own marks
    if (req.user.role === 'student') {
      query.studentId = req.user._id;
    } else if (studentId) {
      query.studentId = studentId;
    }

    if (subjectId) {
      query.subjectId = subjectId;
    }

    if (department) {
      query.department = department;
    } else if (req.user.role === 'hod') {
      query.department = req.user.department;
    }

    if (semester) {
      query.semester = parseInt(semester);
    }

    if (section) {
      query.section = section.toUpperCase();
    }

    if (status) {
      query.status = status;
    }

    const marks = await StudentMarks.find(query)
      .populate('studentId', 'firstName lastName enrollmentNumber email')
      .populate('subjectId', 'subjectCode subjectName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: marks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching marks'
    });
  }
};

// @desc    Get single marks record
// @route   GET /api/marks/:id
// @access  Private
exports.getMark = async (req, res) => {
  try {
    const marks = await StudentMarks.findById(req.params.id)
      .populate('studentId', 'firstName lastName enrollmentNumber email department semester')
      .populate('subjectId');

    if (!marks) {
      return res.status(404).json({
        success: false,
        message: 'Marks record not found'
      });
    }

    // Students can only view their own marks
    if (req.user.role === 'student' && marks.studentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this record'
      });
    }

    res.status(200).json({
      success: true,
      data: marks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching marks'
    });
  }
};

// @desc    Create marks entry
// @route   POST /api/marks
// @access  Private (Faculty, Admin)
exports.createMarks = async (req, res) => {
  try {
    const { studentId, subjectId, marks, graceMarksApplied } = req.body;

    // Verify subject exists
    const scheme = await EvaluationScheme.findById(subjectId);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation scheme not found'
      });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if marks already exist
    let studentMarks = await StudentMarks.findOne({
      studentId,
      subjectId
    });

    const oldValue = studentMarks ? studentMarks.toObject() : null;

    if (studentMarks) {
      // Update existing marks
      studentMarks.marks = marks;
      if (graceMarksApplied !== undefined) {
        studentMarks.graceMarksApplied = graceMarksApplied;
      }
      studentMarks.enteredBy = req.user._id;
    } else {
      // Create new marks
      studentMarks = new StudentMarks({
        studentId,
        subjectId,
        department: student.department,
        semester: student.semester,
        section: student.section,
        marks,
        graceMarksApplied: graceMarksApplied || 0,
        enteredBy: req.user._id
      });
    }

    // Calculate marks
    const calculated = await calculateMarks(studentMarks, scheme);
    
    studentMarks.marks = marks;
    studentMarks.totalMarks = calculated.totalMarks;
    studentMarks.weightedMarks = calculated.weightedMarks;
    studentMarks.attendanceBonus = calculated.attendanceBonus;
    studentMarks.graceMarksApplied = calculated.graceMarksApplied;
    studentMarks.finalMarks = calculated.finalMarks;
    studentMarks.status = 'calculated';

    await studentMarks.save();

    // Create audit log
    await AuditLog.create({
      userId: req.user._id,
      action: oldValue ? 'UPDATE' : 'CREATE',
      entityType: 'STUDENT_MARKS',
      entityId: studentMarks._id,
      oldValue,
      newValue: studentMarks.toObject(),
      description: `${oldValue ? 'Updated' : 'Created'} marks for student ${student.enrollmentNumber} in ${scheme.subjectCode}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: studentMarks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error creating marks'
    });
  }
};

// @desc    Update marks
// @route   PUT /api/marks/:id
// @access  Private (Faculty, Admin)
exports.updateMarks = async (req, res) => {
  try {
    const { marks, graceMarksApplied, status } = req.body;

    let studentMarks = await StudentMarks.findById(req.params.id)
      .populate('subjectId');

    if (!studentMarks) {
      return res.status(404).json({
        success: false,
        message: 'Marks record not found'
      });
    }

    const oldValue = studentMarks.toObject();
    const scheme = studentMarks.subjectId;

    // Update fields
    if (marks) {
      studentMarks.marks = marks;
    }
    if (graceMarksApplied !== undefined) {
      studentMarks.graceMarksApplied = graceMarksApplied;
    }
    if (status) {
      studentMarks.status = status;
    }

    // Recalculate marks
    const calculated = await calculateMarks(studentMarks, scheme);
    
    studentMarks.totalMarks = calculated.totalMarks;
    studentMarks.weightedMarks = calculated.weightedMarks;
    studentMarks.attendanceBonus = calculated.attendanceBonus;
    studentMarks.graceMarksApplied = calculated.graceMarksApplied;
    studentMarks.finalMarks = calculated.finalMarks;

    await studentMarks.save();

    // Create audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE',
      entityType: 'STUDENT_MARKS',
      entityId: studentMarks._id,
      oldValue,
      newValue: studentMarks.toObject(),
      description: `Updated marks for student`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      data: studentMarks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error updating marks'
    });
  }
};

// @desc    Delete marks
// @route   DELETE /api/marks/:id
// @access  Private (Admin only)
exports.deleteMarks = async (req, res) => {
  try {
    const studentMarks = await StudentMarks.findById(req.params.id);

    if (!studentMarks) {
      return res.status(404).json({
        success: false,
        message: 'Marks record not found'
      });
    }

    await studentMarks.deleteOne();

    // Create audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'DELETE',
      entityType: 'STUDENT_MARKS',
      entityId: req.params.id,
      description: 'Deleted marks record',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Marks deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error deleting marks'
    });
  }
};

// @desc    Bulk upload marks via CSV
// @route   POST /api/marks/bulk
// @access  Private (Faculty, Admin)
exports.bulkUploadMarks = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a CSV file'
      });
    }

    const { subjectId } = req.body;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: 'Subject ID is required'
      });
    }

    // Parse CSV file
    const csvData = await parseCSV(req.file.path);

    if (csvData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty'
      });
    }

    // Process bulk upload
    const results = await processBulkMarksUpload(csvData, subjectId, req.user._id);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Create audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'UPLOAD',
      entityType: 'STUDENT_MARKS',
      description: `Bulk uploaded marks: ${results.success.length} successful, ${results.errors.length} errors`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error(error);
    // Clean up file if exists
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error uploading marks'
    });
  }
};

// @desc    Recalculate all marks for a subject
// @route   POST /api/marks/recalculate/:subjectId
// @access  Private (Faculty, Admin)
exports.recalculateMarks = async (req, res) => {
  try {
    const results = await recalculateAllMarks(req.params.subjectId);

    // Create audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE',
      entityType: 'STUDENT_MARKS',
      description: `Recalculated marks for subject`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error recalculating marks'
    });
  }
};

// @desc    Approve marks
// @route   PUT /api/marks/approve/:id
// @access  Private (HOD, Admin)
exports.approveMarks = async (req, res) => {
  try {
    const studentMarks = await StudentMarks.findById(req.params.id);

    if (!studentMarks) {
      return res.status(404).json({
        success: false,
        message: 'Marks record not found'
      });
    }

    const oldValue = studentMarks.toObject();

    studentMarks.status = 'approved';
    studentMarks.approvedBy = req.user._id;

    await studentMarks.save();

    // Create audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE',
      entityType: 'STUDENT_MARKS',
      entityId: studentMarks._id,
      oldValue,
      newValue: studentMarks.toObject(),
      description: 'Approved marks',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      data: studentMarks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error approving marks'
    });
  }
};
