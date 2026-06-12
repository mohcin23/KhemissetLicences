const db = require('../db/connection');
const { logAudit } = require('../utils/auditLogger');
const { logWorkflowEvent, logStatutChange } = require('../utils/workflowLogger');
const { STATUTS } = require('../constants/workflowStatuses');
const {
  sanitizeString,
  sanitizeOptional,
  isValidCin,
  isValidDateString,
  validateMaxLength
} = require('../utils/validation');

const generateNumeroDossier = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `KH-${year}-${random}`;
};

const demandeFields = [
  'nom_complet',
  'cin',
  'date_naissance',
  'universite',
  'diplome',
  'adresse_complete',
  'date_demande',
  'date_izin',
  'numero_izin',
  'nom_massah',
  'date_massah',
  'date_lajna',
  'commune',
  'cercle',
  'notes'
];

const normalizeDemandePayload = (body) => {
  const data = {};
  for (const field of demandeFields) {
    if (field === 'notes') {
      data[field] = sanitizeOptional(body[field]);
    } else {
      data[field] = sanitizeString(body[field]) || null;
    }
  }
  if (data.cin) {
    data.cin = data.cin.toUpperCase();
  }
  return data;
};

const validateRequired = (data) => {
  const missing = ['nom_complet', 'cin', 'adresse_complete', 'commune', 'cercle']
    .filter(field => !String(data[field] || '').trim());

  return missing.length ? missing : null;
};

const findOwnedDemande = async (id, citizenUserId) => {
  const [rows] = await db.execute(
    'SELECT * FROM demandes WHERE id = ? AND citizen_user_id = ?',
    [id, citizenUserId]
  );
  return rows[0] || null;
};

