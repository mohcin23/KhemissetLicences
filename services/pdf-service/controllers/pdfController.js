const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const db = require('../db/connection');
const { logAudit } = require('../utils/auditLogger');
const { logWorkflowEvent, logStatutChange, STATUTS } = require('../utils/workflowLogger');

const canGenerateForDemande = (req, demande) => {
  return req.user?.role === 'agent';
};

const forbiddenPdf = (res) =>
  res.status(403).json({ success: false, message: 'Action PDF interdite pour ce rôle ou cette demande' });

const getLogoHtml = () => {
  const logoCandidates = [
    path.join(__dirname, '..', 'public', 'logo', 'logo.jpg'),
    path.join(__dirname, '..', 'public', 'logo.jpg'),
    path.join(__dirname, '..', 'public', 'logo', 'logo.png'),
    path.join(__dirname, '..', 'public', 'logo.png'),
  ];
  for (const logoPath of logoCandidates) {
    if (fs.existsSync(logoPath)) {
      const ext = path.extname(logoPath).replace('.', '');
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      const logoData = fs.readFileSync(logoPath).toString('base64');
      return `<img src="data:${mime};base64,${logoData}" alt="Logo" style="width:100%;height:100%;object-fit:contain;" />`;
    }
  }
  return `<div style="text-align:center;font-size:7pt;color:#999;padding:2mm;">شعار<br>العمالة</div>`;
};

const fillTemplate = (template, data) => {
  let html = template;
  Object.entries(data).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '');
  });
  return html;
};

const normalizeDecisionLang = (lang) => (String(lang || '').toLowerCase() === 'fr' ? 'fr' : 'ar');

const getTemplateForLicence = (licence_type, lang = 'ar') => {
  const type = licence_type || 'pharmacie';
  const suffix = normalizeDecisionLang(lang) === 'fr' ? '_fr' : '';
  const map = {
    pharmacie: `decision${suffix}.html`,
    cafe_restaurant: `decision_cafe${suffix}.html`,
    hopital_clinique: `decision_hopital${suffix}.html`,
    ecole_privee: `decision_ecole${suffix}.html`,
    salle_sport: `decision_salle_sport${suffix}.html`
  };
  return map[type] || `decision${suffix}.html`;
};

const getDecisionText = (statut, lang = 'fr') => {
  const statut_lower = (statut || '').toLowerCase();
  if (['accepte', 'avis_favorable', 'decision_imprimee'].includes(statut_lower)) {
    return lang === 'ar' ? 'ممنوحة' : 'Accordée';
  }
  if (['refuse', 'documents_rejetes'].includes(statut_lower)) {
    return lang === 'ar' ? 'مرفوضة' : 'Refusée';
  }
  return lang === 'ar' ? 'مشروطة' : 'Conditionnelle';
};

const getDecisionClass = (statut) => {
  const statut_lower = (statut || '').toLowerCase();
  if (['refuse', 'documents_rejetes'].includes(statut_lower)) return 'decision-refusee';
  if (['accepte', 'avis_favorable', 'decision_imprimee'].includes(statut_lower)) return 'decision-accordee';
  return 'decision-conditionnelle';
};

