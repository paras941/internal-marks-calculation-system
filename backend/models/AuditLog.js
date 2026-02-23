const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'UPLOAD', 'DOWNLOAD']
  },
  entityType: {
    type: String,
    required: true,
    enum: ['USER', 'EVALUATION_SCHEME', 'STUDENT_MARKS', 'ATTENDANCE', 'AUTH', 'SYSTEM']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },
  description: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false }
});

// Index for efficient querying
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
