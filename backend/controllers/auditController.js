const db = require('../db/connection');
const { logAudit } = require('../utils/auditLogger');

exports.getAuditLogs = async (req, res) => {
  try {
    const { user_id, action, page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNumber - 1) * pageLimit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (user_id) {
      whereClause += ' AND user_id = ?';
      params.push(user_id);
    }
    if (action) {
      whereClause += ' AND action = ?';
      params.push(action);
    }

    const [rows] = await db.execute(
      `SELECT id, user_id, user_name, action, entity_type, entity_id, details, ip_address, created_at
       FROM audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${pageLimit} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );

    res.json({ success: true, data: rows, total, page: pageNumber, limit: pageLimit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAuditFilters = async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT user_id, COALESCE(user_name, CONCAT('Utilisateur #', user_id)) AS user_name
       FROM audit_logs
       WHERE user_id IS NOT NULL
       GROUP BY user_id, user_name
       ORDER BY user_name ASC`
    );
    const [actions] = await db.execute(
      `SELECT action FROM audit_logs GROUP BY action ORDER BY action ASC`
    );
    res.json({ success: true, users, actions: actions.map(row => row.action) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PHASE 4 FINAL: Export audit logs as CSV
exports.exportAuditCSV = async (req, res) => {
  try {
    const { user_id, action, from, to } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (user_id) { whereClause += ' AND user_id = ?'; params.push(user_id); }
    if (action) { whereClause += ' AND action = ?'; params.push(action); }
    if (from) { whereClause += ' AND DATE(created_at) >= ?'; params.push(from); }
    if (to) { whereClause += ' AND DATE(created_at) <= ?'; params.push(to); }

    const [rows] = await db.execute(
      `SELECT id, user_name, action, entity_type, entity_id, details, ip_address, created_at
       FROM audit_logs ${whereClause}
       ORDER BY created_at DESC LIMIT 10000`, params
    );

    const header = '"Date/Heure","Utilisateur","Action","Type","ID Entité","Détails","IP"';
    const csvRows = rows.map(r => {
      const date = new Date(r.created_at).toISOString();
      const details = (r.details || '').replace(/"/g, '""');
      return `"${date}","${r.user_name || ''}","${r.action}","${r.entity_type || ''}","${r.entity_id || ''}","${details}","${r.ip_address || ''}"`;
    });
    const csv = [header, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.logExcelExport = async (req, res) => {
  // Export Excel = consultation banale, pas d'intérêt pour le journal admin
  res.json({ success: true });
};
