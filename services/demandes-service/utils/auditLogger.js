const db = require('../db/connection');

const logAudit = async (req, { userId = req.user?.id || null, userName = req.user?.full_name || req.user?.username || null, action, entityType = null, entityId = null, details = null, ipAddress = req.ip || '' }) => {
  if (!action) return;
  try {
    const serialized = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;
    await db.execute(
      `INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, userName || null, action, entityType || null, entityId || null, serialized, ipAddress || null]
    );
  } catch (err) { console.warn('Audit log warning:', err.message); }
};

module.exports = { logAudit };
