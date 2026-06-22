const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/demandesController');
const pjCtrl = require('../controllers/piecesJointesController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/stats', checkRole(['admin']), ctrl.getStats);
router.get('/agent-dashboard', checkRole(['admin', 'agent']), ctrl.getAgentDashboard);

router.get('/', checkRole(['admin', 'agent']), ctrl.getDemandes);
router.post('/', checkRole(['agent']), ctrl.createDemande);
router.get('/:id', checkRole(['admin', 'agent']), ctrl.getDemandeById);
router.put('/:id', checkRole(['agent']), ctrl.updateDemande);
router.delete('/:id', checkRole(['agent']), ctrl.deleteDemande);

router.patch('/:id/statut', checkRole(['agent']), ctrl.updateStatut);
router.patch('/:id/valider-provisoire', checkRole(['agent']), ctrl.validerProvisoire);
router.patch('/:id/accepter-definitif', checkRole(['agent']), ctrl.accepterDefinitif);
router.patch('/:id/refuser-gouverneur', checkRole(['agent']), ctrl.refuserGouverneur);
router.patch('/:id/rejeter-fichier', checkRole(['agent']), ctrl.rejeterFichier);

router.post('/:id/pieces-jointes', checkRole(['agent', 'citizen']), pjCtrl.uploadPiecesJointes);
router.get('/:id/pieces-jointes', checkRole(['admin', 'agent', 'citizen']), pjCtrl.listPiecesJointes);
router.get('/:id/pieces-jointes/:pjId/download', checkRole(['admin', 'agent', 'citizen']), pjCtrl.downloadPieceJointe);
router.delete('/:id/pieces-jointes/:pjId', checkRole(['agent']), pjCtrl.deletePieceJointe);

module.exports = router;
