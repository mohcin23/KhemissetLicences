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
        max_tokens: 4000,
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

    const hasCustomPrompts = validTexts.some(t => t.prompt && t.prompt.trim().length > 0);

    const { expected_fields } = req.body;

    let prompt;
    if (hasCustomPrompts) {
      const docInstructions = validTexts
        .filter(t => t.prompt && t.prompt.trim().length > 0)
        .map((t, i) => `=== DOCUMENT ${i + 1} : ${t.name || 'Sans nom'} ===\nPROMPT: ${t.prompt}`)
        .join('\n\n');

      const docsSection = validTexts
        .map((t, i) => `=== DOCUMENT ${i + 1} : ${t.name || 'Sans nom'} ===\n${t.text}`)
        .join('\n\n');

      // Build dynamic JSON template from expected_fields if provided
      let JSON_TEMPLATE;
      if (expected_fields && Array.isArray(expected_fields) && expected_fields.length > 0) {
        const sampleValues = {
          nom: '"Dupont"', prenom: '"Jean"',
          nom_ar: '"\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u064a"', prenom_ar: '"\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0634\u062e\u0635\u064a"',
          nom_complet: '"Jean Dupont"', nom_complet_ar: '"\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629"',
          cin: '"BE123456"', date_naissance: '"1990-01-15"',
          adresse: '"123 rue de la libert\u00e9"', adresse_ar: '"\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629"',
          commune: '"Rabat"', commune_ar: '"\u0627\u0644\u062c\u0645\u0627\u0639\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629"',
          cercle: '"Rabat"', cercle_ar: '"\u0627\u0644\u062f\u0627\u0626\u0631\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629"',
          specialite: '"Pharmacie"', specialite_ar: '"\u0627\u0644\u062a\u062e\u0635\u0635 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629"',
          universite: '"Universit\u00e9 Mohammed V"', universite_ar: '"\u0627\u0644\u062c\u0627\u0645\u0639\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629"',
          annee: '"2015"',
          diplome: '"Doctorat en pharmacie"', diplome_ar: '"\u0627\u0644\u0634\u0647\u0627\u062f\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629"',
          adresse_local: '"123 avenue"', adresse_local_ar: '"\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629"',
          superficie: '"150"',
          nom_proprietaire: '"Jean Dupont"', nom_proprietaire_ar: '"\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629"',
          numero_autorisation: '"A12345"', date_autorisation: '"2023-01-01"',
          numero_permis: '"P12345"', date_permis: '"2023-01-01"',
          notes: '"autres informations"'
        };
        const fields = expected_fields
          .filter(f => sampleValues[f])
          .map(f => `  "${f}": ${sampleValues[f]}`)
          .join(',\n');
        JSON_TEMPLATE = `{\n${fields}\n}`;
      } else {
        // Static comprehensive template as fallback
        JSON_TEMPLATE = `{\n  "nom": "Dupont",\n  "prenom": "Jean",\n  "nom_ar": "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u064a",\n  "prenom_ar": "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0634\u062e\u0635\u064a",\n  "nom_complet": "Jean Dupont",\n  "nom_complet_ar": "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629",\n  "cin": "BE123456",\n  "date_naissance": "1990-01-15",\n  "adresse": "123 rue de la libert\u00e9",\n  "adresse_ar": "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629",\n  "commune": "Rabat",\n  "commune_ar": "\u0627\u0644\u062c\u0645\u0627\u0639\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629",\n  "cercle": "Rabat",\n  "cercle_ar": "\u0627\u0644\u062f\u0627\u0626\u0631\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629",\n  "specialite": "Pharmacie",\n  "specialite_ar": "\u0627\u0644\u062a\u062e\u0635\u0635 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629",\n  "universite": "Universit\u00e9 Mohammed V",\n  "universite_ar": "\u0627\u0644\u062c\u0627\u0645\u0639\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629",\n  "annee": "2015",\n  "diplome": "Doctorat en pharmacie",\n  "diplome_ar": "\u0627\u0644\u0634\u0647\u0627\u062f\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629",\n  "adresse_local": "123 avenue",\n  "adresse_local_ar": "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629",\n  "superficie": "150",\n  "nom_proprietaire": "Jean Dupont",\n  "nom_proprietaire_ar": "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629",\n  "numero_autorisation": "A12345",\n  "date_autorisation": "2023-01-01",\n  "numero_permis": "P12345",\n  "date_permis": "2023-01-01",\n  "notes": "autres informations"\n}`;
      }

      prompt = `Tu es un expert en traitement de documents administratifs marocains.
Tu reçois les textes extraits de ${validTexts.length} document(s) officiel(s).
Analyse TOUS ces textes et extrais les informations demandées.

TEXTES EXTRAITS :
${docsSection}

INSTRUCTIONS PAR DOCUMENT :
${docInstructions}

INSTRUCTIONS GÉNÉRALES :
1. Lis attentivement TOUS les textes
2. Pour chaque document, suis le PROMPT associé
3. Les documents marocains contiennent du texte en français ET en arabe
4. Extrais les données dans les DEUX langues quand disponibles (français ET arabe)
5. Si une information apparaît dans plusieurs documents, prends la plus complète
6. Ne jamais inventer : si non trouvée, laisse le champ à ""
7. CIN marocaine : code alphanumérique type BE123456, U1234567, AB12345
8. Dates : format obligatoire YYYY-MM-DD uniquement
9. Pour les champs arabes, extrais UNIQUEMENT la valeur sans le label/préfixe. Ex: si le texte montre "الدائرة : الخميسات" ou "Commune : الخميسات", retourne "الخميسات" et non "الدائرة : الخميسات".

Structure JSON attendue (remplis les champs que tu trouves, laisse les autres vides) :
${JSON_TEMPLATE}

Retourne UNIQUEMENT ce JSON valide (pas de markdown, pas de texte avant/après) avec les champs que tu as pu extraire.`;
    } else {
      const docsSection = validTexts
        .map((t, i) => `=== DOCUMENT ${i + 1} : ${t.name || 'Sans nom'} ===\n${t.text}`)
        .join('\n\n');

      prompt = `Tu es un expert en traitement de documents administratifs marocains (pharmacies, permis d'exercice).
Tu reçois les textes extraits de ${validTexts.length} document(s) officiel(s).
Analyse TOUS ces textes et remplis le formulaire de demande de permis de pharmacie.

TEXTES EXTRAITS :
${docsSection}

INSTRUCTIONS :
1. Lis attentivement TOUS les textes
2. Cherche chaque information dans TOUS les documents
3. Les documents marocains contiennent du texte en français ET en arabe
4. Extrais les données dans les deux langues quand disponibles (nom, prenom, adresse...)
5. Si une information apparaît dans plusieurs documents, prends la plus complète
6. Ne jamais inventer : si non trouvée, laisse le champ à ""
7. CIN marocaine : code alphanumérique type BE123456, U1234567, AB12345
8. Dates : format obligatoire YYYY-MM-DD uniquement
9. Pour les champs arabes, extrais UNIQUEMENT la valeur sans le label/préfixe. Ex: si le texte montre "الدائرة : الخميسات", retourne "الخميسات".

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de texte avant/après) :
{
  "nom_complet": "prénom et nom complet",
  "nom_complet_ar": "الاسم الكامل بالعربية (valeur uniquement)",
  "cin": "numéro CIN (lettres majuscules + chiffres)",
  "date_naissance": "YYYY-MM-DD ou vide",
  "universite": "nom de l'université ou établissement",
  "universite_ar": "اسم الجامعة بالعربية (valeur uniquement)",
  "diplome": "intitulé exact du diplôme",
  "diplome_ar": "الشهادة بالعربية (valeur uniquement)",
  "adresse_complete": "adresse complète",
  "adresse_complete_ar": "العنوان الكامل بالعربية (valeur uniquement, sans 'العنوان : ')",
  "commune": "commune",
  "commune_ar": "الجماعة بالعربية (valeur uniquement, sans 'الجماعة : ')",
  "cercle": "cercle ou province",
  "cercle_ar": "الدائرة بالعربية (valeur uniquement, sans 'الدائرة : ')",
  "date_demande": "YYYY-MM-DD ou vide",
  "date_izin": "YYYY-MM-DD ou vide",
  "numero_izin": "numéro du permis d'exercice",
  "nom_massah": "nom du géomètre topographe",
  "date_massah": "YYYY-MM-DD ou vide",
  "date_lajna": "YYYY-MM-DD ou vide",
  "notes": "autres informations utiles",
  "confidence": "high / medium / low"
}`;
    }

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
