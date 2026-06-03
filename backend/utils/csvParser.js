const csv = require('csv-parser');
const fs = require('fs');
const User = require('../models/User');
const EvaluationScheme = require('../models/EvaluationScheme');
const StudentMarks = require('../models/StudentMarks');
const { calculateMarks } = require('./calculationEngine');

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'y'].includes(String(value || '').trim().toLowerCase());
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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

          const percentage = component.weightage;

          marks.push({
            componentName: component.name,
            componentId: component._id,
            marksObtained: parsedMarks,
            maxMarks: component.maxMarks,
            percentage,
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

const processBulkUsersUpload = async (data, createdBy) => {
  const results = {
    success: [],
    errors: [],
    totalProcessed: 0
  };

  for (const row of data) {
    results.totalProcessed += 1;

    const email = String(row.email || row.Email || '').trim().toLowerCase();
    const password = String(row.password || row.Password || '').trim();
    const firstName = String(row.firstName || row.firstname || row['First Name'] || '').trim();
    const lastName = String(row.lastName || row.lastname || row['Last Name'] || '').trim();
    const role = String(row.role || row.Role || 'student').trim().toLowerCase();

    if (!email || !password || !firstName || !lastName || !role) {
      results.errors.push({ row: results.totalProcessed, error: 'Missing required user columns' });
      continue;
    }

    try {
      const userData = {
        email,
        password,
        firstName,
        lastName,
        role,
        department: String(row.department || row.Department || '').trim() || undefined,
        semester: parseNumber(row.semester || row.Semester) || undefined,
        section: String(row.section || row.Section || '').trim() || undefined,
        enrollmentNumber: String(row.enrollmentNumber || row['Enrollment Number'] || '').trim() || undefined,
        isActive: row.isActive === undefined ? true : parseBoolean(row.isActive)
      };

      let user = await User.findOne({ email });
      if (user) {
        Object.assign(user, userData);
        await user.save();
        results.success.push({ row: results.totalProcessed, email, action: 'updated' });
      } else {
        user = await User.create(userData);
        results.success.push({ row: results.totalProcessed, email, action: 'created', userId: user._id });
      }
    } catch (error) {
      results.errors.push({ row: results.totalProcessed, email, error: error.message });
    }
  }

  return results;
};

const processBulkSchemesUpload = async (data, createdBy) => {
  const results = {
    success: [],
    errors: [],
    totalProcessed: 0
  };

  for (const row of data) {
    results.totalProcessed += 1;

    const department = String(row.department || row.Department || '').trim();
    const semester = parseNumber(row.semester || row.Semester);
    const subjectCode = String(row.subjectCode || row['Subject Code'] || '').trim().toUpperCase();
    const subjectName = String(row.subjectName || row['Subject Name'] || '').trim();
    const componentsRaw = row.components || row.Components || '';

    if (!department || !semester || !subjectCode || !subjectName || !componentsRaw) {
      results.errors.push({ row: results.totalProcessed, error: 'Missing required scheme columns' });
      continue;
    }

    try {
      let components = [];

      if (typeof componentsRaw === 'string') {
        components = JSON.parse(componentsRaw);
      } else {
        components = componentsRaw;
      }

      if (!Array.isArray(components) || components.length === 0) {
        throw new Error('components must be a JSON array');
      }

      const normalizedComponents = components.map((component) => ({
        name: String(component.name || '').trim(),
        maxMarks: parseNumber(component.maxMarks),
        weightage: parseNumber(component.percentage ?? component.weightage),
        isOptional: parseBoolean(component.isOptional)
      }));

      const scheme = await EvaluationScheme.create({
        department,
        semester,
        subjectCode,
        subjectName,
        components: normalizedComponents,
        createdBy
      });

      results.success.push({ row: results.totalProcessed, subjectCode, schemeId: scheme._id });
    } catch (error) {
      results.errors.push({ row: results.totalProcessed, subjectCode, error: error.message });
    }
  }

  return results;
};

const processBulkAttendanceCsv = async (data, subjectId, month, year, markedBy) => {
  const results = {
    success: [],
    errors: [],
    totalProcessed: 0
  };

  const normalizedRecords = data.map((row) => ({
    studentId: row.studentId || row.StudentId || row.studentID || '',
    enrollmentNumber: String(row.enrollmentNumber || row['Enrollment Number'] || row.enrollment || '').trim(),
    totalClasses: row.totalClasses ?? row['Total Classes'] ?? row.total,
    attendedClasses: row.attendedClasses ?? row['Attended Classes'] ?? row.attended
  }));

  const Attendance = require('../models/Attendance');
  const UserModel = require('../models/User');

  const students = await UserModel.find({ role: 'student', isActive: { $ne: false } });
  const studentMap = new Map(students.map((student) => [student.enrollmentNumber, student]));

  for (const record of normalizedRecords) {
    results.totalProcessed += 1;
    const studentId = record.studentId || studentMap.get(record.enrollmentNumber)?._id;
    const total = parseNumber(record.totalClasses);
    const attended = parseNumber(record.attendedClasses);

    if (!studentId) {
      results.errors.push({ row: results.totalProcessed, error: 'Student not found' });
      continue;
    }

    if (!Number.isInteger(total) || !Number.isInteger(attended)) {
      results.errors.push({ row: results.totalProcessed, error: 'totalClasses and attendedClasses must be integers' });
      continue;
    }

    try {
      let attendance = await Attendance.findOne({ studentId, subjectId, month, year });

      if (attendance) {
        attendance.totalClasses = total;
        attendance.attendedClasses = attended;
        attendance.markedBy = markedBy;
        await attendance.save();
      } else {
        attendance = await Attendance.create({
          studentId,
          subjectId,
          totalClasses: total,
          attendedClasses: attended,
          month,
          year,
          markedBy
        });
      }

      results.success.push({ row: results.totalProcessed, studentId: String(studentId), attendanceId: attendance._id });
    } catch (error) {
      results.errors.push({ row: results.totalProcessed, error: error.message });
    }
  }

  return results;
};

module.exports = {
  parseCSV,
  validateCSVData,
  processBulkMarksUpload,
  generateCSVTemplate,
  processBulkUsersUpload,
  processBulkSchemesUpload,
  processBulkAttendanceCsv
};
