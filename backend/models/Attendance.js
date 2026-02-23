const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
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
  totalClasses: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  attendedClasses: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for unique attendance per student per subject per month
AttendanceSchema.index({ studentId: 1, subjectId: 1, month: 1, year: 1 }, { unique: true });

// Calculate percentage before saving
AttendanceSchema.pre('save', function(next) {
  if (this.totalClasses > 0) {
    this.percentage = Math.round((this.attendedClasses / this.totalClasses) * 100);
  } else {
    this.percentage = 0;
  }
  next();
});

AttendanceSchema.set('toJSON', { virtuals: true });
AttendanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
