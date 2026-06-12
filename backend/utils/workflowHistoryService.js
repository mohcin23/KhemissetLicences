const db = require('../db/connection');
const { STATUTS } = require('../constants/workflowStatuses');

const fetchUserDisplayName = async (userId) => {
  if (!userId) return null;
  const [rows] = await db.execute(
    'SELECT COALESCE(NULLIF(TRIM(full_name), ""), username) AS nom FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0]?.nom || null;
};

/**
 * Enregistre une ligne d'historique et calcule temps_traitement (secondes).
 */
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

module.exports = {
  appendWorkflowHistory,
  fetchUserDisplayName
};
