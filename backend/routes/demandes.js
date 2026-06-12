const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/demandesController');
const pjCtrl  = require('../controllers/piecesJointesController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole }  = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// ── Statistiques ──────────────────────────────────────────────────────────────
router.get('/stats/monthly',   checkRole(['admin']),                      ctrl.getMonthlyStats);
router.get('/stats',           checkRole(['admin']),                      ctrl.getStats);
router.get('/agent-dashboard', checkRole(['admin', 'agent']),             ctrl.getAgentDashboard);

// ── Demandes ──────────────────────────────────────────────────────────────────
// NOTE : Le POST (création) est réservé aux agents.
//        Les admins gèrent les utilisateurs et les statistiques, pas les dossiers.
//        Les citoyens passent par /api/citizen/demandes.
router.get('/',        checkRole(['admin', 'agent', 'lecteur']), ctrl.getDemandes);
router.post('/',       checkRole(['agent']),                     ctrl.createDemande);   // ← admin retiré
router.get('/:id',     checkRole(['admin', 'agent', 'lecteur']), ctrl.getDemandeById);
router.put('/:id',     checkRole(['agent']),                     ctrl.updateDemande);   // ← admin retiré
router.delete('/:id',  checkRole(['agent']),                     ctrl.deleteDemande);

// ── Changements de statut (workflow) ─────────────────────────────────────────
router.patch('/:id/rejeter-fichier',        checkRole(['agent']), ctrl.rejeterFichier);
router.patch('/:id/statut',                 checkRole(['agent']), ctrl.updateStatut);
router.patch('/:id/valider-provisoire',     checkRole(['agent']), ctrl.validerProvisoire);
router.patch('/:id/accepter-definitif',     checkRole(['agent']), ctrl.accepterDefinitif);
router.patch('/:id/refuser-gouverneur',     checkRole(['agent']), ctrl.refuserGouverneur);
router.patch('/:id/refuser-employe',        checkRole(['agent']), ctrl.refuserEmploye);
router.patch('/:id/corriger',               checkRole(['agent']), ctrl.corrigerDossier);

// ── Pièces jointes ────────────────────────────────────────────────────────────
// Accessible aux agents, admins ET citoyens (pour leurs propres dossiers)
router.post(  '/:id/pieces-jointes',                 checkRole(['agent', 'citizen']), pjCtrl.uploadPiecesJointes);
router.get(   '/:id/pieces-jointes',                 checkRole(['admin', 'agent', 'citizen', 'lecteur']), pjCtrl.listPiecesJointes);
router.get(   '/:id/pieces-jointes/:pjId/download',  checkRole(['admin', 'agent', 'citizen', 'lecteur']), pjCtrl.downloadPieceJointe);
router.delete('/:id/pieces-jointes/:pjId',           checkRole(['agent']),            pjCtrl.deletePieceJointe);

module.exports = router;
