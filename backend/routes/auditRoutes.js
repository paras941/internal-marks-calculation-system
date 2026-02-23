const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { getAuditLogs, exportAuditLogs, getEntityAuditLogs } = require('../controllers/auditController');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getAuditLogs);
router.get('/export', exportAuditLogs);
router.get('/entity/:entityType/:entityId', getEntityAuditLogs);

module.exports = router;
