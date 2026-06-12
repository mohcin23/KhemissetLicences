const db = require('../db/connection');
const { logAudit } = require('../utils/auditLogger');
const { logWorkflowEvent, logStatutChange } = require('../utils/workflowLogger');
const { STATUTS, estTransitionPermise, normalizeStatut } = require('../constants/workflowStatuses');
const { LICENCE_CONFIGS } = require('../constants/licenceConfig');
const {
  sanitizeString,
  sanitizeOptional,
  isValidCin,
  isValidDateString,
  validateMaxLength
} = require('../utils/validation');

const generateNumeroDossier = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `KH-${year}-${random}`;
};

const generateUniqueNumeroDossier = async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateNumeroDossier();
    const [existing] = await db.execute(
      'SELECT id FROM demandes WHERE numero_dossier = ?',
      [candidate]
    );
    if (!existing.length) return candidate;
  }
  throw new Error('Impossible de générer un numéro de dossier unique après 10 tentatives');
};

const getLicenceConfig = (licenceType) => {
  if (!licenceType) return LICENCE_CONFIGS.pharmacie;
  return LICENCE_CONFIGS[licenceType] || null;
};

const buildLicenceFormData = (body, licenceConf) => {
  const data = {};
  licenceConf.form_sections.forEach((field) => {
    data[field.key] = sanitizeOptional(body[field.key]);
  });
  return data;
};

const extractCommonRequestFields = (body) => {
  const nom = sanitizeString(body.nom);
  const prenom = sanitizeString(body.prenom);
  const nom_directeur = sanitizeString(body.nom_directeur);
  const prenom_directeur = sanitizeString(body.prenom_directeur);

  const nom_complet = sanitizeString(body.nom_complet)
    || (nom && prenom ? `${nom} ${prenom}` : null)
    || (nom_directeur && prenom_directeur ? `${nom_directeur} ${prenom_directeur}` : null)
    || null;

  const cin = sanitizeString(body.cin)?.toUpperCase()
    || sanitizeString(body.cin_directeur)?.toUpperCase()
    || null;

  const adresse_complete = sanitizeString(body.adresse_complete)
    || sanitizeString(body.adresse_local)
    || sanitizeString(body.adresse)
    || null;

  return {
    nom_complet,
    cin,
    adresse_complete,
    commune: sanitizeString(body.commune),
    cercle: sanitizeString(body.cercle)
  };
};

const validateLicencePayload = (payload, licenceConf) => {
  const missingFields = [];
  const requiredKeys = new Set(
    licenceConf.form_sections
      .filter((field) => field.required)
      .map((field) => field.key)
  );

  requiredKeys.add('commune');
  requiredKeys.add('cercle');

  requiredKeys.forEach((key) => {
    if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
      missingFields.push(key);
    }
  });

  if (missingFields.length) {
    return `Champs obligatoires manquants: ${missingFields.join(', ')}`;
  }

  for (const field of licenceConf.form_sections) {
    if (field.type === 'date' && payload[field.key] && !isValidDateString(payload[field.key])) {
      return `Date invalide pour le champ ${field.key}`;
    }
  }

  return null;
};

const isAdmin = (req) => req.user?.role === 'admin';
const isAgent = (req) => req.user?.role === 'agent';

const canAccessDemande = (req, demande) => {
  return isAdmin(req) || isAgent(req) || req.user?.role === 'lecteur';
};

const canMutateDemande = (req, demande) => {
  return isAgent(req);
};

const forbidden = (res, message = 'Action interdite pour ce rôle') =>
  res.status(403).json({ success: false, message });

const normalizeIncomingStatut = normalizeStatut;
const getDemandeForAccess = async (id) => {
  const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [id]);
  return rows[0] || null;
};

