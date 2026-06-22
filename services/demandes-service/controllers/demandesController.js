const db = require('../db/connection');
const { logAudit } = require('../utils/auditLogger');
const { logWorkflowEvent, logStatutChange } = require('../utils/workflowLogger');
const { STATUTS, estTransitionPermise, normalizeStatut } = require('../constants/workflowStatuses');
const { sanitizeString, sanitizeOptional, isValidCin, isValidDateString, validateMaxLength } = require('../utils/validation');

const generateNumeroDossier = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `KH-${year}-${random}`;
};

const generateUniqueNumeroDossier = async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateNumeroDossier();
    const [existing] = await db.execute('SELECT id FROM demandes WHERE numero_dossier = ?', [candidate]);
    if (!existing.length) return candidate;
  }
  throw new Error('Impossible de générer un numéro de dossier unique');
};

const getDemandeForAccess = async (id) => {
  const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [id]);
  return rows[0] || null;
};

const canAccessDemande = (req) => ['admin', 'agent'].includes(req.user?.role);
const canMutateDemande = (req) => req.user?.role === 'agent';

exports.getDemandes = async (req, res) => {
  try {
    const { search, statut, commune, cercle, page = 1, limit = 20, sort_by = 'date_creation', sort_dir = 'desc' } = req.query;
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;
    let whereClause = "WHERE d.statut != 'annule'";
    const params = [];

    if (search) {
      whereClause += ' AND (d.nom_complet LIKE ? OR d.cin LIKE ? OR d.numero_dossier LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (statut) {
      const statuts = String(statut).split(',').map(s => normalizeStatut(s.trim())).filter(Boolean);
      if (statuts.length === 1) { whereClause += ' AND d.statut = ?'; params.push(statuts[0]); }
      else if (statuts.length > 1) { whereClause += ` AND d.statut IN (${statuts.map(() => '?').join(',')})`; params.push(...statuts); }
    }
    if (commune) { whereClause += ' AND d.commune LIKE ?'; params.push(`%${commune}%`); }
    if (cercle) { whereClause += ' AND d.cercle LIKE ?'; params.push(`%${cercle}%`); }

    const sortMap = { date_creation: 'd.date_creation', nom_complet: 'd.nom_complet', statut: 'd.statut', numero_dossier: 'd.numero_dossier', date_modification: 'd.date_modification' };
    const orderCol = sortMap[String(sort_by)] || 'd.date_creation';
    const orderDir = String(sort_dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const [rows] = await db.execute(
      `SELECT d.*, u.username AS created_by_username, u.full_name AS created_by_full_name FROM demandes d LEFT JOIN users u ON u.id = d.created_by ${whereClause} ORDER BY ${orderCol} ${orderDir} LIMIT ${safeLimit} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await db.execute(`SELECT COUNT(*) as total FROM demandes d ${whereClause}`, params);
    res.json({ success: true, data: rows, total, page: safePage, limit: safeLimit });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getDemandeById = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.*, u.username AS created_by_username, u.full_name AS created_by_full_name FROM demandes d LEFT JOIN users u ON u.id = d.created_by WHERE d.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Introuvable' });
    if (!canAccessDemande(req)) return res.status(403).json({ success: false, message: 'Action interdite' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createDemande = async (req, res) => {
  try {
    const nom_complet = sanitizeString(req.body.nom_complet);
    const cin = sanitizeString(req.body.cin)?.toUpperCase();
    const adresse_complete = sanitizeString(req.body.adresse_complete);
    const commune = sanitizeString(req.body.commune);
    const cercle = sanitizeString(req.body.cercle);
    const licence_type = sanitizeString(req.body.licence_type) || 'pharmacie';

    if (!nom_complet || !cin || !adresse_complete || !commune || !cercle) {
      return res.status(400).json({ success: false, message: 'Champs obligatoires manquants' });
    }
    if (!isValidCin(cin)) return res.status(400).json({ success: false, message: 'CIN invalide' });

    const numero_dossier = await generateUniqueNumeroDossier();
    const [result] = await db.execute(
      `INSERT INTO demandes (numero_dossier, nom_complet, cin, date_naissance, universite, diplome, adresse_complete, date_demande, date_izin, numero_izin, nom_massah, date_massah, date_lajna, commune, cercle, licence_type, extra_data, created_by, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numero_dossier, nom_complet, cin,
        sanitizeOptional(req.body.date_naissance), sanitizeOptional(req.body.universite), sanitizeOptional(req.body.diplome),
        adresse_complete, sanitizeOptional(req.body.date_demande), sanitizeOptional(req.body.date_izin), sanitizeOptional(req.body.numero_izin),
        sanitizeOptional(req.body.nom_massah), sanitizeOptional(req.body.date_massah), sanitizeOptional(req.body.date_lajna),
        commune, cercle, licence_type,
        req.body.extra_data ? JSON.stringify(req.body.extra_data) : null,
        req.user?.id || null, STATUTS.EN_COURS_ANALYSE
      ]
    );

    const [newDemande] = await db.execute('SELECT * FROM demandes WHERE id = ?', [result.insertId]);
    await logAudit(req, { action: 'DEMANDE_CREATE', entityType: 'demande', entityId: result.insertId, details: { numero_dossier, nom_complet, cin } });
    await logWorkflowEvent(result.insertId, 'demande_deposee', req.user?.id, req.user?.role || 'system', null, { ancien_statut: null, nouveau_statut: STATUTS.EN_COURS_ANALYSE });
    res.status(201).json({ success: true, data: newDemande[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateDemande = async (req, res) => {
  try {
    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) return res.status(404).json({ success: false, message: 'Demande introuvable' });
    if (!canMutateDemande(req)) return res.status(403).json({ success: false, message: 'Action interdite' });

    const nom_complet = sanitizeString(req.body.nom_complet);
    const cin = sanitizeString(req.body.cin)?.toUpperCase();
    const commune = sanitizeString(req.body.commune);
    const cercle = sanitizeString(req.body.cercle);

    if (!nom_complet || !cin || !commune || !cercle) return res.status(400).json({ success: false, message: 'Champs obligatoires manquants' });
    if (!isValidCin(cin)) return res.status(400).json({ success: false, message: 'CIN invalide' });

    await db.execute(
      `UPDATE demandes SET nom_complet = ?, cin = ?, date_naissance = ?, universite = ?, diplome = ?, adresse_complete = ?, commune = ?, cercle = ? WHERE id = ?`,
      [nom_complet, cin, sanitizeOptional(req.body.date_naissance), sanitizeOptional(req.body.universite), sanitizeOptional(req.body.diplome), sanitizeString(req.body.adresse_complete), commune, cercle, req.params.id]
    );

    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateStatut = async (req, res) => {
  try {
    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) return res.status(404).json({ success: false, message: 'Demande introuvable' });
    if (!canMutateDemande(req)) return res.status(403).json({ success: false, message: 'Action interdite' });

    const next = normalizeStatut(req.body.statut);
    if (!estTransitionPermise(demande.statut, next)) return res.status(400).json({ success: false, message: `Transition interdite (${demande.statut} → ${next})` });

    const prev = demande.statut;
    await db.execute('UPDATE demandes SET statut = ? WHERE id = ?', [next, req.params.id]);
    await logAudit(req, { action: 'CHANGEMENT_STATUT', entityType: 'demande', entityId: req.params.id, details: { numero_dossier: demande.numero_dossier, ancien_statut: prev, nouveau_statut: next } });
    await logStatutChange({ id: req.params.id, statut: next }, prev, { action: 'changement_statut', utilisateur_id: req.user?.id, role_utilisateur: req.user?.role });

    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.validerProvisoire = async (req, res) => {
  try {
    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) return res.status(404).json({ success: false, message: 'Introuvable' });
    if (!canMutateDemande(req)) return res.status(403).json({ success: false, message: 'Interdit' });
    if (!estTransitionPermise(demande.statut, STATUTS.AVIS_FAVORABLE)) return res.status(400).json({ success: false, message: 'Transition invalide' });

    const prev = demande.statut;
    await db.execute('UPDATE demandes SET statut = ? WHERE id = ?', [STATUTS.AVIS_FAVORABLE, req.params.id]);
    await logWorkflowEvent(req.params.id, 'DEMANDE_VALIDE_PROVISOIREMENT', req.user?.id, req.user?.role, null, { ancien_statut: prev, nouveau_statut: STATUTS.AVIS_FAVORABLE });

    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.accepterDefinitif = async (req, res) => {
  try {
    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) return res.status(404).json({ success: false, message: 'Introuvable' });
    if (!canMutateDemande(req)) return res.status(403).json({ success: false, message: 'Interdit' });
    if (!estTransitionPermise(demande.statut, STATUTS.ACCEPTE)) return res.status(400).json({ success: false, message: 'Transition invalide' });

    const prev = demande.statut;
    await db.execute('UPDATE demandes SET statut = ? WHERE id = ?', [STATUTS.ACCEPTE, req.params.id]);
    await logWorkflowEvent(req.params.id, 'DEMANDE_ACCEPTE_DEFINITIF', req.user?.id, req.user?.role, null, { ancien_statut: prev, nouveau_statut: STATUTS.ACCEPTE });

    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.refuserGouverneur = async (req, res) => {
  try {
    const motif = sanitizeOptional(req.body.notes) || sanitizeOptional(req.body.commentaire);
    if (!motif) return res.status(400).json({ success: false, message: 'Motif requis' });

    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) return res.status(404).json({ success: false, message: 'Introuvable' });
    if (!canMutateDemande(req)) return res.status(403).json({ success: false, message: 'Interdit' });
    if (!estTransitionPermise(demande.statut, STATUTS.REFUSE)) return res.status(400).json({ success: false, message: 'Transition invalide' });

    const prev = demande.statut;
    await db.execute('UPDATE demandes SET statut = ?, notes = ? WHERE id = ?', [STATUTS.REFUSE, motif, req.params.id]);
    await logWorkflowEvent(req.params.id, 'DEMANDE_REFUSE_GOUVERNEUR', req.user?.id, req.user?.role, motif, { ancien_statut: prev, nouveau_statut: STATUTS.REFUSE });

    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.rejeterFichier = async (req, res) => {
  try {
    const motif = sanitizeString(req.body.motif_rejet_fichier);
    if (!motif) return res.status(400).json({ success: false, message: 'Motif requis' });

    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) return res.status(404).json({ success: false, message: 'Introuvable' });
    if (!canMutateDemande(req)) return res.status(403).json({ success: false, message: 'Interdit' });

    const prev = demande.statut;
    await db.execute('UPDATE demandes SET statut = ?, motif_rejet_fichier = ? WHERE id = ?', [STATUTS.DOCUMENTS_REJETES, motif, req.params.id]);
    await logWorkflowEvent(req.params.id, 'fichier_rejete', req.user?.id, req.user?.role, motif, { ancien_statut: prev, nouveau_statut: STATUTS.DOCUMENTS_REJETES });

    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteDemande = async (req, res) => {
  try {
    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) return res.status(404).json({ success: false, message: 'Introuvable' });
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Seul un admin peut supprimer' });

    await db.execute('DELETE FROM demandes WHERE id = ?', [req.params.id]);
    await logAudit(req, { action: 'DEMANDE_DELETE', entityType: 'demande', entityId: req.params.id, details: { numero_dossier: demande.numero_dossier } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const [[stats]] = await db.execute(`SELECT COUNT(*) as total, SUM(statut = 'accepte') as approuves, SUM(statut IN ('en_cours_analyse','documents_corriges','avis_favorable','decision_imprimee')) as en_attente, SUM(statut = 'refuse') as rejetes FROM demandes WHERE statut != 'annule'`);
    const [byCommune] = await db.execute(`SELECT commune, COUNT(*) as count FROM demandes GROUP BY commune ORDER BY count DESC LIMIT 10`);
    res.json({ success: true, data: { ...stats, by_commune: byCommune } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getAgentDashboard = async (req, res) => {
  try {
    const [[pending]] = await db.execute(`SELECT COUNT(*) AS n FROM demandes WHERE statut IN ('en_cours_analyse','documents_corriges')`);
    const [[treatedToday]] = await db.execute(`SELECT COUNT(DISTINCT wh.demande_id) AS n FROM workflow_history wh WHERE DATE(wh.date_action) = CURRENT_DATE AND wh.nouveau_statut IN ('accepte','refuse','documents_rejetes','avis_favorable','decision_imprimee')`);
    res.json({ success: true, data: { dossiers_actifs: Number(pending?.n || 0), dossiers_traites_aujourdhui: Number(treatedToday?.n || 0) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getCitizenDemandes = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.*, u.username AS created_by_username, u.full_name AS created_by_full_name
       FROM demandes d LEFT JOIN users u ON u.id = d.created_by
       WHERE d.citizen_user_id = ? AND d.statut != 'annule'
       ORDER BY d.date_creation DESC`,
      [req.user.id]
    );
    const stats = {
      total: rows.length,
      en_cours: rows.filter(r => ['en_cours_analyse', 'documents_corriges', 'avis_favorable', 'decision_imprimee'].includes(r.statut)).length,
      a_corriger: rows.filter(r => r.statut === 'documents_rejetes').length,
      acceptees: rows.filter(r => r.statut === 'accepte').length,
    };
    res.json({ success: true, data: rows, stats });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createCitizenDemande = async (req, res) => {
  try {
    const nom_complet = sanitizeString(req.body.nom_complet) || req.user.full_name;
    const cin = sanitizeString(req.body.cin)?.toUpperCase();
    const adresse_complete = sanitizeString(req.body.adresse_complete);
    const commune = sanitizeString(req.body.commune);
    const cercle = sanitizeString(req.body.cercle);
    const licence_type = sanitizeString(req.body.licence_type) || 'pharmacie';

    if (!nom_complet || !cin || !adresse_complete || !commune || !cercle) {
      return res.status(400).json({ success: false, message: 'Champs obligatoires manquants' });
    }
    if (!isValidCin(cin)) return res.status(400).json({ success: false, message: 'CIN invalide' });

    const numero_dossier = await generateUniqueNumeroDossier();
    const [result] = await db.execute(
      `INSERT INTO demandes (numero_dossier, nom_complet, cin, date_naissance, universite, diplome, adresse_complete, date_demande, commune, cercle, licence_type, extra_data, created_by, statut, source, citizen_user_id, citizen_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, ?, ?, ?, ?, ?, ?, 'citizen', ?, ?)`,
      [
        numero_dossier, nom_complet, cin,
        sanitizeOptional(req.body.date_naissance), sanitizeOptional(req.body.universite), sanitizeOptional(req.body.diplome),
        adresse_complete, commune, cercle, licence_type,
        req.body.extra_data ? JSON.stringify(req.body.extra_data) : null,
        req.user.id, STATUTS.EN_COURS_ANALYSE, req.user.id, req.user.email
      ]
    );

    const [newDemande] = await db.execute('SELECT * FROM demandes WHERE id = ?', [result.insertId]);
    await logAudit(req, { action: 'DEMANDE_CREATE_CITIZEN', entityType: 'demande', entityId: result.insertId, details: { numero_dossier, nom_complet, cin } });
    await logWorkflowEvent(result.insertId, 'demande_deposee_citoyen', req.user.id, 'citizen', null, { ancien_statut: null, nouveau_statut: STATUTS.EN_COURS_ANALYSE });
    res.status(201).json({ success: true, data: newDemande[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getCitizenDemandeById = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.*, u.username AS created_by_username, u.full_name AS created_by_full_name
       FROM demandes d LEFT JOIN users u ON u.id = d.created_by
       WHERE d.id = ? AND d.citizen_user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Introuvable' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.annulerCitizenDemande = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ? AND citizen_user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Introuvable' });

    const demande = rows[0];
    if (!['en_cours_analyse', 'documents_rejetes'].includes(demande.statut)) {
      return res.status(400).json({ success: false, message: 'Impossible d\'annuler cette demande' });
    }

    await db.execute("UPDATE demandes SET statut = 'annule' WHERE id = ?", [req.params.id]);
    await logWorkflowEvent(req.params.id, 'demande_annulee_citoyen', req.user.id, 'citizen', null, { ancien_statut: demande.statut, nouveau_statut: 'annule' });
    res.json({ success: true, message: 'Demande annulée' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
