const db = require('../db/connection');
const { logAudit } = require('../utils/auditLogger');
const { logStatutChange } = require('../utils/workflowLogger');
const { STATUTS, normalizeStatut } = require('../constants/workflowStatuses');

/** Compatibilité anciens clients — délègue à la fonction partagée. */
const normalizeIncomingStatut = normalizeStatut;

const percent = (part, total) => {
  const safeTotal = Number(total || 0);
  if (!safeTotal) return '0%';
  return `${Math.round((Number(part || 0) / safeTotal) * 100)}%`;
};

const toNumberStats = (row) => Object.fromEntries(
  Object.entries(row || {}).map(([key, value]) => [
    key,
    typeof value === 'bigint' ? Number(value) : value
  ])
);

const buildDemandesWhere = (query) => {
  const clauses = ['1=1'];
  const params = [];
  const exactFilters = ['statut', 'source'];
  const likeFilters = ['commune', 'cercle'];

  exactFilters.forEach((key) => {
    if (query[key]) {
      clauses.push(`d.${key} = ?`);
      params.push(query[key]);
    }
  });

  likeFilters.forEach((key) => {
    if (query[key]) {
      clauses.push(`d.${key} LIKE ?`);
      params.push(`%${query[key]}%`);
    }
  });

  if (query.from) {
    clauses.push('DATE(d.date_creation) >= ?');
    params.push(query.from);
  }
  if (query.to) {
    clauses.push('DATE(d.date_creation) <= ?');
    params.push(query.to);
  }

  return { where: clauses.join(' AND '), params };
};

