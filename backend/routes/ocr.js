const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

// Limite les appels OCR : coûteux (Mistral API) — 30 requêtes / 10 min par IP
const ocrLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes OCR. Réessayez dans 10 minutes.' }
});

router.use(authMiddleware);

// Ancienne route (compatibilité) — admin/agent uniquement
router.post('/analyze', ocrLimiter, checkRole(['admin', 'agent']), ocrController.analyzeImage);

// Phase 1 : extraction de texte brut — accessible aux citoyens aussi
router.post('/extract-text', ocrLimiter, checkRole(['admin', 'agent', 'citizen']), ocrController.extractText);

// Phase 2 : analyse IA → remplissage formulaire — accessible aux citoyens aussi
router.post('/analyze-texts', ocrLimiter, checkRole(['admin', 'agent', 'citizen']), ocrController.analyzeTexts);


// OCR ciblé par type de licence et de document
router.post('/parse-by-type', ocrLimiter, checkRole(['admin', 'agent', 'citizen']), ocrController.parseFieldsByType);

module.exports = router;
