const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/validate');
const { getAuditLogs, exportAuditLogs, getEntityAuditLogs } = require('../controllers/auditController');

router.use(protect);
router.use(authorize('admin', 'hod'));

router.get('/', asyncHandler(getAuditLogs));
router.get('/export', asyncHandler(exportAuditLogs));
router.get('/entity/:entityType/:entityId', asyncHandler(getEntityAuditLogs));

module.exports = router;
