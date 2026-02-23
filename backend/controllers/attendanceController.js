const Attendance = require('../models/Attendance');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private
exports.getAttendance = async (req, res) => {
  try {
    const { studentId, subjectId, month, year, department, semester } = req.query;

    let query = {};

    // Students can only see their own attendance
    if (req.user.role === 'student') {
      query.studentId = req.user._id;
    } else if (studentId) {
      query.studentId = studentId;
    }

    if (subjectId) {
      query.subjectId = subjectId;
    }

    if (month) {
      query.month = parseInt(month);
    }

    if (year) {
      query.year = parseInt(year);
    }

    if (department) {
      query.department = department;
    }

    if (semester) {
      query.semester = parseInt(semester);
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'firstName lastName enrollmentNumber')
      .populate('subjectId', 'subjectCode subjectName')
      .sort({ year: -1, month: -1 });

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance'
    });
  }
};

// @desc    Create attendance record
// @route   POST /api/attendance
// @access  Private (Faculty)
exports.createAttendance = async (req, res) => {
  try {
    const { studentId, subjectId, totalClasses, attendedClasses, month, year } = req.body;

    // Check if attendance already exists
    const existingAttendance = await Attendance.findOne({
      studentId,
      subjectId,
      month: parseInt(month),
      year: parseInt(year)
    });

    if (existingAttendance) {
      // Update existing
      existingAttendance.totalClasses = totalClasses;
      existingAttendance.attendedClasses = attendedClasses;
      existingAttendance.markedBy = req.user._id;
      await existingAttendance.save();

      // Create audit log
      await AuditLog.create({
        userId: req.user._id,
        action: 'UPDATE',
        entityType: 'ATTENDANCE',
        entityId: existingAttendance._id,
        description: `Updated attendance for month ${month}/${year}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(200).json({
        success: true,
        data: existingAttendance
      });
    }

    // Create new attendance
    const attendance = await Attendance.create({
      studentId,
      subjectId,
      totalClasses,
      attendedClasses,
      month: parseInt(month),
      year: parseInt(year),
      markedBy: req.user._id
    });

    // Create audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE',
      entityType: 'ATTENDANCE',
      entityId: attendance._id,
      description: `Created attendance for month ${month}/${year}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error creating attendance'
    });
  }
};

// @desc    Bulk create attendance
// @route   POST /api/attendance/bulk
// @access  Private (Faculty)
exports.bulkCreateAttendance = async (req, res) => {
  try {
    const { subjectId, month, year, records } = req.body;

    const results = {
      success: [],
      errors: []
    };

    for (const record of records) {
      try {
        const { studentId, totalClasses, attendedClasses } = record;

        // Check if attendance exists
        let attendance = await Attendance.findOne({
          studentId,
          subjectId,
          month: parseInt(month),
          year: parseInt(year)
        });

        if (attendance) {
          attendance.totalClasses = totalClasses;
          attendance.attendedClasses = attendedClasses;
          attendance.markedBy = req.user._id;
          await attendance.save();
        } else {
          attendance = await Attendance.create({
            studentId,
            subjectId,
            totalClasses,
            attendedClasses,
            month: parseInt(month),
            year: parseInt(year),
            markedBy: req.user._id
          });
        }

        results.success.push({
          studentId,
          attendanceId: attendance._id
        });
      } catch (err) {
        results.errors.push({
          studentId: record.studentId,
          error: err.message
        });
      }
    }

    // Create audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE',
      entityType: 'ATTENDANCE',
      description: `Bulk created attendance: ${results.success.length} successful`,
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
      message: 'Error creating bulk attendance'
    });
  }
};

// @desc    Get attendance summary for student
// @route   GET /api/attendance/summary/:studentId
// @access  Private
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { subjectId } = req.query;

    let matchQuery = { studentId: req.params.studentId };
    
    if (subjectId) {
      matchQuery.subjectId = subjectId;
    }

    const summary = await Attendance.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: '$subjectId',
          totalClasses: { $sum: '$totalClasses' },
          attendedClasses: { $sum: '$attendedClasses' },
          avgPercentage: { $avg: '$percentage' },
          months: { $push: { month: '$month', year: '$year', percentage: '$percentage' } }
        }
      }
    ]);

    // Populate subject details
    const Subject = require('../models/EvaluationScheme');
    const populatedSummary = await Promise.all(
      summary.map(async (s) => {
        const subject = await Subject.findById(s._id);
        return {
          subject: subject ? { _id: subject._id, subjectCode: subject.subjectCode, subjectName: subject.subjectName } : null,
          totalClasses: s.totalClasses,
          attendedClasses: s.attendedClasses,
          overallPercentage: s.totalClasses > 0 ? Math.round((s.attendedClasses / s.totalClasses) * 100) : 0,
          avgPercentage: Math.round(s.avgPercentage),
          months: s.months
        };
      })
    );

    res.status(200).json({
      success: true,
      data: populatedSummary
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance summary'
    });
  }
};
