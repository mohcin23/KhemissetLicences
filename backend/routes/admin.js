const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const adminStatsCtrl = require('../controllers/adminStatsController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Routes stats accessibles à tout le personnel (admin, agent, lecteur)
router.get('/stats/overview', checkRole(['admin', 'agent', 'lecteur']), adminStatsCtrl.getOverview);
router.get('/stats/by-commune', checkRole(['admin', 'agent', 'lecteur']), adminStatsCtrl.getByCommune);
router.get('/stats/by-agent', checkRole(['admin', 'agent', 'lecteur']), adminStatsCtrl.getByAgent);
router.get('/stats/timeline', checkRole(['admin', 'agent', 'lecteur']), adminStatsCtrl.getTimeline);
router.get('/search/citoyen', checkRole(['admin', 'agent', 'lecteur']), adminStatsCtrl.searchCitoyen);
router.get('/demandes/export', checkRole(['admin', 'agent', 'lecteur']), adminStatsCtrl.exportDemandes);

// Routes réservées à l'admin uniquement
router.use(checkRole(['admin']));

router.get('/users', adminCtrl.getUsers);
router.post('/create-employee', adminCtrl.createEmployee);
router.post('/users', adminCtrl.createEmployee); // PHASE 4 FINAL
router.get('/users/:id/activity', adminCtrl.getUserActivity); // PHASE 4 FINAL
router.patch('/users/:id/approve', adminCtrl.approveUser);
router.patch('/users/:id/reject', adminCtrl.rejectUser);
router.patch('/users/:id/toggle-active', adminCtrl.toggleActive);
router.patch('/users/:id/role', adminCtrl.changeRole);
router.delete('/users/:id', adminCtrl.deleteUser);

module.exports = router;
