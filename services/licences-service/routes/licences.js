'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { LICENCE_CONFIGS } = require('../constants/licenceConfig');

router.use(authMiddleware);

function sanitizeConfig(config) {
  const result = {};
  for (const [type, conf] of Object.entries(config)) {
    result[type] = {
      label_fr: conf.label_fr,
      label_ar: conf.label_ar,
      documents: conf.documents.map(({ ocr_prompt, ...rest }) => rest),
      form_sections: conf.form_sections
    };
  }
  return result;
}

router.get('/config', (req, res) => {
  try {
    res.json({ success: true, data: sanitizeConfig(LICENCE_CONFIGS) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

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

    const { ocr_prompt, ...rest } = conf;
    const sanitized = {
      label_fr: conf.label_fr,
      label_ar: conf.label_ar,
      documents: conf.documents.map(({ ocr_prompt: _p, ...d }) => d),
      form_sections: conf.form_sections
    };

    res.json({ success: true, data: sanitized });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
