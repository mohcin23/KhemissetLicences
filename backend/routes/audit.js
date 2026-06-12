const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auditController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.post('/export-excel', checkRole(['admin', 'agent', 'lecteur']), ctrl.logExcelExport);
router.get('/export-csv', checkRole(['admin']), ctrl.exportAuditCSV); // PHASE 4 FINAL
router.get('/filters', checkRole(['admin']), ctrl.getAuditFilters);
router.get('/', checkRole(['admin']), ctrl.getAuditLogs);

module.exports = router;
