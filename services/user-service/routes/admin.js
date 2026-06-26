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
    const [[{ totalUsers }]] = await db.execute('SELECT COUNT(*) AS "totalUsers" FROM users WHERE is_active <> -1');
    const [[{ activeUsers }]] = await db.execute('SELECT COUNT(*) AS "activeUsers" FROM users WHERE is_active = 1');
    const [[{ pendingUsers }]] = await db.execute('SELECT COUNT(*) AS "pendingUsers" FROM users WHERE is_active = 0');
    const [[{ total_demandes }]] = await db.execute('SELECT COUNT(*) AS "total_demandes" FROM demandes');
    const [[{ en_attente }]] = await db.execute("SELECT COUNT(*) AS \"en_attente\" FROM demandes WHERE statut NOT IN ('accepte','refuse','archive')");
    const [[{ approuvees }]] = await db.execute("SELECT COUNT(*) AS \"approuvees\" FROM demandes WHERE statut = 'accepte'");
    const [[{ rejetees }]] = await db.execute("SELECT COUNT(*) AS \"rejetees\" FROM demandes WHERE statut = 'refuse'");
    const [[{ fichiers_rejetes }]] = await db.execute("SELECT COUNT(*) AS \"fichiers_rejetes\" FROM demandes WHERE statut = 'fichier_rejete'").catch(() => [{ fichiers_rejetes: 0 }]);
    const [[{ demandes_ce_semaine }]] = await db.execute("SELECT COUNT(*) AS \"demandes_ce_semaine\" FROM demandes WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'").catch(() => [{ demandes_ce_semaine: 0 }]);

    const [[{ total_agents }]] = await db.execute('SELECT COUNT(*) AS "total_agents" FROM users WHERE role IN (\'admin\',\'agent\') AND is_active <> -1');
    const taux = total_demandes > 0 ? Math.round((approuvees / total_demandes) * 100) + '%' : '0%';

    const [roleStats] = await db.execute("SELECT role, COUNT(*) AS count FROM users WHERE is_active <> -1 GROUP BY role");

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        pendingUsers,
        total_demandes,
        en_attente,
        approuvees,
        rejetees,
        fichiers_rejetes,
        demandes_ce_semaine,
        total_agents,
        taux_approbation: taux,
        temps_moyen_traitement_heures: null,
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
        SUM(CASE WHEN statut = 'accepte' THEN 1 ELSE 0 END) AS approuvees,
        SUM(CASE WHEN statut = 'refuse' THEN 1 ELSE 0 END) AS rejetees,
        SUM(CASE WHEN statut NOT IN ('accepte','refuse','archive') THEN 1 ELSE 0 END) AS en_cours,
        CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(CASE WHEN statut = 'accepte' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) || '%' ELSE '0%' END AS taux_approbation
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
      SELECT u.full_name AS full_name, u.username AS username, u.id AS agent_id,
        COUNT(d.id) AS total_traitees,
        SUM(CASE WHEN d.statut = 'accepte' THEN 1 ELSE 0 END) AS approuvees,
        SUM(CASE WHEN d.statut = 'refuse' THEN 1 ELSE 0 END) AS rejetees,
        SUM(CASE WHEN d.statut NOT IN ('accepte','refuse','archive') THEN 1 ELSE 0 END) AS en_cours
      FROM users u
      LEFT JOIN demandes d ON d.created_by = u.id
      WHERE u.role IN ('admin','agent') AND u.is_active <> -1
      GROUP BY u.id, u.full_name, u.username
      ORDER BY total_traitees DESC
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
      groupExpr = "TO_CHAR(created_at, 'YYYY-MM')";
    }
    const whereClause = from ? 'WHERE created_at >= $1' : '';
    const params = from ? [from] : [];

    const [rows] = await db.execute(`
      SELECT ${groupExpr} AS date,
        COUNT(*) AS total,
        SUM(CASE WHEN statut = 'accepte' THEN 1 ELSE 0 END) AS approuvees,
        SUM(CASE WHEN statut = 'refuse' THEN 1 ELSE 0 END) AS rejetees,
        SUM(CASE WHEN statut NOT IN ('accepte','refuse','archive') THEN 1 ELSE 0 END) AS en_cours
      FROM demandes
      ${whereClause}
      GROUP BY date
      ORDER BY date ASC
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