const getDecisionConditions = (licenceType, statut) => {
  const statut_lower = (statut || '').toLowerCase();
  if (['refuse', 'documents_rejetes'].includes(statut_lower)) {
    return 'Dossier incomplet ou non conforme aux conditions réglementaires en vigueur.';
  }
  const conditionsMap = {
    cafe_restaurant: [
      "Respect strict des normes d'hygiène et de salubrité alimentaire.",
      "Affichage obligatoire de la licence d'exploitation à l'entrée de l'établissement.",
      "Renouvellement annuel de l'attestation de conformité sanitaire.",
    ],
    hopital_clinique: [
      "Maintien du personnel médical qualifié en nombre suffisant selon la capacité autorisée.",
      "Contrôle périodique des équipements médicaux par les services compétents.",
      "Transmission trimestrielle des rapports d'activité à la direction régionale de la santé.",
    ],
    ecole_privee: [
      "Respect du programme pédagogique national approuvé par le Ministère de l'Éducation.",
      "Maintien des conditions de sécurité et d'accessibilité des locaux.",
      "Déclaration annuelle des effectifs et des enseignants à l'académie régionale.",
    ],
    salle_sport: [
      "Contrôle annuel des équipements sportifs par les services de la jeunesse et des sports.",
      "Affichage obligatoire du règlement intérieur et des consignes de sécurité.",
      "Souscription d'une assurance responsabilité civile en cours de validité.",
    ],
  };
  const lines = conditionsMap[licenceType] || ['Respect de la réglementation en vigueur.'];
  return lines.map((c) => `• ${c}`).join('\n');
};

