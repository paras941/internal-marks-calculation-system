require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const EvaluationScheme = require('../models/EvaluationScheme');
const StudentMarks = require('../models/StudentMarks');
const Attendance = require('../models/Attendance');

const DEMO_PASSWORD = 'Demo@123';
const DEMO_DEPARTMENT = 'CSE';
const DEMO_SEMESTER = 5;
const DEMO_SECTION = 'A';

const now = new Date();
const demoMonth = now.getMonth() + 1;
const demoYear = now.getFullYear();

const componentBlueprints = {
  DMO501: [
    { name: 'Attendance', maxMarks: 10, weightage: 10 },
    { name: 'Quiz', maxMarks: 20, weightage: 20 },
    { name: 'Midterm', maxMarks: 30, weightage: 30 },
    { name: 'Assignment', maxMarks: 20, weightage: 20 },
    { name: 'Internal Exam', maxMarks: 20, weightage: 20 }
  ],
  DMO502: [
    { name: 'Attendance', maxMarks: 10, weightage: 10 },
    { name: 'Quiz', maxMarks: 20, weightage: 15 },
    { name: 'Lab', maxMarks: 30, weightage: 30 },
    { name: 'Project', maxMarks: 20, weightage: 20 },
    { name: 'Internal Exam', maxMarks: 20, weightage: 25 }
  ]
};

const schemeBlueprints = [
  { subjectCode: 'DMO501', subjectName: 'Demo Software Engineering' },
  { subjectCode: 'DMO502', subjectName: 'Demo Database Systems' }
];

