'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { LICENCE_CONFIGS } = require('../constants/licenceConfig');

router.use(authMiddleware);

/**
 * Retourne une version "publique" de la config (sans les ocr_prompt).
 * Les prompts sont des détails d'implémentation internes — pas besoin
 * de les exposer au frontend.
 */
function sanitizeConfig(config) {
  const result = {};
  for (const [type, conf] of Object.entries(config)) {
    result[type] = {
      label_fr: conf.label_fr,
      label_ar: conf.label_ar,
      documents: conf.documents.map(({ ocr_prompt, ...rest }) => rest), // eslint-disable-line no-unused-vars
      form_sections: conf.form_sections
    };
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/licences/config
// Retourne la configuration complète des 5 types de licences (sans les prompts)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/config', (req, res) => {
  try {
    res.json({ success: true, data: sanitizeConfig(LICENCE_CONFIGS) });
  } catch (err) {
    console.error('GET /api/licences/config error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/licences/config/:type
// Retourne la configuration d'un seul type de licence
// ─────────────────────────────────────────────────────────────────────────────
router.get('/config/:type', (req, res) => {
  try {
    const { type } = req.params;
    const conf = LICENCE_CONFIGS[type];

    if (!conf) {
      return res.status(404).json({
        success: false,
        message: `Type de licence inconnu : ${type}`,
        available: Object.keys(LICENCE_CONFIGS)
      });
    }

    // Retire les ocr_prompt avant d'envoyer
    const { ocr_prompt, ...rest } = conf; // eslint-disable-line no-unused-vars
    const sanitized = {
      label_fr: conf.label_fr,
      label_ar: conf.label_ar,
      documents: conf.documents.map(({ ocr_prompt: _p, ...d }) => d), // eslint-disable-line no-unused-vars
      form_sections: conf.form_sections
    };

    res.json({ success: true, data: sanitized });
  } catch (err) {
    console.error(`GET /api/licences/config/:type error:`, err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
