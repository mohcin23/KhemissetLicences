const db = require('../db/connection');
const { STATUTS } = require('../constants/workflowStatuses');
const { appendWorkflowHistory } = require('./workflowHistoryService');

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

/** Notifications liées aux anciens codes event_type (compatibilité). */
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

/**
 * Notifications après changement de statut (source de vérité = colonne demandes.statut).
 */
const buildNotificationForStatus = async (nouveauStatut, demande, { raison, message } = {}) => {
  switch (nouveauStatut) {
    case STATUTS.DEPOSE:
      return notifyAgentsOfNewDemande(demande.id);
    case STATUTS.DOCUMENTS_REJETES:
      return notifyCitizen(
        demande,
        'fichier_rejete',
        'Documents rejetés',
        `Vos documents ont été rejetés — Motif : ${raison || message || 'Non précisé'}`
      );
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
    case STATUTS.TRANSMIS_RESPONSABLE:
      return notifyCitizen(
        demande,
        'transmis_responsable',
        'Dossier transmis au responsable',
        'Votre dossier a été transmis au responsable pour décision finale.'
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

/**
 * Après mise à jour de la ligne demande en base.
 */
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

/**
 * Journalise un événement métier.
 * Si `opts.ancien_statut` / `opts.nouveau_statut` sont fournis, ils sont utilisés pour l'historique
 * (sinon nouveau_statut = statut courant en base, ancien_statut = null).
 */
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
    throw new Error(`Demande introuvable: ${demande_id}`);
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

module.exports = { logWorkflowEvent, logStatutChange, buildNotificationForStatus };
