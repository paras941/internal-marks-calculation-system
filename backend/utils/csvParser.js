const csv = require('csv-parser');
const fs = require('fs');
const User = require('../models/User');
const EvaluationScheme = require('../models/EvaluationScheme');
const StudentMarks = require('../models/StudentMarks');
const { calculateMarks } = require('./calculationEngine');

/**
 * Parse CSV file and validate data
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

/**
 * Validate CSV data structure
 */
const validateCSVData = (data, requiredColumns) => {
  const errors = [];
  const validRows = [];

  data.forEach((row, index) => {
    const rowErrors = [];
    const rowNumber = index + 2; // +2 because of header row and 0-index

    // Check required columns
    requiredColumns.forEach(col => {
      if (!row[col] && row[col] !== '0') {
        rowErrors.push(`Missing required column: ${col}`);
      }
    });

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, errors: rowErrors });
    } else {
      validRows.push(row);
    }
  });

  return { errors, validRows };
};

/**
 * Process bulk marks upload
 */
const processBulkMarksUpload = async (data, subjectId, enteredBy) => {
  const results = {
    success: [],
    errors: [],
    totalProcessed: 0
  };

  // Get the evaluation scheme
  const scheme = await EvaluationScheme.findById(subjectId);
  if (!scheme) {
    throw new Error('Evaluation scheme not found');
  }

  // Get all students in the department/semester/section
  const students = await User.find({
    role: 'student',
    department: scheme.department,
    semester: scheme.semester,
    section: scheme.section || undefined,
    isActive: true
  });

  const studentMap = new Map();
  students.forEach(s => {
    studentMap.set(s.enrollmentNumber, s);
  });

  for (const row of data) {
    results.totalProcessed++;
    const enrollmentNumber = row.enrollmentNumber || row.enrollment || row['Enrollment Number'];

    if (!enrollmentNumber) {
      results.errors.push({
        row: results.totalProcessed,
        enrollmentNumber: 'Unknown',
        error: 'Enrollment number not found'
      });
      continue;
    }

    const student = studentMap.get(enrollmentNumber);

    if (!student) {
      results.errors.push({
        row: results.totalProcessed,
        enrollmentNumber,
        error: 'Student not found'
      });
      continue;
    }

    try {
      // Build marks array from CSV columns
      const marks = [];
      
      for (const component of scheme.components) {
        const componentKey = component.name.toLowerCase().replace(/\s+/g, '');
        const marksValue = row[component.name] || row[componentKey] || row[component.name.toUpperCase()];

        if (marksValue !== undefined && marksValue !== '') {
          const parsedMarks = parseFloat(marksValue);
          
          if (isNaN(parsedMarks)) {
            results.errors.push({
              row: results.totalProcessed,
              enrollmentNumber,
              error: `Invalid marks for ${component.name}: ${marksValue}`
            });
            continue;
          }

          marks.push({
            componentName: component.name,
            componentId: component._id,
            marksObtained: parsedMarks,
            maxMarks: component.maxMarks,
            isAbsent: parsedMarks < 0 || row[`${component.name}_absent`]?.toLowerCase() === 'yes'
          });
        }
      }

      // Find or create student marks record
      let studentMarks = await StudentMarks.findOne({
        studentId: student._id,
        subjectId: subjectId
      });

      const oldValue = studentMarks ? studentMarks.marks : null;

      if (studentMarks) {
        studentMarks.marks = marks;
        studentMarks.enteredBy = enteredBy;
      } else {
        studentMarks = new StudentMarks({
          studentId: student._id,
          subjectId: subjectId,
          department: scheme.department,
          semester: scheme.semester,
          section: scheme.section,
          marks: marks,
          enteredBy: enteredBy
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

      results.success.push({
        row: results.totalProcessed,
        enrollmentNumber,
        studentName: `${student.firstName} ${student.lastName}`,
        finalMarks: calculated.finalMarks
      });

    } catch (error) {
      results.errors.push({
        row: results.totalProcessed,
        enrollmentNumber,
        error: error.message
      });
    }
  }

  return results;
};

/**
 * Generate CSV template for marks upload
 */
const generateCSVTemplate = (scheme) => {
  const headers = ['enrollmentNumber', 'Enrollment Number'];
  
  scheme.components.forEach(comp => {
    headers.push(comp.name);
  });

  return headers.join(',') + '\n';
};

module.exports = {
  parseCSV,
  validateCSVData,
  processBulkMarksUpload,
  generateCSVTemplate
};
