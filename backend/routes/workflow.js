const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

const forbidden = (res, message = 'Action interdite pour ce rôle') =>
  res.status(403).json({ success: false, message });

router.use(authMiddleware);
router.use(checkRole(['admin', 'agent', 'citizen']));

router.get('/:demande_id', async (req, res) => {
  try {
    const demandeId = req.params.demande_id;
    const [demandeRows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [demandeId]);
    if (!demandeRows.length) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }
    const demande = demandeRows[0];
    if (req.user.role === 'citizen' && Number(demande.citizen_user_id) !== Number(req.user.id)) {
      return forbidden(res);
    }

    const [events] = await db.execute(
      `SELECT
         h.id,
         h.demande_id,
         h.ancien_statut,
         h.nouveau_statut,
         h.action,
         h.commentaire,
         h.raison_rejet,
         h.utilisateur_id,
         h.utilisateur_nom,
         h.role_utilisateur,
         h.date_action,
         h.temps_traitement,
         h.action AS event_type,
         h.date_action AS created_at,
         COALESCE(h.raison_rejet, h.commentaire) AS message
       FROM workflow_history h
       WHERE h.demande_id = ?
       ORDER BY h.date_action ASC, h.id ASC`,
      [demandeId]
    );

    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message }); // PHASE 4 FINAL: removed console.error
  }
});

module.exports = router;
