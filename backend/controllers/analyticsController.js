const StudentMarks = require('../models/StudentMarks');
const EvaluationScheme = require('../models/EvaluationScheme');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// @desc    Get class average
// @route   GET /api/analytics/class-average
// @access  Private (Faculty, HOD, Admin)
exports.getClassAverage = async (req, res) => {
  try {
    const { subjectId, department, semester, section } = req.query;

    let matchQuery = { status: { $ne: 'draft' } };

    if (subjectId) {
      matchQuery.subjectId = subjectId;
    }

    if (department) {
      matchQuery.department = department;
    }

    if (semester) {
      const semesterNum = parseInt(semester);
      if (!Number.isInteger(semesterNum) || semesterNum < 1 || semesterNum > 8) {
        return res.status(400).json({
          success: false,
          message: 'Semester must be an integer between 1 and 8'
        });
      }
      matchQuery.semester = semesterNum;
    }

    if (section) {
      matchQuery.section = section.toUpperCase();
    }

    const stats = await StudentMarks.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$subjectId',
          averageMarks: { $avg: '$finalMarks' },
          highestMarks: { $max: '$finalMarks' },
          lowestMarks: { $min: '$finalMarks' },
          totalStudents: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'evaluationschemes',
          localField: '_id',
          foreignField: '_id',
          as: 'subject'
        }
      },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          _id: 0,
          subjectId: '$_id',
          subjectCode: '$subject.subjectCode',
          subjectName: '$subject.subjectName',
          average: { $round: ['$averageMarks', 2] },
          highest: '$highestMarks',
          lowest: '$lowestMarks',
          studentCount: '$totalStudents'
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[ANALYTICS_CLASS_AVERAGE_ERROR]', {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching class average',
      error: error.message
    });
  }
};

// @desc    Get subject performance
// @route   GET /api/analytics/subject-performance
// @access  Private (Faculty, HOD, Admin)
exports.getSubjectPerformance = async (req, res) => {
  try {
    const { department, semester } = req.query;

    let matchQuery = { status: { $ne: 'draft' } };

    if (department) {
      matchQuery.department = department;
    }

    if (semester) {
      const semesterNum = parseInt(semester);
      if (!Number.isInteger(semesterNum) || semesterNum < 1 || semesterNum > 8) {
        return res.status(400).json({
          success: false,
          message: 'Semester must be an integer between 1 and 8'
        });
      }
      matchQuery.semester = semesterNum;
    }

    const performance = await StudentMarks.aggregate([
      { $match: matchQuery },
      {
        $bucket: {
          groupBy: '$finalMarks',
          boundaries: [0, 35, 50, 60, 70, 80, 90, 101],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            students: { $push: '$studentId' }
          }
        }
      }
    ]);

    // Format the result
    const gradeDistribution = performance.map(p => {
      let grade;
      if (p._id === 0) grade = 'Below 35 (F)';
      else if (p._id === 35) grade = '35-49 (P)';
      else if (p._id === 50) grade = '50-59 (B)';
      else if (p._id === 60) grade = '60-69 (B+)';
      else if (p._id === 70) grade = '70-79 (A)';
      else if (p._id === 80) grade = '80-89 (A+)';
      else if (p._id === 90) grade = '90-100 (O)';
      else grade = 'Other';

      return {
        grade,
        count: p.count
      };
    });

    res.status(200).json({
      success: true,
      data: gradeDistribution
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subject performance'
    });
  }
};

// @desc    Get attendance distribution
// @route   GET /api/analytics/attendance-distribution
// @access  Private (Faculty, HOD, Admin)
exports.getAttendanceDistribution = async (req, res) => {
  try {
    const { subjectId, department, semester, month, year } = req.query;

    let matchQuery = {};

    if (subjectId) {
      matchQuery.subjectId = subjectId;
    }

    if (month) {
      const monthNum = parseInt(month);
      if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          message: 'Month must be an integer between 1 and 12'
        });
      }
      matchQuery.month = monthNum;
    }

    if (year) {
      const yearNum = parseInt(year);
      if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Year must be an integer between 2000 and 2100'
        });
      }
      matchQuery.year = yearNum;
    }

    const distribution = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $bucket: {
          groupBy: '$percentage',
          boundaries: [0, 60, 75, 85, 90, 101],
          default: 'Other',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    // Format the result
    const formattedDistribution = distribution.map(d => {
      let range;
      if (d._id === 0) range = 'Below 60%';
      else if (d._id === 60) range = '60-74%';
      else if (d._id === 75) range = '75-84%';
      else if (d._id === 85) range = '85-89%';
      else if (d._id === 90) range = '90-100%';
      else range = 'Other';

      return {
        range,
        count: d.count
      };
    });

    res.status(200).json({
      success: true,
      data: formattedDistribution
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance distribution'
    });
  }
};

