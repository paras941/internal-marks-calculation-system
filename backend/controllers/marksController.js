const StudentMarks = require('../models/StudentMarks');
const EvaluationScheme = require('../models/EvaluationScheme');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { calculateMarks, recalculateAllMarks } = require('../utils/calculationEngine');
const { processBulkMarksUpload, parseCSV, generateCSVTemplate } = require('../utils/csvParser');
const fs = require('fs');
const mongoose = require('mongoose');

const buildComponentLookup = (scheme) => {
  const components = Array.isArray(scheme?.components) ? scheme.components : [];

  return {
    components,
    byId: new Map(components.map((component) => [component._id.toString(), component])),
    byName: new Map(components.map((component) => [String(component.name).trim().toLowerCase(), component]))
  };
};

const normalizeMarkEntry = (mark, lookup) => {
  if (!mark || typeof mark !== 'object') {
    return { error: 'Each marks entry must be a valid object' };
  }

  const rawComponentId = mark.componentId ? String(mark.componentId).trim() : '';
  let schemeComponent = null;

  if (rawComponentId) {
    if (!mongoose.Types.ObjectId.isValid(rawComponentId)) {
      return { error: `Invalid component ID: ${mark.componentId}` };
    }

    schemeComponent = lookup.byId.get(rawComponentId) || null;
    if (!schemeComponent) {
      return { error: `Invalid component ID: ${mark.componentId}` };
    }
  } else if (mark.componentName) {
    schemeComponent = lookup.byName.get(String(mark.componentName).trim().toLowerCase()) || null;
  }

  const componentName = String(mark.componentName || schemeComponent?.name || '').trim();
  if (!componentName) {
    return { error: 'componentName is required for each marks entry' };
  }

  const maxMarksSource = mark.maxMarks ?? schemeComponent?.maxMarks;
  const maxMarks = Number(maxMarksSource);
  if (!Number.isFinite(maxMarks) || maxMarks < 0) {
    return { error: `Invalid maxMarks for component ${componentName}` };
  }

  const percentageSource = mark.percentage ?? mark.weightage ?? schemeComponent?.weightage ?? 0;
  const percentage = Number(percentageSource);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    return { error: `Invalid percentage for component ${componentName}` };
  }

  const isAbsent = Boolean(mark.isAbsent);
  const marksObtainedRaw = isAbsent ? 0 : mark.marksObtained;

  if (!isAbsent && (marksObtainedRaw === undefined || marksObtainedRaw === null || marksObtainedRaw === '')) {
    return { error: `marksObtained is required for component ${componentName}` };
  }

  const marksObtained = Number(marksObtainedRaw);
  if (!Number.isFinite(marksObtained) || marksObtained < 0) {
    return { error: `Invalid marksObtained for component ${componentName}` };
  }

  if (!isAbsent && marksObtained > maxMarks) {
    return {
      error: `Marks obtained (${marksObtained}) cannot exceed max marks (${maxMarks}) for ${componentName}`
    };
  }

  return {
    value: {
      componentName,
      componentId: schemeComponent?._id,
      marksObtained,
      maxMarks,
      percentage,
      isAbsent,
      isGraceApplied: Boolean(mark.isGraceApplied),
      isBestOfTwo: Boolean(mark.isBestOfTwo)
    }
  };
};

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
    console.log('[CREATE_MARKS] Request received', {
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

    const { studentId, subjectId, marks, graceMarksApplied } = req.body;

    if (!studentId || !subjectId || marks === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, subjectId, marks'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    // Verify subject exists
    const scheme = await EvaluationScheme.findById(subjectId);
    if (!scheme) {
      console.warn('[CREATE_MARKS] Evaluation scheme not found', { subjectId });
      return res.status(404).json({
        success: false,
        message: 'Evaluation scheme not found'
      });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      console.warn('[CREATE_MARKS] Student not found/invalid role', { studentId });
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Validate marks array
    if (!Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Marks array is required and cannot be empty'
      });
    }

    const normalizedMarks = [];
    const lookup = buildComponentLookup(scheme);

    // Validate each mark component
    for (const mark of marks) {
      const normalized = normalizeMarkEntry(mark, lookup);
      if (normalized.error) {
        return res.status(400).json({
          success: false,
          message: normalized.error
        });
      }

      normalizedMarks.push(normalized.value);
    }

    // Validate grace marks
    if (graceMarksApplied !== undefined && (Number(graceMarksApplied) < 0 || Number(graceMarksApplied) > 10)) {
      return res.status(400).json({
        success: false,
        message: 'Grace marks must be between 0 and 10'
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
      studentMarks.marks = normalizedMarks;
      if (graceMarksApplied !== undefined) {
        studentMarks.graceMarksApplied = Number(graceMarksApplied);
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
        marks: normalizedMarks,
        graceMarksApplied: graceMarksApplied !== undefined ? Number(graceMarksApplied) : 0,
        enteredBy: req.user._id
      });
    }

    // Calculate marks
    const calculated = await calculateMarks(studentMarks, scheme);

    studentMarks.marks = normalizedMarks;
    studentMarks.totalMarks = calculated.totalMarks;
    studentMarks.weightedMarks = calculated.weightedMarks;
    studentMarks.attendanceBonus = calculated.attendanceBonus;
    studentMarks.graceMarksApplied = calculated.graceMarksApplied;
    studentMarks.finalMarks = calculated.finalMarks;
    studentMarks.status = 'calculated';

    await studentMarks.save();

    // Create audit log (best effort)
    try {
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
    } catch (auditError) {
      console.error('[CREATE_MARKS] Audit log creation failed', {
        studentId,
        subjectId,
        error: auditError.message
      });
    }

    console.log('[CREATE_MARKS] Marks saved successfully', {
      marksId: studentMarks._id.toString(),
      studentId: studentId.toString(),
      subjectId: subjectId.toString(),
      action: oldValue ? 'UPDATE' : 'CREATE'
    });

    res.status(201).json({
      success: true,
      data: studentMarks
    });
  } catch (error) {
    console.error('[CREATE_MARKS] Unexpected error', {
      studentId: req.body?.studentId,
      subjectId: req.body?.subjectId,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack
    });

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ObjectId in request'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.length ? messages.join(', ') : 'Schema validation failed while creating marks'
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Marks already exist for this student and subject'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while creating marks'
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

    // Validate marks if provided
    if (marks !== undefined) {
      if (!Array.isArray(marks) || marks.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Marks array is required and cannot be empty'
        });
      }

      const lookup = buildComponentLookup(scheme);

      const normalizedMarks = [];
      for (const mark of marks) {
        const normalized = normalizeMarkEntry(mark, lookup);
        if (normalized.error) {
          return res.status(400).json({
            success: false,
            message: normalized.error
          });
        }

        normalizedMarks.push(normalized.value);
      }

      studentMarks.marks = normalizedMarks;
    }

    // Validate grace marks
    if (graceMarksApplied !== undefined && (graceMarksApplied < 0 || graceMarksApplied > 10)) {
      return res.status(400).json({
        success: false,
        message: 'Grace marks must be between 0 and 10'
      });
    }

    // Update fields
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
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

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
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
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

// @desc    Submit marks for approval
// @route   PUT /api/marks/submit/:id
// @access  Private (Faculty, Admin)
exports.submitMarks = async (req, res) => {
  try {
    const studentMarks = await StudentMarks.findById(req.params.id);

    if (!studentMarks) {
      return res.status(404).json({
        success: false,
        message: 'Marks record not found'
      });
    }

    if (studentMarks.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Marks are already approved'
      });
    }

    const oldValue = studentMarks.toObject();

    studentMarks.status = 'submitted';

    await studentMarks.save();

    // Create audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE',
      entityType: 'STUDENT_MARKS',
      entityId: studentMarks._id,
      oldValue,
      newValue: studentMarks.toObject(),
      description: 'Submitted marks for approval',
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
      message: 'Error submitting marks'
    });
  }
};

// @desc    Get CSV template for marks upload
// @route   GET /api/marks/template/:subjectId
// @access  Private
exports.getCSVTemplate = async (req, res) => {
  try {
    const scheme = await EvaluationScheme.findById(req.params.subjectId);

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation scheme not found'
      });
    }

    const csvContent = generateCSVTemplate(scheme);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${scheme.subjectCode}_marks_template.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error generating template'
    });
  }
};
