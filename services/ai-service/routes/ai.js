const express = require('express');
const router = express.Router();
const { chatWithAI, chatWithAIPlain } = require('../controllers/aiChatController');

router.post('/chat', chatWithAIPlain);
router.post('/chat/stream', chatWithAI);

module.exports = router;
