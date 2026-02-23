const AuditLog = require('../models/AuditLog');
const { generateAuditLogsPDF } = require('../utils/pdfGenerator');

// @desc    Get audit logs
// @route   GET /api/audit-logs
// @access  Private (Admin)
exports.getAuditLogs = async (req, res) => {
  try {
    const { action, entityType, userId, startDate, endDate, page = 1, limit = 50 } = req.query;

    let query = {};

    if (action) {
      query.action = action;
    }

    if (entityType) {
      query.entityType = entityType;
    }

    if (userId) {
      query.userId = userId;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await AuditLog.find(query)
      .populate('userId', 'firstName lastName email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs'
    });
  }
};

// @desc    Export audit logs as PDF
// @route   GET /api/audit-logs/export
// @access  Private (Admin)
exports.exportAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {};

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .limit(100);

    await generateAuditLogsPDF(logs, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error exporting audit logs'
    });
  }
};

// @desc    Get audit logs for specific entity
// @route   GET /api/audit-logs/entity/:entityType/:entityId
// @access  Private (Admin)
exports.getEntityAuditLogs = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = await AuditLog.find({
      entityType,
      entityId
    })
      .populate('userId', 'firstName lastName email')
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching entity audit logs'
    });
  }
};
