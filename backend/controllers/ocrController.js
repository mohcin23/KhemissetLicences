// Utilise le fetch natif de Node 18+ ou node-fetch comme fallback
const fetch = globalThis.fetch
  ? (...args) => globalThis.fetch(...args)
  : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

// ─── Retry avec backoff exponentiel pour les erreurs 429 ───────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status !== 429) return response;

    if (attempt === maxRetries) return response;

    const retryAfter = response.headers?.get?.('retry-after');
    const waitMs = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : Math.min(5000 * Math.pow(2, attempt), 60000); // 5s, 10s, 20s, max 60s

    console.log(`Mistral 429 — attente ${waitMs / 1000}s avant tentative ${attempt + 2}/${maxRetries + 1}...`);
    await sleep(waitMs);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 : Extraction de texte brut depuis une image (OCR pur)
// ─────────────────────────────────────────────────────────────────────────────
const TEXT_EXTRACTION_PROMPT = `Tu es un outil OCR professionnel.
Ta seule mission : lire cette image de document et transcrire TOUT le texte visible, mot par mot, ligne par ligne.

Règles strictes :
- Transcris EXACTEMENT ce qui est écrit, sans correction ni interprétation
- Garde la structure du document (lignes, blocs de texte)
- Inclus le texte arabe ET le texte français/latin tel quel
- Ne résume pas, ne traduis pas, ne reformule pas
- Si un texte est illisible, écris [illisible]
- Ne produis AUCUN commentaire ni explication
- Retourne UNIQUEMENT le texte brut transcrit`;