exports.getOverview = async (req, res) => {
  try {
    const [[demandesStats]] = await db.execute(`
      SELECT
        COUNT(*) AS total_demandes,
        COALESCE(SUM(statut = 'accepte'), 0) AS approuvees,
        COALESCE(SUM(statut = 'refuse'), 0) AS rejetees,
        COALESCE(SUM(statut IN ('en_cours_analyse','documents_corriges','avis_favorable','decision_imprimee')), 0) AS en_attente,
        COALESCE(SUM(statut = 'documents_rejetes'), 0) AS fichiers_rejetes,
        COALESCE(SUM(
          YEAR(date_creation) = YEAR(CURDATE())
          AND MONTH(date_creation) = MONTH(CURDATE())
        ), 0) AS demandes_ce_mois,
        COALESCE(SUM(
          YEAR(date_creation) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
          AND MONTH(date_creation) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        ), 0) AS demandes_mois_precedent,
        COALESCE(SUM(
          YEARWEEK(date_creation, 1) = YEARWEEK(CURDATE(), 1)
        ), 0) AS demandes_ce_semaine,
        ROUND(AVG(CASE WHEN statut IN ('accepte','refuse') THEN TIMESTAMPDIFF(HOUR, date_creation, COALESCE(date_modification, NOW())) END), 1) AS temps_moyen_traitement_heures
      FROM demandes
    `);

    const [[usersStats]] = await db.execute(`
      SELECT
        COALESCE(SUM(role = 'citizen' AND is_active <> -1), 0) AS total_citoyens,
        COALESCE(SUM(role = 'agent' AND is_active = 1), 0) AS total_agents,
        COALESCE(SUM(role = 'agent' AND is_active = 0), 0) AS agents_en_attente_validation
      FROM users
    `);

    const data = {
      ...toNumberStats(demandesStats),
      ...toNumberStats(usersStats)
    };
    data.taux_approbation = percent(data.approuvees, data.total_demandes);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getByCommune = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        commune,
        cercle,
        COUNT(*) AS total,
        COALESCE(SUM(statut = 'accepte'), 0) AS approuvees,
        COALESCE(SUM(statut = 'refuse'), 0) AS rejetees,
        COALESCE(SUM(statut IN ('en_cours_analyse','documents_corriges','avis_favorable','decision_imprimee')), 0) AS en_attente
      FROM demandes
      GROUP BY commune, cercle
      ORDER BY total DESC, commune ASC
    `);

    res.json({
      success: true,
      data: rows.map(row => ({
        ...row,
        taux_approbation: percent(row.approuvees, row.total)
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getByAgent = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        u.id AS agent_id,
        u.full_name,
        u.username,
        COALESCE(COUNT(DISTINCT CASE
          WHEN wh.nouveau_statut IN ('accepte','refuse','documents_rejetes','avis_favorable','decision_imprimee')
            THEN wh.demande_id
        END), 0) AS total_traitees,
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

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTimeline = async (req, res) => {
  try {
    const { from, to, group_by = 'month' } = req.query;
    const groupExpr = {
      day: "DATE_FORMAT(date_creation, '%Y-%m-%d')",
      week: "DATE_FORMAT(DATE_SUB(DATE(date_creation), INTERVAL WEEKDAY(date_creation) DAY), '%Y-%m-%d')",
      month: "DATE_FORMAT(date_creation, '%Y-%m')"
    }[group_by] || "DATE_FORMAT(date_creation, '%Y-%m')";

    const clauses = ['1=1'];
    const params = [];
    if (from) {
      clauses.push('DATE(date_creation) >= ?');
      params.push(from);
    }
    if (to) {
      clauses.push('DATE(date_creation) <= ?');
      params.push(to);
    }

    const [rows] = await db.execute(`
      SELECT
        ${groupExpr} AS date,
        COUNT(*) AS total,
        COALESCE(SUM(statut = 'accepte'), 0) AS approuvees,
        COALESCE(SUM(statut = 'refuse'), 0) AS rejetees
      FROM demandes
      WHERE ${clauses.join(' AND ')}
      GROUP BY ${groupExpr}
      ORDER BY date ASC
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.searchCitoyen = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ success: false, message: 'Parametre q requis' });
    }

    const like = `%${q}%`;
    const [citoyens] = await db.execute(`
      SELECT id, full_name, username, phone, email, created_at
      FROM users
      WHERE role = 'citizen'
        AND is_active <> -1
        AND (full_name LIKE ? OR username LIKE ? OR phone LIKE ? OR email LIKE ?)
      ORDER BY created_at DESC
      LIMIT 1
    `, [like, like, like, like]);

    const [matchedDemandes] = await db.execute(`
      SELECT d.*
      FROM demandes d
      WHERE d.nom_complet LIKE ?
         OR d.cin LIKE ?
         OR d.numero_dossier LIKE ?
      ORDER BY d.date_creation DESC
      LIMIT 1
    `, [like, like, like]);

    let citoyen = citoyens[0] || null;
    if (!citoyen && matchedDemandes[0]?.citizen_user_id) {
      const [linked] = await db.execute(`
        SELECT id, full_name, username, phone, email, created_at
        FROM users
        WHERE id = ? AND role = 'citizen'
      `, [matchedDemandes[0].citizen_user_id]);
      citoyen = linked[0] || null;
    }

    const demandeSeed = matchedDemandes[0] || null;
    const params = [];
    const clauses = [];
    if (citoyen?.id) {
      clauses.push('d.citizen_user_id = ?');
      params.push(citoyen.id);
    }
    if (demandeSeed?.cin) {
      clauses.push('d.cin = ?');
      params.push(demandeSeed.cin);
    }
    if (demandeSeed?.nom_complet) {
      clauses.push('d.nom_complet = ?');
      params.push(demandeSeed.nom_complet);
    }

    let demandes = [];
    if (clauses.length) {
      const [rows] = await db.execute(`
        SELECT
          d.*,
          u.full_name AS created_by_full_name,
          cu.full_name AS citizen_full_name,
          last_we.action AS workflow_last_event,
          last_we.date_action AS workflow_last_event_at
        FROM demandes d
        LEFT JOIN users u ON u.id = d.created_by
        LEFT JOIN users cu ON cu.id = d.citizen_user_id
        LEFT JOIN workflow_history last_we
          ON last_we.id = (
            SELECT wh2.id
            FROM workflow_history wh2
            WHERE wh2.demande_id = d.id
            ORDER BY wh2.date_action DESC, wh2.id DESC
            LIMIT 1
          )
        WHERE ${clauses.map(c => `(${c})`).join(' OR ')}
        ORDER BY d.date_creation DESC
      `, params);
      demandes = rows;
    }

    if (!citoyen && demandeSeed) {
      citoyen = {
        id: demandeSeed.citizen_user_id || null,
        full_name: demandeSeed.nom_complet,
        username: demandeSeed.cin,
        phone: null,
        email: null,
        created_at: demandeSeed.date_creation
      };
    }

    if (!citoyen && !demandes.length) {
      return res.status(404).json({ success: false, message: 'Aucun citoyen ou dossier trouve' });
    }

    res.json({
      success: true,
      data: {
        citoyen,
        demandes,
        total_licences_approuvees: demandes.filter(d => d.statut === 'accepte').length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportDemandes = async (req, res) => {
  try {
    const { where, params } = buildDemandesWhere(req.query);
    const [rows] = await db.execute(`
      SELECT
        d.*,
        u.full_name AS created_by_full_name,
        cu.full_name AS citizen_full_name,
        last_we.action AS workflow_last_event,
        last_we.date_action AS workflow_last_event_at,
        decision_we.date_action AS date_decision
      FROM demandes d
      LEFT JOIN users u ON u.id = d.created_by
      LEFT JOIN users cu ON cu.id = d.citizen_user_id
      LEFT JOIN workflow_history last_we
        ON last_we.id = (
          SELECT wh2.id
          FROM workflow_history wh2
          WHERE wh2.demande_id = d.id
          ORDER BY wh2.date_action DESC, wh2.id DESC
          LIMIT 1
        )
      LEFT JOIN workflow_history decision_we
        ON decision_we.id = (
          SELECT wh3.id
          FROM workflow_history wh3
          WHERE wh3.demande_id = d.id
            AND (
              wh3.nouveau_statut IN ('accepte', 'refuse', 'documents_rejetes', 'avis_favorable', 'decision_imprimee')
            )
          ORDER BY wh3.date_action DESC, wh3.id DESC
          LIMIT 1
        )
      WHERE ${where}
      ORDER BY d.date_creation DESC
    `, params);

    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.forceStatut = async (req, res) => {
  try {
    const { statut, motif } = req.body;
    const next = normalizeIncomingStatut(statut);
    const allowed = new Set(Object.values(STATUTS));
    if (!allowed.has(next)) {
      return res.status(400).json({ success: false, message: 'Statut invalide' });
    }
    if (!motif || !String(motif).trim()) {
      return res.status(400).json({ success: false, message: 'Motif requis' });
    }

    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }

    const demande = rows[0];
    const prev = demande.statut;
    const isDocReject = next === STATUTS.DOCUMENTS_REJETES;
    const isFinal = next === STATUTS.ACCEPTE || next === STATUTS.REFUSE;

    await db.execute(
      `UPDATE demandes
       SET statut = ?,
           motif_rejet_fichier = CASE WHEN ? = 'documents_rejetes' THEN ? ELSE motif_rejet_fichier END,
           notes = CASE WHEN ? IN ('refuse','accepte','avis_favorable') THEN ? ELSE notes END
       WHERE id = ?`,
      [next, next, motif.trim(), next, motif.trim(), req.params.id]
    );

    await logAudit(req, {
      action: 'ADMIN_FORCE_STATUT',
      entityType: 'demande',
      entityId: req.params.id,
      details: {
        numero_dossier: demande.numero_dossier,
        ancien_statut: prev,
        nouveau_statut: next,
        motif: motif.trim()
      }
    });

    const [updated] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
    await logStatutChange(updated[0], prev, {
      action: 'admin_forcer_statut',
      utilisateur_id: req.user.id,
      role_utilisateur: 'admin',
      commentaire: motif.trim(),
      raison_rejet: isDocReject || isFinal ? motif.trim() : null
    });

    res.json({ success: true, message: 'Statut force avec succes', data: updated[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