exports.createDemande = async (req, res) => {
  try {
    const licence_type = sanitizeString(req.body.licence_type) || 'pharmacie';
    const notes = sanitizeOptional(req.body.notes);

    if (licence_type === 'pharmacie') {
      const nom_complet = sanitizeString(req.body.nom_complet);
      const cin = sanitizeString(req.body.cin)?.toUpperCase();
      const date_naissance = sanitizeOptional(req.body.date_naissance);
      const universite = sanitizeOptional(req.body.universite);
      const diplome = sanitizeOptional(req.body.diplome);
      const adresse_complete = sanitizeString(req.body.adresse_complete);
      const date_demande = sanitizeOptional(req.body.date_demande);
      const date_izin = sanitizeOptional(req.body.date_izin);
      const numero_izin = sanitizeOptional(req.body.numero_izin);
      const nom_massah = sanitizeOptional(req.body.nom_massah);
      const date_massah = sanitizeOptional(req.body.date_massah);
      const date_lajna = sanitizeOptional(req.body.date_lajna);
      const commune = sanitizeString(req.body.commune);
      const cercle = sanitizeString(req.body.cercle);

      if (!nom_complet || !cin || !adresse_complete || !commune || !cercle) {
        return res.status(400).json({
          success: false,
          message: 'Champs obligatoires manquants: nom complet, CIN, adresse, commune, cercle'
        });
      }
      if (!isValidCin(cin)) {
        return res.status(400).json({ success: false, message: 'CIN invalide' });
      }
      if (!isValidDateString(date_naissance) || !isValidDateString(date_demande) || !isValidDateString(date_izin) || !isValidDateString(date_massah) || !isValidDateString(date_lajna)) {
        return res.status(400).json({ success: false, message: 'Date invalide' });
      }
      if (!validateMaxLength(nom_complet, 255)) {
        return res.status(400).json({ success: false, message: 'Nom trop long' });
      }
      if (!validateMaxLength(notes, 2000)) {
        return res.status(400).json({ success: false, message: 'Notes trop longues' });
      }

      const numero_dossier = await generateUniqueNumeroDossier();

      const [result] = await db.execute(
        `INSERT INTO demandes
          (numero_dossier, nom_complet, cin, date_naissance, universite, diplome,
           adresse_complete,
           date_demande, date_izin, numero_izin,
           nom_massah, date_massah, date_lajna,
           commune, cercle, notes, licence_type, extra_data, created_by, statut)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          numero_dossier, nom_complet, cin,
          date_naissance || null, universite || null, diplome || null,
          adresse_complete || null,
          date_demande || null, date_izin || null, numero_izin || null,
          nom_massah || null, date_massah || null, date_lajna || null,
          commune, cercle, notes || null, 'pharmacie', null,
          req.user?.id || null,
          STATUTS.EN_COURS_ANALYSE
        ]
      );

      const [newDemande] = await db.execute('SELECT * FROM demandes WHERE id = ?', [result.insertId]);
      await logAudit(req, {
        action: 'DEMANDE_CREATE',
        entityType: 'demande',
        entityId: result.insertId,
        details: { numero_dossier, nom_complet, cin, commune, cercle }
      });
      await logWorkflowEvent(
        result.insertId,
        'demande_deposee',
        req.user?.id || null,
        req.user?.role || 'system',
        null,
        { ancien_statut: null, nouveau_statut: STATUTS.EN_COURS_ANALYSE }
      );
      return res.status(201).json({ success: true, message: 'تم إنشاء الطلب بنجاح', data: newDemande[0] });
    }

    const licenceConf = getLicenceConfig(licence_type);
    if (!licenceConf) {
      return res.status(400).json({ success: false, message: `Type de licence inconnu : ${licence_type}` });
    }

    const commonFields = extractCommonRequestFields(req.body);
    const formData = buildLicenceFormData(req.body, licenceConf);
    const payload = { ...formData, ...commonFields };
    const validationError = validateLicencePayload(payload, licenceConf);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }
    if (!isValidCin(commonFields.cin)) {
      return res.status(400).json({ success: false, message: 'CIN invalide' });
    }
    if (!validateMaxLength(commonFields.nom_complet, 255)) {
      return res.status(400).json({ success: false, message: 'Nom trop long' });
    }
    if (!validateMaxLength(notes, 2000)) {
      return res.status(400).json({ success: false, message: 'Notes trop longues' });
    }

    const numero_dossier = await generateUniqueNumeroDossier();
    const [result] = await db.execute(
      `INSERT INTO demandes
        (numero_dossier, nom_complet, cin, date_naissance, universite, diplome,
         adresse_complete, date_demande, date_izin, numero_izin,
         nom_massah, date_massah, date_lajna,
         commune, cercle, notes, licence_type, extra_data, created_by, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numero_dossier,
        commonFields.nom_complet,
        commonFields.cin,
        null,
        null,
        null,
        commonFields.adresse_complete || null,
        null,
        null,
        null,
        null,
        null,
        null,
        commonFields.commune,
        commonFields.cercle,
        notes || null,
        licence_type,
        JSON.stringify(formData),
        req.user?.id || null,
        STATUTS.EN_COURS_ANALYSE
      ]
    );

    const [newDemande] = await db.execute('SELECT * FROM demandes WHERE id = ?', [result.insertId]);
    await logAudit(req, {
      action: 'DEMANDE_CREATE',
      entityType: 'demande',
      entityId: result.insertId,
      details: {
        numero_dossier,
        licence_type,
        nom_complet: commonFields.nom_complet,
        cin: commonFields.cin,
        commune: commonFields.commune,
        cercle: commonFields.cercle
      }
    });
    await logWorkflowEvent(
      result.insertId,
      'demande_deposee',
      req.user?.id || null,
      req.user?.role || 'system',
      null,
      { ancien_statut: null, nouveau_statut: STATUTS.EN_COURS_ANALYSE }
    );
    return res.status(201).json({ success: true, message: 'تم إنشاء الطلب بنجاح', data: newDemande[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDemandes = async (req, res) => {
  try {
    const {
      search,
      statut,
      commune,
      cercle,
      page = 1,
      limit = 20,
      sort_by = 'date_creation',
      sort_dir = 'desc',
      traite_aujourdhui,
    } = req.query;
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (safePage - 1) * Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (d.nom_complet LIKE ? OR d.cin LIKE ? OR d.numero_dossier LIKE ? OR d.adresse_complete LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (statut) {
      const statuts = String(statut)
        .split(',')
        .map(s => normalizeIncomingStatut(s.trim()))
        .filter(Boolean);

      if (statuts.length === 1) {
        whereClause += ' AND d.statut = ?';
        params.push(statuts[0]);
      } else if (statuts.length > 1) {
        whereClause += ` AND d.statut IN (${statuts.map(() => '?').join(',')})`;
        params.push(...statuts);
      }
    }
    if (commune) { whereClause += ' AND d.commune LIKE ?'; params.push(`%${commune}%`); }
    if (cercle) { whereClause += ' AND d.cercle LIKE ?'; params.push(`%${cercle}%`); }
    if (String(traite_aujourdhui) === '1') {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM workflow_history wh
        WHERE wh.demande_id = d.id
          AND DATE(wh.date_action) = CURDATE()
          AND wh.nouveau_statut IN ('accepte','refuse','documents_rejetes','avis_favorable','decision_imprimee')
      )`;
    }

    const sortMap = {
      date_creation: 'd.date_creation',
      nom_complet: 'd.nom_complet',
      statut: 'd.statut',
      numero_dossier: 'd.numero_dossier',
      date_modification: 'd.date_modification'
    };
    const orderCol = sortMap[String(sort_by)] || 'd.date_creation';
    const orderDir = String(sort_dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);
    const [rows] = await db.execute(
      `SELECT d.*, u.username AS created_by_username, u.full_name AS created_by_full_name
       FROM demandes d
       LEFT JOIN users u ON u.id = d.created_by
       ${whereClause}
       ORDER BY ${orderCol} ${orderDir} LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM demandes d ${whereClause}`,
      params
    );
    res.json({ success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDemandeById = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.*, u.username AS created_by_username, u.full_name AS created_by_full_name
       FROM demandes d
       LEFT JOIN users u ON u.id = d.created_by
       WHERE d.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'غير موجود' });
    if (!canAccessDemande(req, rows[0])) {
      return forbidden(res);
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateDemande = async (req, res) => {
  try {
    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }
    if (!canMutateDemande(req, demande)) {
      return forbidden(res);
    }

    const notes = sanitizeOptional(req.body.notes);
    const licence_type = demande.licence_type || 'pharmacie';

    if (licence_type === 'pharmacie') {
      const nom_complet = sanitizeString(req.body.nom_complet);
      const cin = sanitizeString(req.body.cin)?.toUpperCase();
      const date_naissance = sanitizeOptional(req.body.date_naissance);
      const universite = sanitizeOptional(req.body.universite);
      const diplome = sanitizeOptional(req.body.diplome);
      const adresse_complete = sanitizeString(req.body.adresse_complete);
      const date_demande = sanitizeOptional(req.body.date_demande);
      const date_izin = sanitizeOptional(req.body.date_izin);
      const numero_izin = sanitizeOptional(req.body.numero_izin);
      const nom_massah = sanitizeOptional(req.body.nom_massah);
      const date_massah = sanitizeOptional(req.body.date_massah);
      const date_lajna = sanitizeOptional(req.body.date_lajna);
      const commune = sanitizeString(req.body.commune);
      const cercle = sanitizeString(req.body.cercle);

      if (!nom_complet || !cin || !adresse_complete || !commune || !cercle) {
        return res.status(400).json({ success: false, message: 'Champs obligatoires manquants' });
      }
      if (!isValidCin(cin)) {
        return res.status(400).json({ success: false, message: 'CIN invalide' });
      }
      if (!isValidDateString(date_naissance) || !isValidDateString(date_demande) || !isValidDateString(date_izin) || !isValidDateString(date_massah) || !isValidDateString(date_lajna)) {
        return res.status(400).json({ success: false, message: 'Date invalide' });
      }
      if (!validateMaxLength(nom_complet, 255)) {
        return res.status(400).json({ success: false, message: 'Nom trop long' });
      }
      if (!validateMaxLength(notes, 2000)) {
        return res.status(400).json({ success: false, message: 'Notes trop longues' });
      }

      const [result] = await db.execute(
        `UPDATE demandes SET
          nom_complet = ?, cin = ?, date_naissance = ?,
          universite = ?, diplome = ?, adresse_complete = ?,
          date_demande = ?, date_izin = ?, numero_izin = ?,
          nom_massah = ?, date_massah = ?, date_lajna = ?,
          commune = ?, cercle = ?, notes = ?
         WHERE id = ?`,
        [
          nom_complet, cin, date_naissance || null,
          universite || null, diplome || null, adresse_complete || null,
          date_demande || null, date_izin || null, numero_izin || null,
          nom_massah || null, date_massah || null, date_lajna || null,
          commune, cercle, notes || null,
          req.params.id
        ]
      );

      if (!result.affectedRows) {
        return res.status(404).json({ success: false, message: 'Demande introuvable' });
      }

      const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
      return res.json({ success: true, message: 'Demande mise à jour', data: rows[0] });
    }

    const licenceConf = getLicenceConfig(licence_type);
    if (!licenceConf) {
      return res.status(400).json({ success: false, message: `Type de licence inconnu : ${licence_type}` });
    }

    const commonFields = extractCommonRequestFields(req.body);
    const formData = buildLicenceFormData(req.body, licenceConf);
    const payload = { ...formData, ...commonFields };
    const validationError = validateLicencePayload(payload, licenceConf);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }
    if (!isValidCin(commonFields.cin)) {
      return res.status(400).json({ success: false, message: 'CIN invalide' });
    }
    if (!validateMaxLength(commonFields.nom_complet, 255)) {
      return res.status(400).json({ success: false, message: 'Nom trop long' });
    }
    if (!validateMaxLength(notes, 2000)) {
      return res.status(400).json({ success: false, message: 'Notes trop longues' });
    }

    let extraData = {};
    try {
      extraData = demande.extra_data ? JSON.parse(demande.extra_data) : {};
    } catch (parseErr) {
      extraData = {};
    }

    const nextExtraData = JSON.stringify({ ...extraData, ...formData });
    const [result] = await db.execute(
      `UPDATE demandes SET
        nom_complet = ?, cin = ?, adresse_complete = ?,
        commune = ?, cercle = ?, notes = ?, extra_data = ?
       WHERE id = ?`,
      [
        commonFields.nom_complet,
        commonFields.cin,
        commonFields.adresse_complete || null,
        commonFields.commune,
        commonFields.cercle,
        notes || null,
        nextExtraData,
        req.params.id
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }

    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Demande mise à jour', data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStatut = async (req, res) => {
  try {
    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }
    if (!canMutateDemande(req, demande)) {
      return forbidden(res);
    }

    const next = normalizeIncomingStatut(req.body.statut);
    if (!estTransitionPermise(demande.statut, next)) {
      return res.status(400).json({
        success: false,
        message: `Transition de statut interdite (${demande.statut} → ${next})`
      });
    }

    const statutsAvecMotifObligatoire = [STATUTS.REFUSE];
    if (statutsAvecMotifObligatoire.includes(next)) {
      const motif = sanitizeOptional(req.body.notes) || sanitizeOptional(demande.notes);
      if (!motif || !String(motif).trim()) {
        return res.status(400).json({ success: false, message: 'Motif obligatoire pour ce refus (notes)' });
      }
    }

    const prev = demande.statut;
    const notesUpdate = statutsAvecMotifObligatoire.includes(next) && req.body.notes
      ? sanitizeOptional(req.body.notes)
      : null;

    if (notesUpdate) {
      await db.execute('UPDATE demandes SET statut = ?, notes = ? WHERE id = ?', [next, notesUpdate, req.params.id]);
    } else {
      await db.execute('UPDATE demandes SET statut = ? WHERE id = ?', [next, req.params.id]);
    }

    const STATUTS_IMPORTANTS = ['avis_favorable', 'accepte', 'refuse', 'documents_rejetes', 'decision_imprimee', 'archive'];
    if (STATUTS_IMPORTANTS.includes(next)) {
      await logAudit(req, {
        action: 'CHANGEMENT_STATUT',
        entityType: 'demande',
        entityId: req.params.id,
        details: {
          numero_dossier: demande.numero_dossier,
          nom_complet: demande.nom_complet,
          ancien_statut: prev,
          nouveau_statut: next
        }
      });
    }

    const [updatedRows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
    const updated = updatedRows[0];
    await logStatutChange(updated, prev, {
      action: 'changement_statut',
      utilisateur_id: req.user?.id || null,
      role_utilisateur: req.user?.role || 'agent',
      commentaire: sanitizeOptional(req.body.commentaire) || null,
      raison_rejet: next === STATUTS.REFUSE ? (updated.notes || null) : null
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const changeDemandeStatut = async ({ req, demande, statut, action, commentaire = null, raison_rejet = null, motif_rejet_fichier = null, eventType = null }) => {
  const prev = demande.statut;
  const fields = ['statut = ?'];
  const params = [statut];

  if (motif_rejet_fichier) {
    fields.push('motif_rejet_fichier = ?');
    params.push(motif_rejet_fichier);
  }
  if (commentaire !== null) {
    fields.push('notes = ?');
    params.push(commentaire);
  }

  params.push(req.params.id);
  await db.execute(`UPDATE demandes SET ${fields.join(', ')} WHERE id = ?`, params);

  await logAudit(req, {
    action,
    entityType: 'demande',
    entityId: req.params.id,
    details: {
      numero_dossier: demande.numero_dossier,
      ancien_statut: prev,
      nouveau_statut: statut,
      commentaire,
      motif_rejet_fichier
    }
  });

  const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
  const updated = rows[0];

  if (eventType === 'fichier_rejete') {
    await logWorkflowEvent(
      req.params.id,
      eventType,
      req.user?.id || null,
      req.user?.role || 'system',
      motif_rejet_fichier || commentaire || null,
      { ancien_statut: prev, nouveau_statut: statut }
    );
  } else {
    await logStatutChange(updated, prev, {
      action,
      utilisateur_id: req.user?.id || null,
      role_utilisateur: req.user?.role || 'agent',
      commentaire,
      raison_rejet
    });
  }

  try {
    const { sendStatusChangeEmail } = require('../utils/emailService');
    const [citizenRows] = await db.execute(
      `SELECT u.email, d.citizen_email
       FROM demandes d
       LEFT JOIN users u ON u.id = d.citizen_user_id
       WHERE d.id = ?`,
      [req.params.id]
    );
    const citizenEmail = citizenRows[0]?.email || citizenRows[0]?.citizen_email || null;
    await sendStatusChangeEmail({
      to: citizenEmail,
      nom_complet: demande.nom_complet,
      numero_dossier: demande.numero_dossier,
      statut,
      commentaire: commentaire || raison_rejet || motif_rejet_fichier || null
    });
  } catch (emailErr) {
    console.error('[email] Non-blocking send failure:', emailErr.message);
  }

  return updated;
};

exports.validerProvisoire = async (req, res) => {
  try {
    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }
    if (!canMutateDemande(req, demande)) {
      return forbidden(res);
    }
    if (!estTransitionPermise(demande.statut, STATUTS.VALIDE_PROVISOIREMENT)) {
      return res.status(400).json({ success: false, message: 'Transition de statut invalide pour validation provisoire' });
    }

    const updated = await changeDemandeStatut({
      req,
      demande,
      statut: STATUTS.VALIDE_PROVISOIREMENT,
      action: 'DEMANDE_VALIDE_PROVISOIREMENT',
      commentaire: sanitizeOptional(req.body.commentaire) || null
    });

    res.json({ success: true, message: 'Demande validée provisoirement', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.accepterDefinitif = async (req, res) => {
  try {
    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }
    if (!canMutateDemande(req, demande)) {
      return forbidden(res);
    }
    if (!estTransitionPermise(demande.statut, STATUTS.ACCEPTE_DEFINITIF)) {
      return res.status(400).json({ success: false, message: 'Transition de statut invalide pour acceptation définitive' });
    }

    const updated = await changeDemandeStatut({
      req,
      demande,
      statut: STATUTS.ACCEPTE_DEFINITIF,
      action: 'DEMANDE_ACCEPTE_DEFINITIF',
      commentaire: sanitizeOptional(req.body.commentaire) || null
    });

    res.json({ success: true, message: 'Demande acceptée définitivement', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.refuserGouverneur = async (req, res) => {
  try {
    const motif = sanitizeOptional(req.body.notes) || sanitizeOptional(req.body.commentaire);
    if (!motif || !String(motif).trim()) {
      return res.status(400).json({ success: false, message: 'Motif de refus du Gouverneur requis' });
    }

    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }
    if (!canMutateDemande(req, demande)) {
      return forbidden(res);
    }
    if (!estTransitionPermise(demande.statut, STATUTS.REFUSE_GOUVERNEUR)) {
      return res.status(400).json({ success: false, message: 'Transition de statut invalide pour refus Gouverneur' });
    }

    const updated = await changeDemandeStatut({
      req,
      demande,
      statut: STATUTS.REFUSE_GOUVERNEUR,
      action: 'DEMANDE_REFUSE_GOUVERNEUR',
      commentaire: motif.trim(),
      raison_rejet: motif.trim()
    });

    res.json({ success: true, message: 'Demande refusée par le Gouverneur', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.refuserEmploye = async (req, res) => {
  try {
    const motif = sanitizeString(req.body.motif_rejet_fichier);
    if (!motif) {
      return res.status(400).json({ success: false, message: 'Motif de refus employé requis' });
    }
    if (!validateMaxLength(motif, 1000)) {
      return res.status(400).json({ success: false, message: 'Motif de refus trop long' });
    }

    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }
    if (!canMutateDemande(req, demande)) {
      return forbidden(res);
    }
    if (!estTransitionPermise(demande.statut, STATUTS.REFUSE_EMPLOYE)) {
      return res.status(400).json({ success: false, message: 'Transition de statut invalide pour refus employé' });
    }

    const updated = await changeDemandeStatut({
      req,
      demande,
      statut: STATUTS.REFUSE_EMPLOYE,
      action: 'DEMANDE_REFUSE_EMPLOYE',
      motif_rejet_fichier: motif.trim(),
      eventType: 'fichier_rejete',
      raison_rejet: motif.trim()
    });

    res.json({ success: true, message: 'Demande refusée par l\'employé', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.corrigerDossier = async (req, res) => {
  try {
    const commentaire = sanitizeOptional(req.body.commentaire) || null;

    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }
    if (!canMutateDemande(req, demande)) {
      return forbidden(res);
    }
    if (!estTransitionPermise(demande.statut, STATUTS.CORRIGE)) {
      return res.status(400).json({ success: false, message: 'Transition de statut invalide pour correction' });
    }

    const updated = await changeDemandeStatut({
      req,
      demande,
      statut: STATUTS.CORRIGE,
      action: 'DEMANDE_CORRIGEE',
      commentaire
    });

    res.json({ success: true, message: 'Demande marquée corrigée', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejeterFichier = async (req, res) => {
  try {
    const motif_rejet_fichier = sanitizeString(req.body.motif_rejet_fichier);
    if (!motif_rejet_fichier) {
      return res.status(400).json({ success: false, message: 'Motif de rejet requis' });
    }
    if (!validateMaxLength(motif_rejet_fichier, 1000)) {
      return res.status(400).json({ success: false, message: 'Motif de rejet trop long' });
    }

    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }
    if (!canMutateDemande(req, demande)) {
      return forbidden(res);
    }
    const rejOk = [STATUTS.EN_COURS_ANALYSE, STATUTS.DOCUMENTS_CORRIGES].includes(demande.statut);
    if (!rejOk) {
      return res.status(400).json({
        success: false,
        message: "Le rejet de documents n'est possible que pour les dossiers en cours d'analyse"
      });
    }

    const prev = demande.statut;
    await db.execute(
      `UPDATE demandes
       SET statut = ?, motif_rejet_fichier = ?
       WHERE id = ?`,
      [STATUTS.DOCUMENTS_REJETES, motif_rejet_fichier.trim(), req.params.id]
    );

    await logAudit(req, {
      action: 'FICHIER_REJECT',
      entityType: 'demande',
      entityId: req.params.id,
      details: {
        numero_dossier: demande.numero_dossier,
        ancien_statut: prev,
        nouveau_statut: STATUTS.DOCUMENTS_REJETES,
        motif_rejet_fichier: motif_rejet_fichier.trim()
      }
    });

    await logWorkflowEvent(
      req.params.id,
      'fichier_rejete',
      req.user?.id || null,
      req.user?.role || 'system',
      motif_rejet_fichier.trim(),
      { ancien_statut: prev, nouveau_statut: STATUTS.DOCUMENTS_REJETES }
    );
    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);

    try {
      const { sendStatusChangeEmail } = require('../utils/emailService');
      const [citizenRows] = await db.execute(
        `SELECT u.email, d.citizen_email
         FROM demandes d
         LEFT JOIN users u ON u.id = d.citizen_user_id
         WHERE d.id = ?`,
        [req.params.id]
      );
      const citizenEmail = citizenRows[0]?.email || citizenRows[0]?.citizen_email || null;
      await sendStatusChangeEmail({
        to: citizenEmail,
        nom_complet: demande.nom_complet,
        numero_dossier: demande.numero_dossier,
        statut: STATUTS.DOCUMENTS_REJETES,
        commentaire: motif_rejet_fichier.trim()
      });
    } catch (emailErr) {
      console.error('[email] Non-blocking send failure:', emailErr.message);
    }

    res.json({ success: true, message: 'Fichier rejeté', data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteDemande = async (req, res) => {
  try {
    const demande = await getDemandeForAccess(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }

    if (!isAdmin(req)) {
      return forbidden(res, 'Seul un administrateur peut supprimer un dossier');
    }

    const STATUTS_NON_SUPPRIMABLES = [STATUTS.ACCEPTE, STATUTS.ARCHIVE];
    if (STATUTS_NON_SUPPRIMABLES.includes(demande.statut)) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer un dossier en statut "${demande.statut}". Archivez-le plutôt.`
      });
    }

    await db.execute('DELETE FROM demandes WHERE id = ?', [req.params.id]);
    await logAudit(req, {
      action: 'DEMANDE_DELETE',
      entityType: 'demande',
      entityId: req.params.id,
      details: {
        numero_dossier: demande.numero_dossier,
        nom_complet: demande.nom_complet,
        cin: demande.cin
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [[stats]] = await db.execute(`
      SELECT COUNT(*) as total,
        SUM(statut = 'accepte') as approuves,
        SUM(statut IN ('en_cours_analyse','documents_corriges','avis_favorable','decision_imprimee')) as en_attente,
        SUM(statut = 'refuse') as rejetes,
        SUM(statut = 'documents_rejetes') as fichiers_rejetes
      FROM demandes
    `);
    const [byCommune] = await db.execute(
      `SELECT commune, COUNT(*) as count FROM demandes GROUP BY commune ORDER BY count DESC LIMIT 10`
    );
    const [byCercle] = await db.execute(
      `SELECT cercle, COUNT(*) as count FROM demandes GROUP BY cercle ORDER BY count DESC LIMIT 10`
    );
    res.json({ success: true, data: { ...stats, by_commune: byCommune, by_cercle: byCercle } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMonthlyStats = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(date_creation, '%Y-%m') as month, COUNT(*) as count
      FROM demandes
      WHERE date_creation >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
      GROUP BY DATE_FORMAT(date_creation, '%Y-%m')
      ORDER BY month ASC
    `);

    const countsByMonth = rows.reduce((acc, row) => {
      acc[row.month] = Number(row.count);
      return acc;
    }, {});

    const now = new Date();
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      data.push({
        month: key,
        label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        count: countsByMonth[key] || 0
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAgentDashboard = async (req, res) => {
  try {
    if (!isAdmin(req) && !isAgent(req)) {
      return forbidden(res);
    }

    const [[pending]] = await db.execute(
      `SELECT COUNT(*) AS n FROM demandes d
       WHERE d.statut IN ('en_cours_analyse','documents_corriges')`
    );

    const [[rejected]] = await db.execute(
      `SELECT COUNT(*) AS n FROM demandes d
       WHERE d.statut = 'documents_rejetes'`
    );

    const [[treatedToday]] = await db.execute(
      `SELECT COUNT(DISTINCT wh.demande_id) AS n
       FROM workflow_history wh
       INNER JOIN demandes d ON d.id = wh.demande_id
       WHERE DATE(wh.date_action) = CURDATE()
         AND wh.nouveau_statut IN ('accepte','refuse','documents_rejetes','avis_favorable','decision_imprimee')`
    );

    const [[avgRow]] = await db.execute(
      `SELECT AVG(TIMESTAMPDIFF(HOUR, d.date_creation, COALESCE(d.date_modification, d.date_creation))) AS avg_h
       FROM demandes d
       WHERE d.statut IN ('accepte','refuse','archive')`
    );

    res.json({
      success: true,
      data: {
        dossiers_actifs: Number(pending?.n || 0),
        dossiers_rejetes: Number(rejected?.n || 0),
        dossiers_traites_aujourdhui: Number(treatedToday?.n || 0),
        temps_moyen_traitement_heures: avgRow?.avg_h != null ? Math.round(Number(avgRow.avg_h) * 10) / 10 : null,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
