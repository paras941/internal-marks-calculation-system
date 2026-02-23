const mongoose = require('mongoose');

const MarkSchema = new mongoose.Schema({
  componentName: {
    type: String,
    required: true
  },
  componentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  marksObtained: {
    type: Number,
    default: 0,
    min: 0
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 0
  },
  isAbsent: {
    type: Boolean,
    default: false
  },
  isGraceApplied: {
    type: Boolean,
    default: false
  },
  isBestOfTwo: {
    type: Boolean,
    default: false
  }
});

const StudentMarksSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationScheme',
    required: true
  },
  department: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  section: {
    type: String,
    uppercase: true
  },
  marks: [MarkSchema],
  totalMarks: {
    type: Number,
    default: 0
  },
  weightedMarks: {
    type: Number,
    default: 0
  },
  graceMarksApplied: {
    type: Number,
    default: 0
  },
  attendanceBonus: {
    type: Number,
    default: 0
  },
  finalMarks: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'calculated', 'submitted', 'approved'],
    default: 'draft'
  },
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for unique marks record per student per subject
StudentMarksSchema.index({ studentId: 1, subjectId: 1 }, { unique: true });

// Calculate marks before saving
StudentMarksSchema.pre('save', async function(next) {
  if (this.marks && this.marks.length > 0) {
    // Calculate total marks (sum of all obtained marks)
    this.totalMarks = this.marks.reduce((sum, mark) => {
      return mark.isAbsent ? sum : sum + mark.marksObtained;
    }, 0);
  }
  next();
});

StudentMarksSchema.set('toJSON', { virtuals: true });
StudentMarksSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('StudentMarks', StudentMarksSchema);
