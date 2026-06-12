const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pdfController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/decision/:id', checkRole(['admin', 'agent']), ctrl.generateDecision);
router.get('/decision/:id/view', checkRole(['admin', 'agent']), ctrl.viewDecision);
router.get('/both/:id', checkRole(['admin', 'agent']), ctrl.generateBoth);
router.post('/rapport-mensuel', checkRole(['admin']), ctrl.generateRapportMensuel);
router.post('/rapport', checkRole(['admin']), ctrl.generateRapport);

module.exports = router;