// @desc    Get student progress
// @route   GET /api/analytics/student-progress
// @access  Private
exports.getStudentProgress = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { studentId } = req.params;
    const { semester } = req.query;

    // If studentId provided, validate it's a valid ObjectId
    if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid studentId format'
      });
    }

    // If no studentId provided, use current user (for students)
    let targetStudentId = studentId ? new mongoose.Types.ObjectId(studentId) : req.user._id;

    // Verify access
    if (req.user.role === 'student' && targetStudentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this student progress'
      });
    }

    let matchQuery = { studentId: targetStudentId };

    if (semester) {
      matchQuery.semester = parseInt(semester);
    }

    const progress = await StudentMarks.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'evaluationschemes',
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subject'
        }
      },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          semester: 1,
          subjectCode: '$subject.subjectCode',
          subjectName: '$subject.subjectName',
          totalMarks: 1,
          weightedMarks: 1,
          finalMarks: 1,
          status: 1
        }
      },
      { $sort: { semester: 1, subjectCode: 1 } }
    ]);

    // Calculate semester-wise totals
    const semesterTotals = await StudentMarks.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$semester',
          totalFinalMarks: { $sum: '$finalMarks' },
          subjectCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        subjectWise: progress,
        semesterWise: semesterTotals
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student progress'
    });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/analytics/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const stats = {};

    const departmentScope = null;
    const isStudent = req.user.role === 'student';

    const marksMatch = {};
    const usersMatch = {};
    const schemesMatch = { isActive: true };

    if (departmentScope) {
      marksMatch.department = departmentScope;
      usersMatch.department = departmentScope;
      schemesMatch.department = departmentScope;
    }

    if (isStudent) {
      marksMatch.studentId = req.user._id;
    }

    const [
      userCounts,
      subjectCount,
      marksEntries,
      marksAverage,
      marksStatus,
      recentMarks,
      lowAttendanceCount,
      distinctMarksSubjects
    ] = await Promise.all([
      User.aggregate([
        { $match: usersMatch },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      EvaluationScheme.countDocuments(schemesMatch),
      StudentMarks.countDocuments(marksMatch),
      StudentMarks.aggregate([
        { $match: marksMatch },
        { $group: { _id: null, avgFinalMarks: { $avg: '$finalMarks' } } }
      ]),
      StudentMarks.aggregate([
        { $match: marksMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      StudentMarks.find(marksMatch)
        .populate('studentId', 'firstName lastName')
        .populate('subjectId', 'subjectCode subjectName')
        .sort({ updatedAt: -1 })
        .limit(6),
      isStudent
        ? Attendance.countDocuments({ studentId: req.user._id, percentage: { $lt: 75 } })
        : Attendance.countDocuments({ percentage: { $lt: 75 } }),
      StudentMarks.distinct('subjectId', marksMatch)
    ]);

    stats.users = userCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});
    stats.subjects = subjectCount;
    stats.marksEntries = marksEntries;
    stats.recentMarks = recentMarks;

    // Backward-compatible + normalized metrics for dashboard cards.
    stats.totalStudents = stats.users.student || 0;
    stats.totalSubjects = subjectCount;
    stats.marksEntered = marksEntries;
    stats.classAverage = marksAverage[0]?.avgFinalMarks || 0;
    stats.atRiskCount = lowAttendanceCount;

    stats.marksByStatus = marksStatus.reduce((acc, entry) => {
      acc[entry._id] = entry.count;
      return acc;
    }, { draft: 0, calculated: 0, submitted: 0, approved: 0 });

    const approved = stats.marksByStatus.approved || 0;
    stats.approvalRate = marksEntries > 0 ? Math.round((approved / marksEntries) * 100) : 0;
    stats.pendingApprovals = Math.max(marksEntries - approved, 0);

    // Student-focused summary card.
    if (isStudent) {
      const avgAttendance = await Attendance.aggregate([
        { $match: { studentId: req.user._id } },
        { $group: { _id: null, percentage: { $avg: '$percentage' } } }
      ]);

      const attendancePercent = avgAttendance[0]?.percentage || 0;
      stats.studentSummary = {
        average: Math.round(stats.classAverage * 100) / 100,
        subjects: distinctMarksSubjects.length || 0,
        attendance: Math.round(attendancePercent * 100) / 100
      };
    }

    stats.recentActivity = recentMarks.map((entry) => {
      const studentName = entry.studentId ? `${entry.studentId.firstName || 'Student'} ${entry.studentId.lastName || ''}`.trim() : 'Student';
      const subjectCode = entry.subjectId ? entry.subjectId.subjectCode || 'Subject' : 'Subject';
      return {
        description: `${studentName} • ${subjectCode} marks ${entry.status || 'updated'}`,
        timestamp: entry.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats'
    });
  }
};
