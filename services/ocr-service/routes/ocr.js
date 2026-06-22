const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Ancienne route (compatibilité) — admin/agent uniquement
router.post('/analyze', checkRole(['admin', 'agent']), ocrController.analyzeImage);

// Phase 1 : extraction de texte brut — accessible aux citoyens aussi
router.post('/extract-text', checkRole(['admin', 'agent', 'citizen']), ocrController.extractText);

// Phase 2 : analyse IA → remplissage formulaire — accessible aux citoyens aussi
router.post('/analyze-texts', checkRole(['admin', 'agent', 'citizen']), ocrController.analyzeTexts);

// OCR ciblé par type de licence et de document
router.post('/parse-by-type', checkRole(['admin', 'agent', 'citizen']), ocrController.parseFieldsByType);

module.exports = router;