exports.extractText = async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ success: false, message: 'Image requise' });

    const mediaType = mimeType || 'image/jpeg';

    const response = await fetchWithRetry(MISTRAL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_API_KEY}` },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: TEXT_EXTRACTION_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${image}` } }
          ]
        }],
        max_tokens: 2000,
        temperature: 0.0
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('Mistral API error (extractText):', JSON.stringify(errData));
      throw new Error(errData.error?.message || `Erreur Mistral: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content.trim();
    res.json({ success: true, text });

  } catch (err) {
    console.error('OCR extractText Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 : Analyse de tous les textes extraits → remplissage du formulaire
// ─────────────────────────────────────────────────────────────────────────────
exports.analyzeTexts = async (req, res) => {
  try {
    const { texts } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ success: false, message: 'Textes requis (tableau non vide)' });
    }

    const validTexts = texts.filter(t => t && t.text && t.text.trim().length > 0);
    if (validTexts.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun texte valide fourni' });
    }

    const docsSection = validTexts
      .map((t, i) => `=== DOCUMENT ${i + 1} : ${t.name || 'Sans nom'} ===\n${t.text}`)
      .join('\n\n');

    const prompt = `Tu es un expert en traitement de documents administratifs marocains (pharmacies, permis d'exercice).
Tu reçois les textes extraits de ${validTexts.length} document(s) officiel(s).
Analyse TOUS ces textes et remplis le formulaire de demande de permis de pharmacie.

TEXTES EXTRAITS :
${docsSection}

INSTRUCTIONS :
1. Lis attentivement TOUS les textes
2. Cherche chaque information dans TOUS les documents
3. Si une information apparaît dans plusieurs documents, prends la plus complète
4. Ne jamais inventer : si non trouvée, laisse le champ à ""
5. CIN marocaine : code alphanumérique type BE123456, U1234567, AB12345
6. Dates : format obligatoire YYYY-MM-DD uniquement

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de texte avant/après) :
{
  "nom_complet": "prénom et nom complet",
  "cin": "numéro CIN (lettres majuscules + chiffres)",
  "date_naissance": "YYYY-MM-DD ou vide",
  "universite": "nom de l'université ou établissement",
  "diplome": "intitulé exact du diplôme",
  "adresse_complete": "adresse complète de la pharmacie",
  "commune": "commune",
  "cercle": "cercle ou province",
  "date_demande": "YYYY-MM-DD ou vide",
  "date_izin": "YYYY-MM-DD ou vide",
  "numero_izin": "numéro du permis d'exercice",
  "nom_massah": "nom du géomètre topographe",
  "date_massah": "YYYY-MM-DD ou vide",
  "date_lajna": "YYYY-MM-DD ou vide",
  "notes": "autres informations utiles",
  "confidence": "high / medium / low"
}`;

    const response = await fetchWithRetry(MISTRAL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_API_KEY}` },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Erreur Mistral: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    let extracted = {};
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleaned);
    } catch {
      return res.json({ success: true, extracted: {}, raw: content, parseError: true });
    }

    res.json({ success: true, extracted, raw: content });

  } catch (err) {
    console.error('OCR analyzeTexts Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// NOUVEAU : parseFieldsByType — OCR ciblé par type de licence et de document
// ─────────────────────────────────────────────────────────────────────────────
const { LICENCE_CONFIGS } = require('../constants/licenceConfig');

/**
 * POST /api/ocr/parse-by-type
 * Body : { image, mimeType, licence_type, doc_type }
 *
 * Récupère le prompt OCR configuré pour (licence_type, doc_type) dans
 * licenceConfig.js, appelle Mistral Pixtral, et retourne un JSON structuré
 * avec les champs définis dans ocr_fields du document.
 */
exports.parseFieldsByType = async (req, res) => {
  try {
    const { image, mimeType, licence_type, doc_type } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: 'Image requise' });
    }
    if (!licence_type) {
      return res.status(400).json({ success: false, message: 'licence_type requis' });
    }
    if (!doc_type) {
      return res.status(400).json({ success: false, message: 'doc_type requis' });
    }

    // Récupération de la configuration du type de licence
    const licenceConf = LICENCE_CONFIGS[licence_type];
    if (!licenceConf) {
      return res.status(404).json({
        success: false,
        message: `Type de licence inconnu : ${licence_type}`
      });
    }

    // Récupération de la configuration du document
    const docConf = licenceConf.documents.find(d => d.key === doc_type);
    if (!docConf) {
      return res.status(404).json({
        success: false,
        message: `Type de document inconnu : ${doc_type} pour la licence ${licence_type}`
      });
    }

    // Vérification que le document supporte l'OCR
    if (!docConf.ocr || !docConf.ocr_prompt) {
      return res.status(400).json({
        success: false,
        message: `Le document "${doc_type}" ne supporte pas l'OCR pour la licence "${licence_type}"`
      });
    }

    const mediaType = mimeType || 'image/jpeg';

    const response = await fetchWithRetry(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: docConf.ocr_prompt },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${image}` } }
          ]
        }],
        max_tokens: 1000,
        temperature: 0.0
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('Mistral API error (parseFieldsByType):', JSON.stringify(errData));
      throw new Error(errData.error?.message || `Erreur Mistral: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    let extracted = {};
    let parseError = false;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleaned);
    } catch {
      parseError = true;
    }

    res.json({
      success: true,
      licence_type,
      doc_type,
      ocr_fields: docConf.ocr_fields || [],
      extracted,
      raw: content,
      ...(parseError && { parseError: true })
    });

  } catch (err) {
    console.error('OCR parseFieldsByType Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ANCIENNE ROUTE (compatibilité) : analyse image directe → JSON
// ─────────────────────────────────────────────────────────────────────────────
exports.analyzeImage = async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ success: false, message: 'Image requise' });

    const mediaType = mimeType || 'image/jpeg';

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_API_KEY}` },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Extrais toutes les données de ce document administratif marocain. Retourne UNIQUEMENT un JSON valide avec les champs: nom_complet, cin, date_naissance, universite, diplome, adresse_complete, commune, cercle, date_demande, date_izin, numero_izin, nom_massah, date_massah, date_lajna, notes, confidence, raw_text_ar, raw_text_fr. Champ vide = "". Dates en YYYY-MM-DD.' },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${image}` } }
          ]
        }],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Erreur Mistral: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    let extracted = {};
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleaned);
    } catch {
      return res.json({ success: true, extracted: {}, raw: content, parseError: true });
    }
    res.json({ success: true, extracted, raw: content });
  } catch (err) {
    console.error('OCR Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
