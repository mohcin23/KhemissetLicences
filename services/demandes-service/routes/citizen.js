const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/demandesController');
const pjCtrl = require('../controllers/piecesJointesController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', ctrl.getCitizenDemandes);
router.post('/', ctrl.createCitizenDemande);
router.get('/:id', ctrl.getCitizenDemandeById);
router.patch('/:id/annuler', ctrl.annulerCitizenDemande);
router.post('/:id/pieces-jointes', pjCtrl.uploadPiecesJointes);
router.get('/:id/pieces-jointes', pjCtrl.listPiecesJointes);
router.get('/:id/pieces-jointes/:pjId/download', pjCtrl.downloadPieceJointe);

module.exports = router;
