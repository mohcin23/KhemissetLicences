const db = require('../db/connection');

const STATUTS = {
  EN_COURS_ANALYSE: 'en_cours_analyse',
  DOCUMENTS_REJETES: 'documents_rejetes',
  DOCUMENTS_CORRIGES: 'documents_corriges',
  AVIS_FAVORABLE: 'avis_favorable',
  DECISION_IMPRIMEE: 'decision_imprimee',
  ACCEPTE: 'accepte',
  REFUSE: 'refuse',
  ARCHIVE: 'archive',
  ANNULE: 'annule'
};

const fetchUserDisplayName = async (userId) => {
  if (!userId) return null;
  const [rows] = await db.execute(
    'SELECT COALESCE(NULLIF(TRIM(full_name), ""), username) AS nom FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0]?.nom || null;
};

const appendWorkflowHistory = async ({
  demande_id,
  ancien_statut,
  nouveau_statut,
  action,
  commentaire = null,
  raison_rejet = null,
  utilisateur_id = null,
  role_utilisateur = 'system'
}) => {
  const utilisateur_nom = await fetchUserDisplayName(utilisateur_id);

  const [prev] = await db.execute(
    `SELECT date_action FROM workflow_history
     WHERE demande_id = ?
     ORDER BY date_action DESC, id DESC
     LIMIT 1`,
    [demande_id]
  );

  let temps_traitement = null;
  if (prev.length) {
    const [[row]] = await db.execute(
      'SELECT TIMESTAMPDIFF(SECOND, ?, NOW()) AS secs',
      [prev[0].date_action]
    );
    temps_traitement = row?.secs != null ? Math.max(0, Number(row.secs)) : null;
  }

  const [result] = await db.execute(
    `INSERT INTO workflow_history
      (demande_id, ancien_statut, nouveau_statut, action, commentaire, raison_rejet,
       utilisateur_id, utilisateur_nom, role_utilisateur, date_action, temps_traitement)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      demande_id,
      ancien_statut || null,
      nouveau_statut,
      action,
      commentaire,
      raison_rejet,
      utilisateur_id,
      utilisateur_nom,
      role_utilisateur || 'system',
      temps_traitement
    ]
  );

  return { id: result.insertId, temps_traitement };
};

const getCitizenUserId = (demande) => demande.citizen_user_id || demande.created_by;

const notifyAgentsOfNewDemande = async (demande_id) => {
  const [agents] = await db.execute(
    `SELECT id FROM users WHERE role='agent' AND is_active = 1`
  );
  if (!agents.length) return;

  const values = agents.map(agent => [
    agent.id,
    demande_id,
    'nouveau_dossier',
    'Nouveau dossier déposé par un citoyen',
    'Un nouveau dossier a été déposé par un citoyen et attend traitement.'
  ]);

  await db.query(
    `INSERT INTO notifications (user_id, demande_id, type, titre, message)
     VALUES ${values.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
    values.flat()
  );
};

const notifyCitizen = async (demande, type, titre, message) => {
  const userId = getCitizenUserId(demande);
  if (!userId) return;
  await db.execute(
    `INSERT INTO notifications (user_id, demande_id, type, titre, message)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, demande.id, type, titre, message]
  );
};

const notifyAgentOwner = async (demande, type, titre, message) => {
  const agentId = demande.created_by;
  if (!agentId) return;
  await db.execute(
    `INSERT INTO notifications (user_id, demande_id, type, titre, message)
     VALUES (?, ?, ?, ?, ?)`,
    [agentId, demande.id, type, titre, message]
  );
};

const notifyLegacyEventType = async (event_type, demande, message) => {
  switch (event_type) {
    case 'demande_deposee':
      return notifyAgentsOfNewDemande(demande.id);
    case 'fichier_rejete':
      return notifyCitizen(
        demande,
        'fichier_rejete',
        'Documents rejetés',
        `Vos documents ont été rejetés — Motif : ${message || 'Non précisé'}`
      );
    case 'fichier_corrige':
      return notifyAgentOwner(
        demande,
        'fichier_accepte',
        'Le citoyen a corrigé son dossier',
        'Le citoyen a corrigé son dossier et il est de nouveau en attente de traitement.'
      );
    case 'decision_imprimee':
      return notifyCitizen(
        demande,
        'decision_imprimee',
        'Décision imprimée',
        'Décision imprimée — en attente du chef de service.'
      );
    case 'transmis_au_chef':
      return notifyCitizen(
        demande,
        'transmis_responsable',
        'Transmis au responsable',
        'Votre dossier a été transmis au responsable.'
      );
    case 'approuve':
      return notifyCitizen(
        demande,
        'approuve',
        'Demande acceptée',
        'Votre demande a été acceptée. Présentez-vous en personne.'
      );
    case 'rejete':
      return notifyCitizen(
        demande,
        'rejete',
        'Demande refusée',
        `Votre demande a été refusée. Motif : ${demande.notes || message || 'Non précisé'}`
      );
    default:
      return Promise.resolve();
  }
};

const buildNotificationForStatus = async (nouveauStatut, demande, { raison, message } = {}) => {
  switch (nouveauStatut) {
    case STATUTS.EN_COURS_ANALYSE:
      if (demande._prevStatut === STATUTS.DOCUMENTS_REJETES) {
        return notifyAgentOwner(
          demande,
          'fichier_accepte',
          'Le citoyen a corrigé son dossier',
          'Le citoyen a transmis des documents corrigés ; le dossier est de nouveau en analyse.'
        );
      }
      return Promise.resolve();
    case STATUTS.DECISION_IMPRIMEE:
      return notifyCitizen(
        demande,
        'decision_imprimee',
        'Décision imprimée',
        'Décision imprimée — en attente de transmission au responsable.'
      );
    case STATUTS.ACCEPTE:
      return notifyCitizen(
        demande,
        'approuve',
        'Demande acceptée',
        'Votre demande a été acceptée. Présentez-vous selon les instructions reçues.'
      );
    case STATUTS.REFUSE:
      return notifyCitizen(
        demande,
        'rejete',
        'Demande refusée',
        `Votre demande a été refusée. Motif : ${raison || message || 'Non précisé'}`
      );
    default:
      return Promise.resolve();
  }
};

const logStatutChange = async (demande, prevStatut, {
  action,
  utilisateur_id = null,
  role_utilisateur = 'system',
  commentaire = null,
  raison_rejet = null
}) => {
  const d = { ...demande, _prevStatut: prevStatut };
  await appendWorkflowHistory({
    demande_id: demande.id,
    ancien_statut: prevStatut,
    nouveau_statut: demande.statut,
    action: action || 'changement_statut',
    commentaire,
    raison_rejet,
    utilisateur_id,
    role_utilisateur
  });
  await buildNotificationForStatus(demande.statut, d, {
    raison: raison_rejet || demande.motif_rejet_fichier,
    message: commentaire
  });
};

const logWorkflowEvent = async (
  demande_id,
  event_type,
  triggered_by = null,
  triggered_by_role = 'system',
  message = null,
  opts = {}
) => {
  const [demandeRows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [demande_id]);
  if (!demandeRows.length) {
    throw new Error(`Demande not found: ${demande_id}`);
  }
  const demande = demandeRows[0];
  const nouveau = opts.nouveau_statut != null ? opts.nouveau_statut : demande.statut;
  const ancien = opts.ancien_statut !== undefined ? opts.ancien_statut : null;

  await appendWorkflowHistory({
    demande_id,
    ancien_statut: ancien,
    nouveau_statut: nouveau,
    action: event_type,
    commentaire: event_type === 'fichier_rejete' ? null : message,
    raison_rejet: event_type === 'fichier_rejete' ? message : null,
    utilisateur_id: triggered_by,
    role_utilisateur: triggered_by_role
  });

  await notifyLegacyEventType(event_type, demande, message);
};

module.exports = { logWorkflowEvent, logStatutChange, buildNotificationForStatus, STATUTS };
