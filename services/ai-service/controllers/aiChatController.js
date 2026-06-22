const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

let knowledgeBase = null;

function loadKnowledgeBase() {
  if (knowledgeBase) return knowledgeBase;
  const filePath = path.join(__dirname, '..', 'licence-knowledge.md');
  knowledgeBase = fs.readFileSync(filePath, 'utf-8');
  return knowledgeBase;
}

function detectLanguage(text) {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (arabicPattern.test(text)) return 'ar';
  return 'fr';
}

async function chatWithAI(req, res) {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message requis' });
    }

    const lang = detectLanguage(message);
    const knowledge = loadKnowledgeBase();

    const systemPrompt = lang === 'ar'
      ? `أنت مساعد ذكي لعمالة الخميسات (المغرب). أنت متخصص في الرخص الإدارية والوثائق المطلوبة لفتح المؤسسات في إقليم الخميسات.

قواعد مهمة:
- أجب فقط بناءً على المعلومات الموجودة في قاعدة المعرفة أدناه
- إذا لم تجد الإجابة في قاعدة المعرفة، أخبر المواطن بأنك لا تملك هذه المعلومات ويمكنه التواصل مع العمالة مباشرة
- استخدم لغة عربية واضحة وبسيطة
- كن مفيداً ومحترماً
- لا اختلق معلومات غير موجودة في قاعدة المعرفة
- قدم إجابات مختصرة ومباشرة

قاعدة المعرفة:
${knowledge}`
      : `Tu es un assistant intelligent de la Préfecture de la Province de Khémisset (Maroc). Tu es spécialisé dans les licences administratives et les documents nécessaires pour ouvrir des établissements dans la province de Khémisset.

Règles importantes:
- Réponds uniquement en te basant sur les informations de la base de connaissances ci-dessous
- Si tu ne trouves pas la réponse dans la base de connaissances, informe le citoyen que tu n'as pas cette information et qu'il peut contacter la Préfecture directement
- Utilise un français clair et simple
- Sois utile et respectueux
- N'invente pas d'informations non présentes dans la base de connaissances
- Fournis des réponses concises et directes

Base de connaissances:
${knowledge}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({
        role: h.role,
        content: h.content
      })),
      { role: 'user', content: message.trim() }
    ];

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages,
        temperature: 0.3,
        max_tokens: 1024,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Chat] Mistral API error:', response.status, errorText);
      return res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في الاتصال بخدمة الذكاء الاصطناعي' : 'Erreur de connexion au service IA'
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const decoder = new TextDecoder();
    let buffer = '';

    const flushBuffer = () => {
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
          } else {
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) {
                res.write(`data: ${JSON.stringify({ token })}\n\n`);
              }
            } catch (e) {}
          }
        }
        buffer = '';
      }
    };

    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
            if (typeof res.flush === 'function') res.flush();
          }
        } catch (e) {}
      }
    }

    flushBuffer();
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('[AI Chat] Error:', error.message);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
    res.end();
  }
}

async function chatWithAIPlain(req, res) {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message requis' });
    }

    const lang = detectLanguage(message);
    const knowledge = loadKnowledgeBase();

    const systemPrompt = lang === 'ar'
      ? `أنت مساعد ذكي لعمالة الخميسات (المغرب). أنت متخصص في الرخص الإدارية والوثائق المطلوبة لفتح المؤسسات في إقليم UsersController.

قواعد مهمة:
- أجب فقط بناءً على المعلومات الموجودة في قاعدة المعرفة أدناه
- إذا لم تجد الإجابة في قاعدة المعرفة، أخبر المواطن بأنك لا تملك هذه المعلومات ويمكنه التواصل مع العمالة مباشرة
- استخدم لغة عربية واضحة وبسيطة
- كن مفيداً ومحترماً
- لا اختلق معلومات غير موجودة في قاعدة المعرفة
- قدم إجابات مختصرة ومباشرة

قاعدة المعرفة:
${knowledge}`
      : `Tu es un assistant intelligent de la Préfecture de la Province de Khémisset (Maroc). Tu es spécialisé dans les licences administratives et les documents nécessaires pour ouvrir des établissements dans la province de Khémisset.

Règles importantes:
- Réponds uniquement en te basant sur les informations de la base de connaissances ci-dessous
- Si tu ne trouves pas la réponse dans la base de connaissances, informe le citoyen que tu n'as pas cette information et qu'il peut contacter la Préfecture directement
- Utilise un français clair et simple
- Sois utile et respectueux
- N'invente pas d'informations non présentes dans la base de connaissances
- Fournis des réponses concises et directes

Base de connaissances:
${knowledge}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({
        role: h.role,
        content: h.content
      })),
      { role: 'user', content: message.trim() }
    ];

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages,
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Chat] Mistral API error:', response.status, errorText);
      return res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في الاتصال بخدمة الذكاء الاصطناعي' : 'Erreur de connexion au service IA'
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return res.json({
      success: true,
      reply,
      language: lang
    });

  } catch (error) {
    console.error('[AI Chat] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
}

module.exports = { chatWithAI, chatWithAIPlain };
