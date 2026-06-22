const db = require('../db/connection');
const { STATUTS } = require('../constants/workflowStatuses');

const appendWorkflowHistory = async ({ demande_id, ancien_statut, nouveau_statut, action, commentaire, raison_rejet, utilisateur_id, role_utilisateur }) => {
  try {
    await db.execute(
      `INSERT INTO workflow_history (demande_id, ancien_statut, nouveau_statut, action, commentaire, raison_rejet, utilisateur_id, role_utilisateur, date_action)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [demande_id, ancien_statut || null, nouveau_statut, action, commentaire || null, raison_rejet || null, utilisateur_id || null, role_utilisateur || 'system']
    );
  } catch (err) { console.warn('Workflow history warning:', err.message); }
};

const logWorkflowEvent = async (demande_id, event_type, triggered_by, triggered_by_role, message, opts = {}) => {
  const [demandeRows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [demande_id]);
  if (!demandeRows.length) return;
  const demande = demandeRows[0];
  const nouveau = opts.nouveau_statut != null ? opts.nouveau_statut : demande.statut;
  const ancien = opts.ancien_statut !== undefined ? opts.ancien_statut : null;
  await appendWorkflowHistory({ demande_id, ancien_statut: ancien, nouveau_statut: nouveau, action: event_type, commentaire: event_type === 'fichier_rejete' ? null : message, raison_rejet: event_type === 'fichier_rejete' ? message : null, utilisateur_id: triggered_by, role_utilisateur: triggered_by_role });
};

const logStatutChange = async (demande, prevStatut, { action, utilisateur_id, role_utilisateur, commentaire, raison_rejet }) => {
  await appendWorkflowHistory({ demande_id: demande.id, ancien_statut: prevStatut, nouveau_statut: demande.statut, action: action || 'changement_statut', commentaire, raison_rejet, utilisateur_id, role_utilisateur });
};

module.exports = { logWorkflowEvent, logStatutChange };
