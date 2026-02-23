const mongoose = require('mongoose');

const ComponentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please specify component name'],
    enum: ['Attendance', 'Quiz', 'Midterm', 'Assignment', 'Lab', 'Internal Exam', 'Project']
  },
  maxMarks: {
    type: Number,
    required: [true, 'Please specify maximum marks'],
    min: 0
  },
  weightage: {
    type: Number,
    required: [true, 'Please specify weightage'],
    min: 0,
    max: 100
  },
  isOptional: {
    type: Boolean,
    default: false
  }
});

const GraceMarksSchema = new mongoose.Schema({
  maxGraceMarks: {
    type: Number,
    default: 5,
    min: 0
  },
  allowCarryOver: {
    type: Boolean,
    default: false
  }
});

const AttendanceThresholdSchema = new mongoose.Schema({
  minAttendancePercentage: {
    type: Number,
    default: 75,
    min: 0,
    max: 100
  },
  marksApplicable: {
    type: Number,
    default: 5,
    min: 0
  }
});

const BestOfTwoSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false
  },
  exams: [{
    type: String
  }]
});

const EvaluationSchemeSchema = new mongoose.Schema({
  department: {
    type: String,
    required: [true, 'Please specify department'],
    trim: true
  },
  semester: {
    type: Number,
    required: [true, 'Please specify semester'],
    min: 1,
    max: 8
  },
  subjectCode: {
    type: String,
    required: [true, 'Please specify subject code'],
    uppercase: true,
    trim: true
  },
  subjectName: {
    type: String,
    required: [true, 'Please specify subject name'],
    trim: true
  },
  components: [ComponentSchema],
  graceMarks: {
    type: GraceMarksSchema,
    default: () => ({})
  },
  attendanceThreshold: {
    type: AttendanceThresholdSchema,
    default: () => ({})
  },
  bestOfTwoLogic: {
    type: BestOfTwoSchema,
    default: () => ({})
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for unique subject per semester per department
EvaluationSchemeSchema.index({ department: 1, semester: 1, subjectCode: 1 }, { unique: true });

// Calculate total weightage
EvaluationSchemeSchema.virtual('totalWeightage').get(function() {
  return this.components.reduce((sum, comp) => sum + comp.weightage, 0);
});

EvaluationSchemeSchema.set('toJSON', { virtuals: true });
EvaluationSchemeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EvaluationScheme', EvaluationSchemeSchema);
