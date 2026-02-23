const EvaluationScheme = require('../models/EvaluationScheme');
const StudentMarks = require('../models/StudentMarks');
const Attendance = require('../models/Attendance');

/**
 * Calculate weighted marks based on evaluation scheme
 */
const calculateWeightedMarks = (marks, components) => {
  let weightedMarks = 0;
  let totalWeightage = 0;

  marks.forEach(mark => {
    const component = components.find(c => c._id.toString() === mark.componentId?.toString());
    
    if (component && !mark.isAbsent) {
      const percentage = (mark.marksObtained / mark.maxMarks) * 100;
      weightedMarks += (percentage * component.weightage) / 100;
      totalWeightage += component.weightage;
    }
  });

  return Math.round(weightedMarks * 100) / 100;
};

/**
 * Apply best-of-two logic
 */
const applyBestOfTwo = (marks, bestOfTwoConfig, components) => {
  if (!bestOfTwoConfig || !bestOfTwoConfig.enabled || !bestOfTwoConfig.exams || bestOfTwoConfig.exams.length < 2) {
    return marks;
  }

  const examMarks = marks.filter(m => bestOfTwoConfig.exams.includes(m.componentName));
  
  if (examMarks.length < 2) {
    return marks;
  }

  // Find the best exam
  let bestMark = examMarks[0];
  examMarks.forEach(mark => {
    if (mark.marksObtained > bestMark.marksObtained) {
      bestMark = mark;
    }
  });

  // Mark the best as selected and others as not best
  return marks.map(mark => {
    if (bestOfTwoConfig.exams.includes(mark.componentName)) {
      return {
        ...mark,
        isBestOfTwo: mark.marksObtained === bestMark.marksObtained
      };
    }
    return mark;
  });
};

/**
 * Calculate attendance bonus based on threshold
 */
const calculateAttendanceBonus = async (studentId, subjectId, scheme) => {
  if (!scheme.attendanceThreshold || !scheme.attendanceThreshold.minAttendancePercentage) {
    return 0;
  }

  // Get average attendance for the student in this subject
  const attendance = await Attendance.aggregate([
    {
      $match: {
        studentId: studentId,
        subjectId: subjectId
      }
    },
    {
      $group: {
        _id: null,
        avgPercentage: { $avg: '$percentage' }
      }
    }
  ]);

  const avgAttendance = attendance[0]?.avgPercentage || 0;

  if (avgAttendance >= scheme.attendanceThreshold.minAttendancePercentage) {
    return scheme.attendanceThreshold.marksApplicable || 0;
  }

  return 0;
};

/**
 * Apply grace marks
 */
const applyGraceMarks = (graceApplied, maxGrace) => {
  return Math.min(graceApplied, maxGrace);
};

/**
 * Main calculation function - calculates final marks for a student in a subject
 */
const calculateMarks = async (studentMarks, scheme) => {
  try {
    let marks = [...studentMarks.marks];
    
    // Apply best-of-two if enabled
    if (scheme.bestOfTwoLogic?.enabled) {
      marks = applyBestOfTwo(marks, scheme.bestOfTwoLogic, scheme.components);
    }

    // Calculate weighted marks
    const weightedMarks = calculateWeightedMarks(marks, scheme.components);

    // Calculate attendance bonus
    const attendanceBonus = await calculateAttendanceBonus(
      studentMarks.studentId,
      studentMarks.subjectId,
      scheme
    );

    // Apply grace marks (if any)
    const graceMarksApplied = studentMarks.graceMarksApplied || 0;
    const maxGrace = scheme.graceMarks?.maxGraceMarks || 5;
    const finalGrace = applyGraceMarks(graceMarksApplied, maxGrace);

    // Calculate final marks
    const finalMarks = Math.min(
      weightedMarks + attendanceBonus + finalGrace,
      100 // Cap at 100
    );

    return {
      totalMarks: studentMarks.totalMarks,
      weightedMarks,
      attendanceBonus,
      graceMarksApplied: finalGrace,
      finalMarks: Math.round(finalMarks * 100) / 100,
      totalWeightage: scheme.components.reduce((sum, c) => sum + c.weightage, 0)
    };
  } catch (error) {
    console.error('Error calculating marks:', error);
    throw error;
  }
};

/**
 * Recalculate all marks for a subject
 */
const recalculateAllMarks = async (subjectId) => {
  try {
    const scheme = await EvaluationScheme.findById(subjectId);
    if (!scheme) {
      throw new Error('Evaluation scheme not found');
    }

    const studentMarks = await StudentMarks.find({ subjectId });

    const results = [];
    for (const sm of studentMarks) {
      const calculated = await calculateMarks(sm, scheme);
      
      await StudentMarks.findByIdAndUpdate(sm._id, {
        weightedMarks: calculated.weightedMarks,
        attendanceBonus: calculated.attendanceBonus,
        graceMarksApplied: calculated.graceMarksApplied,
        finalMarks: calculated.finalMarks,
        status: 'calculated'
      });

      results.push({
        studentId: sm.studentId,
        ...calculated
      });
    }

    return results;
  } catch (error) {
    console.error('Error recalculating marks:', error);
    throw error;
  }
};

/**
 * Calculate class statistics
 */
const calculateClassStats = async (subjectId) => {
  try {
    const marks = await StudentMarks.find({ subjectId, status: { $ne: 'draft' } })
      .populate('studentId', 'firstName lastName enrollmentNumber');

    if (marks.length === 0) {
      return {
        totalStudents: 0,
        averageMarks: 0,
        highestMarks: 0,
        lowestMarks: 0,
        passCount: 0,
        failCount: 0,
        passPercentage: 0
      };
    }

    const finalMarks = marks.map(m => m.finalMarks);
    const average = finalMarks.reduce((a, b) => a + b, 0) / marks.length;
    const highest = Math.max(...finalMarks);
    const lowest = Math.min(...finalMarks);
    const passCount = finalMarks.filter(m => m >= 35).length;
    const failCount = marks.length - passCount;

    return {
      totalStudents: marks.length,
      averageMarks: Math.round(average * 100) / 100,
      highestMarks: highest,
      lowestMarks: lowest,
      passCount,
      failCount,
      passPercentage: Math.round((passCount / marks.length) * 100)
    };
  } catch (error) {
    console.error('Error calculating class stats:', error);
    throw error;
  }
};

module.exports = {
  calculateMarks,
  calculateWeightedMarks,
  applyBestOfTwo,
  calculateAttendanceBonus,
  applyGraceMarks,
  recalculateAllMarks,
  calculateClassStats
};
