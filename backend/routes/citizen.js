const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/citizenController');
const pjCtrl  = require('../controllers/piecesJointesController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole }  = require('../middleware/roleMiddleware');

// Public tracking endpoint: no JWT required.
router.get('/track/:numero_dossier', ctrl.trackPublic);

router.use(authMiddleware);
router.use(checkRole(['citizen']));

// ── Demandes du citoyen ───────────────────────────────────────────────────────
router.get( '/demandes',     ctrl.getMesDemandes);
router.post('/demandes',     ctrl.createDemande);
router.get( '/demandes/:id', ctrl.getDemandeById);
router.put( '/demandes/:id', ctrl.updateDemande);

// ── Pièces jointes (citoyen accède via ses propres demandes) ──────────────────
// La vérification de propriété est faite dans le contrôleur pjCtrl (assertCitizenOwns).
router.post('/demandes/:id/pieces-jointes',                ctrl.uploadPiecesJointes);
router.get( '/demandes/:id/pieces-jointes',                ctrl.listPiecesJointes);
router.get( '/demandes/:id/pieces-jointes/:pjId/download', ctrl.downloadPieceJointe);

module.exports = router;