const buildTemplateData = (demande, lang = 'ar') => {
  const licenceType = demande.licence_type || 'pharmacie';

  let extraData = {};
  try {
    extraData = demande.extra_data && typeof demande.extra_data === 'string'
      ? JSON.parse(demande.extra_data)
      : demande.extra_data || {};
  } catch (parseErr) {
    extraData = {};
  }

  const today = new Date();
  const dateSignature = today.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const numero_decision = demande.numero_izin
    || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(demande.id || '').padStart(4, '0')}`;

  const commonData = {
    nom_complet:      demande.nom_complet || '',
    cin:              demande.cin || '',
    adresse_complete: demande.adresse_complete || '',
    commune:          demande.commune || '',
    cercle:           demande.cercle || '',
    numero_decision,
    date_decision:    dateSignature,
    date_signature:   dateSignature,
    decision_text:    getDecisionText(demande.statut, 'fr'),
    decision_text_ar: getDecisionText(demande.statut, 'ar'),
    decision_class:   getDecisionClass(demande.statut),
    conditions:       getDecisionConditions(licenceType, demande.statut),
    nom_gouverneur:   demande.nom_gouverneur || 'عامل إقليم الخميسات',
  };

  let templateData;
  if (licenceType === 'pharmacie') {
    templateData = {
      ...commonData,
      ...buildDecisionVars(demande),
      ...extraData
    };
  } else {
    templateData = {
      ...commonData,
      ...extraData
    };
  }

  if (lang === 'ar') {
    const arOverrides = {};
    Object.entries(extraData).forEach(([key, value]) => {
      if (key.endsWith('_ar') && value) {
        const baseKey = key.replace(/_ar$/, '');
        if (baseKey in templateData) {
          arOverrides[baseKey] = value;
        }
      }
    });
    Object.assign(templateData, arOverrides);
  }

  return templateData;
};

const getChromePath = () => {
  const os = require('os');
  const homeDir = os.homedir();

  const candidates = [
    ...(() => {
      try {
        const cacheDir = path.join(homeDir, '.cache', 'puppeteer', 'chrome');
        if (fs.existsSync(cacheDir)) {
          const versions = fs.readdirSync(cacheDir);
          return versions.map(v => path.join(cacheDir, v, 'chrome-win64', 'chrome.exe'));
        }
      } catch {}
      return [];
    })(),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
};

const generatePdf = async (html) => {
  const chromePath = getChromePath();
  const launchOptions = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  };
  if (chromePath) {
    launchOptions.executablePath = chromePath;
  }
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  await browser.close();
  return pdfBuffer;
};

const formatDateAr = (d) => {
  if (!d) return '..............';
  const date = new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getMonthLabel = (month, year) =>
  new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

const normalizeMonthYear = (month, year) => {
  const now = new Date();
  const normalizedMonth = Math.min(12, Math.max(1, parseInt(month, 10) || now.getMonth() + 1));
  const normalizedYear = parseInt(year, 10) || now.getFullYear();
  const start = `${normalizedYear}-${String(normalizedMonth).padStart(2, '0')}-01`;
  const nextMonthDate = new Date(normalizedYear, normalizedMonth, 1);
  const end = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
  return { month: normalizedMonth, year: normalizedYear, start, end };
};

const buildDecisionVars = (d) => {
  return {
    NOM_COMPLET: d.nom_complet,
    UNIVERSITE: d.universite || '...............',
    DIPLOME: d.diplome || 'الدكتوراه في الصيدلة',
    ADRESSE_COMPLETE: d.adresse_complete,
    DATE_DEMANDE: formatDateAr(d.date_demande),
    DATE_IZIN: formatDateAr(d.date_izin),
    NUMERO_IZIN: d.numero_izin || '...............',
    NOM_MASSAH: d.nom_massah || '...............',
    DATE_MASSAH: formatDateAr(d.date_massah),
    DATE_LAJNA: formatDateAr(d.date_lajna),
  };
};

const sendDecisionPdf = async (req, res, disposition = 'attachment') => {
  try {
    const { id } = req.params;
    const lang = normalizeDecisionLang(req.query?.lang);
    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    const d = rows[0];
    if (!canGenerateForDemande(req, d)) {
      return forbiddenPdf(res);
    }

    const templateFile = getTemplateForLicence(d.licence_type || 'pharmacie', lang);
    const template = fs.readFileSync(path.join(__dirname, '..', 'templates', templateFile), 'utf8');
    const filled = fillTemplate(template, buildTemplateData(d, lang));
    const pdfBuffer = await generatePdf(filled);
    const filename = `decision_${d.numero_dossier}_${lang}.pdf`;

    try {
      await db.execute(
        'INSERT INTO documents (demande_id, type_doc, nom_fichier) VALUES (?, ?, ?)',
        [id, 'decision', filename]
      );
    } catch (docErr) {
      console.warn('Document log warning:', docErr.message);
    }

    await logAudit(req, {
      action: 'PDF_GENERATE_DECISION',
      entityType: 'demande',
      entityId: id,
      details: {
        numero_dossier: d.numero_dossier,
        lang,
        disposition,
        filename
      }
    });

    const prev = d.statut;
    const terminalPrint = [STATUTS.DECISION_IMPRIMEE, STATUTS.TRANSMIS_RESPONSABLE, STATUTS.ACCEPTE, STATUTS.REFUSE, STATUTS.ARCHIVE];
    if (!terminalPrint.includes(prev)) {
      await db.execute('UPDATE demandes SET statut = ? WHERE id = ?', [STATUTS.DECISION_IMPRIMEE, id]);
      const [updated] = await db.execute('SELECT * FROM demandes WHERE id = ?', [id]);
      await logStatutChange(updated[0], prev, {
        action: 'decision_imprimee',
        utilisateur_id: req.user?.id || null,
        role_utilisateur: req.user?.role || 'system'
      });
    } else {
      await logWorkflowEvent(
        id,
        'decision_imprimee',
        req.user?.id || null,
        req.user?.role || 'system',
        null,
        { ancien_statut: prev, nouveau_statut: prev }
      );
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateDecision = (req, res) => sendDecisionPdf(req, res, 'attachment');

exports.viewDecision = (req, res) => sendDecisionPdf(req, res, 'inline');

exports.generateBoth = async (req, res) => {
  try {
    const { id } = req.params;
    const lang = normalizeDecisionLang(req.query?.lang);
    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    const d = rows[0];
    if (!canGenerateForDemande(req, d)) {
      return forbiddenPdf(res);
    }

    const templateFile = getTemplateForLicence(d.licence_type || 'pharmacie', lang);
    const decisionTemplate = fs.readFileSync(path.join(__dirname, '..', 'templates', templateFile), 'utf8');
    const decisionPdf = await generatePdf(fillTemplate(decisionTemplate, buildTemplateData(d, lang)));

    await logAudit(req, {
      action: 'PDF_GENERATE_DECISION',
      entityType: 'demande',
      entityId: id,
      details: {
        numero_dossier: d.numero_dossier,
        lang,
        source: 'batch'
      }
    });

    res.json({
      success: true,
      decision: Buffer.from(decisionPdf).toString('base64'),
      numero_dossier: d.numero_dossier
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const LICENCE_TYPE_LABELS = {
  pharmacie: 'Pharmacie',
  cafe_restaurant: 'Café / Restaurant',
  hopital_clinique: 'Hôpital / Clinique',
  ecole_privee: 'École Privée',
  salle_sport: 'Salle de Sport'
};

exports.generateRapport = async (req, res) => {
  try {
    const [[stats]] = await db.execute(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(statut = 'accepte'), 0) as approuves,
        COALESCE(SUM(statut IN ('en_cours_analyse','documents_corriges','avis_favorable','decision_imprimee')), 0) as en_attente,
        COALESCE(SUM(statut = 'refuse'), 0) as rejetes,
        COALESCE(SUM(statut = 'documents_rejetes'), 0) as fichiers_rejetes
      FROM demandes
    `);
    const [byLicenceType] = await db.execute(`
      SELECT
        COALESCE(licence_type, 'pharmacie') as licence_type,
        COUNT(*) as total,
        COALESCE(SUM(statut = 'accepte'), 0) as approuvees,
        COALESCE(SUM(statut = 'refuse'), 0) as rejetees,
        COALESCE(SUM(statut IN ('en_cours_analyse','documents_corriges','avis_favorable','decision_imprimee')), 0) as en_attente
      FROM demandes
      GROUP BY licence_type
      ORDER BY total DESC
    `);
    const [byCommune] = await db.execute(`
      SELECT
        commune,
        cercle,
        COUNT(*) as total,
        COALESCE(SUM(statut = 'accepte'), 0) as approuvees,
        COALESCE(SUM(statut = 'refuse'), 0) as rejetees,
        COALESCE(SUM(statut IN ('en_cours_analyse','documents_corriges','avis_favorable','decision_imprimee')), 0) as en_attente
      FROM demandes
      GROUP BY commune, cercle
      ORDER BY total DESC, commune ASC
    `);
    const [agents] = await db.execute(`
      SELECT
        u.full_name,
        u.username,
        COALESCE(COUNT(DISTINCT CASE WHEN wh.nouveau_statut IN ('accepte','refuse','documents_rejetes','avis_favorable','decision_imprimee') THEN wh.demande_id END), 0) AS total_traitees,
        COALESCE(SUM(wh.nouveau_statut = 'accepte'), 0) AS approuvees,
        COALESCE(SUM(wh.nouveau_statut = 'refuse'), 0) AS rejetees,
        COALESCE(SUM(wh.nouveau_statut = 'documents_rejetes'), 0) AS fichiers_rejetes,
        MAX(wh.date_action) AS derniere_activite
      FROM users u
      LEFT JOIN workflow_history wh
        ON wh.utilisateur_id = u.id
       AND wh.role_utilisateur = 'agent'
      WHERE u.role = 'agent' AND u.is_active <> -1
      GROUP BY u.id, u.full_name, u.username
      ORDER BY total_traitees DESC, derniere_activite DESC
    `);
    const [demandes] = await db.execute(`
      SELECT numero_dossier, nom_complet, cin, commune, cercle, statut, date_creation, COALESCE(licence_type, 'pharmacie') as licence_type
      FROM demandes
      ORDER BY commune ASC, date_creation DESC
    `);

    const today = new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const taux = stats.total ? `${Math.round((Number(stats.approuves || 0) / Number(stats.total)) * 100)}%` : '0%';
    const statusLabel = {
      en_cours_analyse: 'En cours d\'analyse',
      documents_rejetes: 'Documents rejetés',
      documents_corriges: 'Documents corrigés',
      decision_imprimee: 'Décision imprimée',
      avis_favorable: 'Avis favorable',
      accepte: 'Accepté',
      refuse: 'Refusé',
      archive: 'Archivé',
      brouillon: 'Brouillon'
    };
    const licenceTypeRows = byLicenceType.length ? byLicenceType.map(item => `
      <tr>
        <td>${escapeHtml(LICENCE_TYPE_LABELS[item.licence_type] || item.licence_type)}</td>
        <td>${item.total || 0}</td>
        <td>${item.approuvees || 0}</td>
        <td>${item.rejetees || 0}</td>
        <td>${item.en_attente || 0}</td>
        <td>${item.total ? Math.round((Number(item.approuvees || 0) / Number(item.total)) * 100) : 0}%</td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="muted">Aucune donnee</td></tr>';
    const communeRows = byCommune.length ? byCommune.map(item => `
      <tr>
        <td>${escapeHtml(item.commune)}</td>
        <td>${escapeHtml(item.cercle)}</td>
        <td>${item.total || 0}</td>
        <td>${item.approuvees || 0}</td>
        <td>${item.rejetees || 0}</td>
        <td>${item.en_attente || 0}</td>
        <td>${item.total ? Math.round((Number(item.approuvees || 0) / Number(item.total)) * 100) : 0}%</td>
      </tr>
    `).join('') : '<tr><td colspan="7" class="muted">Aucune donnee</td></tr>';

    const agentRows = agents.length ? agents.map(agent => `
      <tr>
        <td>${escapeHtml(agent.full_name || '')}</td>
        <td>${escapeHtml(agent.username || '')}</td>
        <td>${agent.total_traitees || 0}</td>
        <td>${agent.approuvees || 0}</td>
        <td>${agent.rejetees || 0}</td>
        <td>${agent.fichiers_rejetes || 0}</td>
        <td>${agent.derniere_activite ? new Date(agent.derniere_activite).toLocaleString('fr-FR') : '-'}</td>
      </tr>
    `).join('') : '<tr><td colspan="7" class="muted">Aucune activite agent</td></tr>';

    const grouped = demandes.reduce((acc, demande) => {
      const key = demande.commune || 'Sans commune';
      if (!acc[key]) acc[key] = [];
      acc[key].push(demande);
      return acc;
    }, {});
    const demandesGrouped = Object.entries(grouped).map(([commune, items]) => `
      <div class="group-title">${escapeHtml(commune)} - ${items.length} demande(s)</div>
      <table>
        <thead><tr><th>N dossier</th><th>Nom</th><th>CIN</th><th>Cercle</th><th>Type</th><th>Statut</th><th>Date creation</th></tr></thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${escapeHtml(item.numero_dossier)}</td>
              <td>${escapeHtml(item.nom_complet)}</td>
              <td>${escapeHtml(item.cin)}</td>
              <td>${escapeHtml(item.cercle)}</td>
              <td>${escapeHtml(LICENCE_TYPE_LABELS[item.licence_type] || item.licence_type)}</td>
              <td>${escapeHtml(statusLabel[item.statut] || item.statut)}</td>
              <td>${formatDateAr(item.date_creation)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `).join('') || '<p class="muted">Aucune demande disponible.</p>';

    const template = fs.readFileSync(path.join(__dirname, '..', 'templates', 'rapport_complet.html'), 'utf8');
    const html = fillTemplate(template, {
      LOGO_HTML: getLogoHtml(),
      DATE_GENERATION: escapeHtml(today),
      TOTAL_DEMANDES: stats.total || 0,
      APPROUVEES: stats.approuves || 0,
      REJETEES: stats.rejetes || 0,
      EN_ATTENTE: stats.en_attente || 0,
      FICHIERS_REJETES: stats.fichiers_rejetes || 0,
      TAUX_APPROBATION: taux,
      LICENCE_TYPE_ROWS: licenceTypeRows,
      COMMUNE_ROWS: communeRows,
      AGENT_ROWS: agentRows,
      DEMANDES_GROUPED: demandesGrouped
    });

    const pdfBuffer = await generatePdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport_complet_licences_${new Date().toISOString().slice(0, 10)}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateRapportMensuel = async (req, res) => {
  try {
    const { month, year, mois, annee } = req.body || {};
    const period = normalizeMonthYear(month || mois, year || annee);
    const label = getMonthLabel(period.month, period.year);

    const [[stats]] = await db.execute(
      `SELECT COUNT(*) as total,
        SUM(statut = 'accepte') as approuves,
        SUM(statut IN ('en_cours_analyse','documents_corriges','avis_favorable','decision_imprimee')) as en_attente,
        SUM(statut = 'refuse') as rejetes
       FROM demandes
       WHERE date_creation >= ? AND date_creation < ?`,
      [period.start, period.end]
    );

    const [demandes] = await db.execute(
      `SELECT numero_dossier, nom_complet, cin, commune, statut, COALESCE(licence_type, 'pharmacie') as licence_type
       FROM demandes
       WHERE date_creation >= ? AND date_creation < ?
       ORDER BY date_creation ASC`,
      [period.start, period.end]
    );

    const [licenceTypeStats] = await db.execute(
      `SELECT
        COUNT(*) as total,
        COALESCE(SUM(statut = 'accepte'), 0) as approuves,
        COALESCE(SUM(statut IN ('en_cours_analyse','documents_corriges','avis_favorable','decision_imprimee')), 0) as en_attente,
        COALESCE(SUM(statut = 'refuse'), 0) as rejetes,
        COALESCE(licence_type, 'pharmacie') as licence_type
       FROM demandes
       WHERE date_creation >= ? AND date_creation < ?
       GROUP BY licence_type
       ORDER BY total DESC`,
      [period.start, period.end]
    );

    const safeStats = {
      total: Number(stats.total || 0),
      approuves: Number(stats.approuves || 0),
      en_attente: Number(stats.en_attente || 0),
      rejetes: Number(stats.rejetes || 0)
    };
    const maxValue = Math.max(1, safeStats.total, safeStats.approuves, safeStats.en_attente, safeStats.rejetes);
    const generatedAt = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const statusLabel = {
      en_cours_analyse: 'En cours d\'analyse',
      documents_rejetes: 'Documents rejetés',
      decision_imprimee: 'Décision imprimée',
      avis_favorable: 'Avis favorable',
      accepte: 'Accepté',
      refuse: 'Refusé',
      archive: 'Archivé',
      brouillon: 'Brouillon'
    };
    const statCards = [
      ['Total demandes', safeStats.total, '#0d1f3c'],
      ['Approuvees', safeStats.approuves, '#065f46'],
      ['En attente', safeStats.en_attente, '#b45309'],
      ['Rejetees', safeStats.rejetes, '#991b1b']
    ];
    const bars = statCards.map(([name, value, color]) => `
      <div class="bar-row">
        <span>${name}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((value / maxValue) * 100)}%;background:${color};"></div></div>
        <strong>${value}</strong>
      </div>
    `).join('');
    const licenceTypeTableRows = Array.isArray(licenceTypeStats) && licenceTypeStats.length ? licenceTypeStats.map(lt => `
      <tr>
        <td>${escapeHtml(LICENCE_TYPE_LABELS[lt.licence_type] || lt.licence_type)}</td>
        <td>${Number(lt.total || 0)}</td>
        <td>${Number(lt.approuves || 0)}</td>
        <td>${Number(lt.rejetes || 0)}</td>
        <td>${Number(lt.en_attente || 0)}</td>
        <td>${lt.total ? Math.round((Number(lt.approuves || 0) / Number(lt.total)) * 100) : 0}%</td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="empty">Aucune donnée</td></tr>';
    const tableRows = demandes.length ? demandes.map(d => `
      <tr>
        <td>${escapeHtml(d.numero_dossier)}</td>
        <td>${escapeHtml(d.nom_complet)}</td>
        <td>${escapeHtml(d.cin)}</td>
        <td>${escapeHtml(d.commune)}</td>
        <td>${escapeHtml(LICENCE_TYPE_LABELS[d.licence_type] || d.licence_type)}</td>
        <td>${escapeHtml(statusLabel[d.statut] || d.statut)}</td>
      </tr>
    `).join('') : `
      <tr><td colspan="6" class="empty">Aucune demande pour ce mois</td></tr>
    `;

    const html = `
      <!doctype html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 16mm; }
          body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; }
          .official-header { display: grid; grid-template-columns: 72px 1fr; gap: 18px; align-items: center; border-bottom: 3px solid #b8922a; padding-bottom: 14px; }
          .logo { width: 72px; height: 72px; border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; }
          .institution { text-align: center; line-height: 1.45; color: #0d1f3c; font-weight: 700; }
          .institution .sub { color: #065f46; font-size: 12px; font-weight: 600; }
          h1 { color: #064e3b; font-size: 22px; text-align: center; margin: 26px 0 20px; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
          .card { border: 1px solid #d1d5db; border-top: 4px solid #065f46; padding: 12px; text-align: center; background: #f9fafb; }
          .card strong { display: block; color: #0d1f3c; font-size: 25px; margin-bottom: 4px; }
          .card span { color: #4b5563; font-size: 11px; font-weight: 700; }
          h2 { color: #0d1f3c; font-size: 15px; margin: 22px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #d1d5db; }
          .bar-chart { border: 1px solid #e5e7eb; padding: 12px; background: #fff; margin-bottom: 18px; }
          .bar-row { display: grid; grid-template-columns: 110px 1fr 36px; gap: 10px; align-items: center; margin: 9px 0; font-size: 12px; }
          .bar-track { height: 20px; background: #edf2f7; border-radius: 3px; overflow: hidden; }
          .bar-fill { height: 100%; border-radius: 3px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #d1d5db; padding: 7px 8px; text-align: left; }
          th { background: #064e3b; color: white; }
          tr:nth-child(even) td { background: #f9fafb; }
          .empty { text-align: center; color: #6b7280; padding: 18px; }
          .footer { margin-top: 28px; display: flex; justify-content: space-between; color: #4b5563; font-size: 11px; border-top: 1px solid #d1d5db; padding-top: 12px; }
          .signature { text-align: center; min-width: 180px; color: #0d1f3c; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="official-header">
          <div class="logo">${getLogoHtml()}</div>
          <div class="institution">
            Royaume du Maroc - Ministere de l'Interieur<br>
            Prefecture de la Province de Khemisset
            <div class="sub">Système de gestion des licences d'établissements</div>
          </div>
        </div>

        <h1>Rapport Mensuel &mdash; Licences d'Établissements &mdash; ${escapeHtml(label)}</h1>

        <div class="stats">
          ${statCards.map(([name, value, color]) => `
            <div class="card" style="border-top-color:${color};"><strong>${value}</strong><span>${name}</span></div>
          `).join('')}
        </div>

        <h2>Graphique mensuel</h2>
        <div class="bar-chart">${bars}</div>

        <h2>Demandes du mois</h2>
        <table>
          <thead><tr><th>N dossier</th><th>Nom</th><th>CIN</th><th>Commune</th><th>Type</th><th>Statut</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>

        <h2>Répartition par type de licence</h2>
        <table>
          <thead><tr><th>Type</th><th>Total</th><th>Approuvées</th><th>Rejetées</th><th>En attente</th><th>Taux</th></tr></thead>
          <tbody>${licenceTypeTableRows}</tbody>
        </table>

        <div class="footer">
          <span>Date de generation : ${generatedAt}</span>
          <span class="signature">Signature et cachet</span>
        </div>
      </body>
      </html>
    `;

    const pdfBuffer = await generatePdf(html);
    const filename = `rapport_mensuel_licences_${period.year}_${String(period.month).padStart(2, '0')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