const userBlueprints = [
  {
    email: 'demo.admin@imcs.com',
    firstName: 'Demo',
    lastName: 'Admin',
    role: 'admin',
    department: DEMO_DEPARTMENT
  },
  {
    email: 'demo.hod@imcs.com',
    firstName: 'Demo',
    lastName: 'HOD',
    role: 'hod',
    department: DEMO_DEPARTMENT
  },
  {
    email: 'demo.faculty@imcs.com',
    firstName: 'Demo',
    lastName: 'Faculty',
    role: 'faculty',
    department: DEMO_DEPARTMENT
  },
  {
    email: 'demo.student1@imcs.com',
    firstName: 'Aarav',
    lastName: 'Sharma',
    role: 'student',
    department: DEMO_DEPARTMENT,
    semester: DEMO_SEMESTER,
    section: DEMO_SECTION,
    enrollmentNumber: 'DEMO23CSE001'
  },
  {
    email: 'demo.student2@imcs.com',
    firstName: 'Diya',
    lastName: 'Patel',
    role: 'student',
    department: DEMO_DEPARTMENT,
    semester: DEMO_SEMESTER,
    section: DEMO_SECTION,
    enrollmentNumber: 'DEMO23CSE002'
  },
  {
    email: 'demo.student3@imcs.com',
    firstName: 'Kabir',
    lastName: 'Singh',
    role: 'student',
    department: DEMO_DEPARTMENT,
    semester: DEMO_SEMESTER,
    section: DEMO_SECTION,
    enrollmentNumber: 'DEMO23CSE003'
  },
  {
    email: 'demo.student4@imcs.com',
    firstName: 'Ishita',
    lastName: 'Rao',
    role: 'student',
    department: DEMO_DEPARTMENT,
    semester: DEMO_SEMESTER,
    section: DEMO_SECTION,
    enrollmentNumber: 'DEMO23CSE004'
  },
  {
    email: 'demo.student5@imcs.com',
    firstName: 'Rohan',
    lastName: 'Verma',
    role: 'student',
    department: DEMO_DEPARTMENT,
    semester: DEMO_SEMESTER,
    section: DEMO_SECTION,
    enrollmentNumber: 'DEMO23CSE005'
  }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildStudentComponentMarks(components, seedOffset) {
  return components.map((component, index) => {
    const max = component.maxMarks;
    const raw = Math.round(max * (0.6 + ((seedOffset + index) % 4) * 0.08));
    const marksObtained = clamp(raw, 0, max);

    return {
      componentName: component.name,
      componentId: component._id,
      marksObtained,
      maxMarks: max,
      isAbsent: false,
      isGraceApplied: false,
      isBestOfTwo: false
    };
  });
}

function calculateWeightedMarks(marks, schemeComponents) {
  const byName = new Map();
  marks.forEach((m) => byName.set(m.componentName, m));

  const weighted = schemeComponents.reduce((sum, component) => {
    const entry = byName.get(component.name);
    if (!entry || entry.isAbsent || component.maxMarks <= 0) {
      return sum;
    }

    const normalized = entry.marksObtained / component.maxMarks;
    return sum + normalized * component.weightage;
  }, 0);

  return Number(weighted.toFixed(2));
}

async function upsertUser(blueprint) {
  let user = await User.findOne({ email: blueprint.email.toLowerCase() }).select('+password');

  if (!user) {
    user = new User({
      ...blueprint,
      email: blueprint.email.toLowerCase(),
      password: DEMO_PASSWORD,
      isActive: true
    });
  } else {
    user.firstName = blueprint.firstName;
    user.lastName = blueprint.lastName;
    user.role = blueprint.role;
    user.department = blueprint.department || undefined;
    user.semester = blueprint.semester || undefined;
    user.section = blueprint.section || undefined;
    user.enrollmentNumber = blueprint.enrollmentNumber || undefined;
    user.password = DEMO_PASSWORD;
    user.isActive = true;
  }

  await user.save();
  return user;
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required in backend/.env');
  }

  await connectDB();

  const createdUsers = {};
  for (const blueprint of userBlueprints) {
    const user = await upsertUser(blueprint);
    createdUsers[blueprint.email] = user;
  }

  const adminUser = createdUsers['demo.admin@imcs.com'];
  const facultyUser = createdUsers['demo.faculty@imcs.com'];
  const hodUser = createdUsers['demo.hod@imcs.com'];

  const studentUsers = Object.values(createdUsers).filter((u) => u.role === 'student');

  const schemeCodes = schemeBlueprints.map((s) => s.subjectCode);
  const existingSchemes = await EvaluationScheme.find({
    department: DEMO_DEPARTMENT,
    semester: DEMO_SEMESTER,
    subjectCode: { $in: schemeCodes }
  });

  const existingSchemeIds = existingSchemes.map((s) => s._id);

  if (existingSchemeIds.length > 0) {
    await StudentMarks.deleteMany({ subjectId: { $in: existingSchemeIds } });
    await Attendance.deleteMany({ subjectId: { $in: existingSchemeIds } });
    await EvaluationScheme.deleteMany({ _id: { $in: existingSchemeIds } });
  }

  const schemes = [];
  for (const blueprint of schemeBlueprints) {
    const scheme = await EvaluationScheme.create({
      department: DEMO_DEPARTMENT,
      semester: DEMO_SEMESTER,
      subjectCode: blueprint.subjectCode,
      subjectName: blueprint.subjectName,
      components: componentBlueprints[blueprint.subjectCode],
      graceMarks: {
        maxGraceMarks: 5,
        allowCarryOver: false
      },
      attendanceThreshold: {
        minAttendancePercentage: 75,
        marksApplicable: 5
      },
      bestOfTwoLogic: {
        enabled: false,
        exams: []
      },
      createdBy: adminUser._id,
      isActive: true
    });

    schemes.push(scheme);
  }

  facultyUser.assignedSubjects = schemes.map((s) => s._id);
  await facultyUser.save();

  hodUser.assignedSubjects = schemes.map((s) => s._id);
  await hodUser.save();

  for (const [studentIndex, student] of studentUsers.entries()) {
    for (const [schemeIndex, scheme] of schemes.entries()) {
      const marks = buildStudentComponentMarks(scheme.components, studentIndex + schemeIndex + 1);
      const totalMarks = marks.reduce((sum, entry) => sum + entry.marksObtained, 0);
      const weightedMarks = calculateWeightedMarks(marks, scheme.components);
      const attendanceBonus = studentIndex % 2 === 0 ? 2 : 1;
      const graceMarksApplied = studentIndex === 0 ? 1 : 0;
      const finalMarks = Number(clamp(weightedMarks + attendanceBonus + graceMarksApplied, 0, 100).toFixed(2));

      await StudentMarks.create({
        studentId: student._id,
        subjectId: scheme._id,
        department: DEMO_DEPARTMENT,
        semester: DEMO_SEMESTER,
        section: DEMO_SECTION,
        marks,
        totalMarks,
        weightedMarks,
        graceMarksApplied,
        attendanceBonus,
        finalMarks,
        status: 'approved',
        enteredBy: facultyUser._id,
        approvedBy: hodUser._id
      });

      const totalClasses = 32;
      const attendedClasses = clamp(24 + studentIndex + schemeIndex, 0, totalClasses);

      await Attendance.create({
        studentId: student._id,
        subjectId: scheme._id,
        totalClasses,
        attendedClasses,
        month: demoMonth,
        year: demoYear,
        markedBy: facultyUser._id
      });
    }
  }

  console.log('\nDemo data seeded successfully.\n');
  console.log(`Department/Semester: ${DEMO_DEPARTMENT} / ${DEMO_SEMESTER}`);
  console.log(`Subjects: ${schemes.map((s) => `${s.subjectCode} (${s.subjectName})`).join(', ')}`);
  console.log(`Students seeded: ${studentUsers.length}`);
  console.log('\nDemo login credentials (password is same for all):');
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log('Admin: demo.admin@imcs.com');
  console.log('HOD: demo.hod@imcs.com');
  console.log('Faculty: demo.faculty@imcs.com');
  console.log('Student: demo.student1@imcs.com');
}

run()
  .catch((error) => {
    console.error('Failed to seed demo data:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
