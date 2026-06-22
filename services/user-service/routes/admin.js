const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', adminCtrl.getUsers);
router.post('/create-employee', adminCtrl.createEmployee);
router.post('/users/:id/approve', adminCtrl.approveUser);
router.post('/users/:id/reject', adminCtrl.rejectUser);
router.post('/users/:id/toggle-active', adminCtrl.toggleActive);
router.post('/users/:id/change-role', adminCtrl.changeRole);
router.delete('/users/:id', adminCtrl.deleteUser);
router.get('/users/:id/activity', adminCtrl.getUserActivity);

const db = require('../db/connection');

router.get('/stats/overview', async (req, res) => {
  try {
    const [[{ totalUsers }]] = await db.execute('SELECT COUNT(*) AS totalUsers FROM users WHERE is_active <> -1');
    const [[{ activeUsers }]] = await db.execute('SELECT COUNT(*) AS activeUsers FROM users WHERE is_active = 1');
    const [[{ pendingUsers }]] = await db.execute('SELECT COUNT(*) AS pendingUsers FROM users WHERE is_active = 0');
    const [[{ totalDemandes }]] = await db.execute('SELECT COUNT(*) AS totalDemandes FROM demandes');
    const [[{ demandesEnCours }]] = await db.execute("SELECT COUNT(*) AS demandesEnCours FROM demandes WHERE statut NOT IN ('accepte','refuse','archive')");
    const [[{ demandesAcceptees }]] = await db.execute("SELECT COUNT(*) AS demandesAcceptees FROM demandes WHERE statut = 'accepte'");
    const [[{ demandesRefusees }]] = await db.execute("SELECT COUNT(*) AS demandesRefusees FROM demandes WHERE statut = 'refuse'");

    const [roleStats] = await db.execute("SELECT role, COUNT(*) AS count FROM users WHERE is_active <> -1 GROUP BY role");

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        pendingUsers,
        totalDemandes,
        demandesEnCours,
        demandesAcceptees,
        demandesRefusees,
        roleStats
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/stats/by-commune', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT commune, COUNT(*) AS total,
        SUM(CASE WHEN statut = 'accepte' THEN 1 ELSE 0 END) AS acceptees,
        SUM(CASE WHEN statut = 'refuse' THEN 1 ELSE 0 END) AS refusees,
        SUM(CASE WHEN statut NOT IN ('accepte','refuse','archive') THEN 1 ELSE 0 END) AS en_cours
      FROM demandes
      GROUP BY commune
      ORDER BY total DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/stats/by-agent', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.full_name AS agent_name, u.id AS agent_id,
        COUNT(d.id) AS total,
        SUM(CASE WHEN d.statut = 'accepte' THEN 1 ELSE 0 END) AS acceptees,
        SUM(CASE WHEN d.statut = 'refuse' THEN 1 ELSE 0 END) AS refusees,
        SUM(CASE WHEN d.statut NOT IN ('accepte','refuse','archive') THEN 1 ELSE 0 END) AS en_cours
      FROM users u
      LEFT JOIN demandes d ON d.created_by = u.id
      WHERE u.role IN ('admin','agent') AND u.is_active <> -1
      GROUP BY u.id, u.full_name
      ORDER BY total DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/stats/timeline', async (req, res) => {
  try {
    const { from, group_by = 'month' } = req.query;
    let groupExpr;
    if (group_by === 'day') {
      groupExpr = 'DATE(created_at)';
    } else {
      groupExpr = "DATE_FORMAT(created_at, '%Y-%m')";
    }
    const whereClause = from ? 'WHERE created_at >= ?' : '';
    const params = from ? [from] : [];

    const [rows] = await db.execute(`
      SELECT ${groupExpr} AS period,
        COUNT(*) AS total,
        SUM(CASE WHEN statut = 'accepte' THEN 1 ELSE 0 END) AS acceptees,
        SUM(CASE WHEN statut = 'refuse' THEN 1 ELSE 0 END) AS refusees,
        SUM(CASE WHEN statut NOT IN ('accepte','refuse','archive') THEN 1 ELSE 0 END) AS en_cours
      FROM demandes
      ${whereClause}
      GROUP BY period
      ORDER BY period ASC
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