exports.trackPublic = async (req, res) => {
  try {
    const numeroDossier = String(req.params.numero_dossier || '').trim();
    const [rows] = await db.execute(
      `SELECT id, numero_dossier, nom_complet, statut, date_creation,
              date_modification, motif_rejet_fichier
       FROM demandes
       WHERE numero_dossier = ?
       LIMIT 1`,
      [numeroDossier]
    );

    const demande = rows[0];
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }

    const [workflowHistory] = await db.execute(
      `SELECT ancien_statut, nouveau_statut, action, commentaire, raison_rejet, date_action
       FROM workflow_history
       WHERE demande_id = ?
       ORDER BY date_action ASC, id ASC`,
      [demande.id]
    );

    const firstName = String(demande.nom_complet || '').trim().split(/\s+/)[0] || '';

    res.json({
      success: true,
      data: {
        numero_dossier: demande.numero_dossier,
        nom_complet: firstName,
        statut: demande.statut,
        date_creation: demande.date_creation,
        date_modification: demande.date_modification,
        motif_rejet_fichier: demande.motif_rejet_fichier,
        workflow_history: workflowHistory
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createDemande = async (req, res) => {
  try {
    const data = normalizeDemandePayload(req.body);
    const missing = validateRequired(data);
    if (missing) {
      return res.status(400).json({
        success: false,
        message: `Champs obligatoires manquants: ${missing.join(', ')}`
      });
    }
    if (!isValidCin(data.cin)) {
      return res.status(400).json({ success: false, message: 'CIN invalide' });
    }
    if (!isValidDateString(data.date_naissance) || !isValidDateString(data.date_demande) || !isValidDateString(data.date_izin) || !isValidDateString(data.date_massah) || !isValidDateString(data.date_lajna)) {
      return res.status(400).json({ success: false, message: 'Date invalide' });
    }
    if (!validateMaxLength(data.nom_complet, 255)) {
      return res.status(400).json({ success: false, message: 'Nom trop long' });
    }
    if (!validateMaxLength(data.notes, 2000)) {
      return res.status(400).json({ success: false, message: 'Notes trop longues' });
    }

    let numeroDossier = generateNumeroDossier();
    let attempts = 0;
    while (attempts < 5) {
      const [existing] = await db.execute('SELECT id FROM demandes WHERE numero_dossier = ?', [numeroDossier]);
      if (!existing.length) break;
      numeroDossier = generateNumeroDossier();
      attempts += 1;
    }

    const [result] = await db.execute(
      `INSERT INTO demandes
        (numero_dossier, nom_complet, cin, date_naissance, universite, diplome,
         adresse_complete, date_demande, date_izin, numero_izin, nom_massah,
         date_massah, date_lajna, commune, cercle, notes, source, citizen_user_id, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'citizen', ?, ?)`,
      [
        numeroDossier,
        data.nom_complet,
        data.cin,
        data.date_naissance,
        data.universite,
        data.diplome,
        data.adresse_complete,
        data.date_demande,
        data.date_izin,
        data.numero_izin,
        data.nom_massah,
        data.date_massah,
        data.date_lajna,
        data.commune,
        data.cercle,
        data.notes,
        req.user.id,
        STATUTS.EN_COURS_ANALYSE
      ]
    );

    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [result.insertId]);

    await logAudit(req, {
      action: 'CITIZEN_DEMANDE_CREATE',
      entityType: 'demande',
      entityId: result.insertId,
      details: { numero_dossier: numeroDossier, nom_complet: data.nom_complet, cin: data.cin }
    });

    await logWorkflowEvent(
      result.insertId,
      'demande_deposee',
      req.user?.id || null,
      'citizen',
      null,
      { ancien_statut: null, nouveau_statut: STATUTS.EN_COURS_ANALYSE }
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMesDemandes = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.*,
              u.full_name AS agent_responsable_nom,
              u.username AS agent_responsable_username
       FROM demandes d
       LEFT JOIN users u ON u.id = d.created_by
       WHERE d.citizen_user_id = ?
       ORDER BY d.date_creation DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDemandeById = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.*,
              u.full_name AS agent_responsable_nom,
              u.username AS agent_responsable_username
       FROM demandes d
       LEFT JOIN users u ON u.id = d.created_by
       WHERE d.id = ? AND d.citizen_user_id = ?`,
      [req.params.id, req.user.id]
    );
    const demande = rows[0];
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }

    res.json({ success: true, data: demande });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateDemande = async (req, res) => {
  try {
    const demande = await findOwnedDemande(req.params.id, req.user.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }
    if (demande.statut !== STATUTS.DOCUMENTS_REJETES) {
      return res.status(400).json({
        success: false,
        message: 'Seules les demandes avec documents rejetés peuvent être corrigées par le citoyen'
      });
    }

    const data = normalizeDemandePayload(req.body);
    const missing = validateRequired(data);
    if (missing) {
      return res.status(400).json({
        success: false,
        message: `Champs obligatoires manquants: ${missing.join(', ')}`
      });
    }
    if (!isValidCin(data.cin)) {
      return res.status(400).json({ success: false, message: 'CIN invalide' });
    }
    if (!isValidDateString(data.date_naissance) || !isValidDateString(data.date_demande) || !isValidDateString(data.date_izin) || !isValidDateString(data.date_massah) || !isValidDateString(data.date_lajna)) {
      return res.status(400).json({ success: false, message: 'Date invalide' });
    }
    if (!validateMaxLength(data.nom_complet, 255)) {
      return res.status(400).json({ success: false, message: 'Nom trop long' });
    }
    if (!validateMaxLength(data.notes, 2000)) {
      return res.status(400).json({ success: false, message: 'Notes trop longues' });
    }

    const prevStatut = demande.statut;
    const [result] = await db.execute(
      `UPDATE demandes SET
        nom_complet = ?, cin = ?, date_naissance = ?, universite = ?, diplome = ?,
        adresse_complete = ?, date_demande = ?, date_izin = ?, numero_izin = ?,
        nom_massah = ?, date_massah = ?, date_lajna = ?, commune = ?, cercle = ?,
        notes = ?, statut = ?, motif_rejet_fichier = NULL
       WHERE id = ? AND citizen_user_id = ?`,
      [
        data.nom_complet,
        data.cin,
        data.date_naissance,
        data.universite,
        data.diplome,
        data.adresse_complete,
        data.date_demande,
        data.date_izin,
        data.numero_izin,
        data.nom_massah,
        data.date_massah,
        data.date_lajna,
        data.commune,
        data.cercle,
        data.notes,
        STATUTS.EN_COURS_ANALYSE,
        req.params.id,
        req.user.id
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }

    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ? AND citizen_user_id = ?', [req.params.id, req.user.id]);

    await logAudit(req, {
      action: 'CITIZEN_DEMANDE_RESUBMIT',
      entityType: 'demande',
      entityId: req.params.id,
      details: {
        numero_dossier: demande.numero_dossier,
        ancien_statut: prevStatut,
        nouveau_statut: STATUTS.EN_COURS_ANALYSE
      }
    });

    await logStatutChange(rows[0], prevStatut, {
      action: 'documents_corriges',
      utilisateur_id: req.user?.id || null,
      role_utilisateur: 'citizen',
      commentaire: 'Demande corrigée et renvoyée par le citoyen'
    });
    res.json({ success: true, message: 'Demande corrigee et renvoyee', data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Délégation pièces jointes ─────────────────────────────────────────────────
// Ces méthodes sont des proxy vers le contrôleur piecesJointesController.
// Elles s'assurent que le citoyen ne peut agir que sur ses propres dossiers.
const pjCtrl = require('./piecesJointesController');

exports.uploadPiecesJointes   = pjCtrl.uploadPiecesJointes;
exports.listPiecesJointes     = pjCtrl.listPiecesJointes;
exports.downloadPieceJointe   = pjCtrl.downloadPieceJointe;
