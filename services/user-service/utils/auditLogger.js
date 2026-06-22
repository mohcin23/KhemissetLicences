const db = require('../db/connection');

const getIpAddress = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
};

const getUserName = (req, fallback = '') =>
  req.user?.full_name || req.user?.username || fallback || null;

const serializeDetails = (details) => {
  if (!details) return null;
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
};

const logAudit = async (req, {
  userId = req.user?.id || null,
  userName = getUserName(req),
  action,
  entityType = null,
  entityId = null,
  details = null,
  ipAddress = getIpAddress(req)
}) => {
  if (!action) return;

  try {
    await db.execute(
      `INSERT INTO audit_logs
        (user_id, user_name, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        userName || null,
        action,
        entityType || null,
        entityId || null,
        serializeDetails(details),
        ipAddress || null
      ]
    );
  } catch (err) {
    console.warn('Audit log warning:', err.message);
  }
};

module.exports = { logAudit, getIpAddress };
