const db = require('../db/connection');

exports.getNotifications = async (req, res) => {
  try {
    const unreadOnly = req.query.unread_only === 'true';
    const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    // MySQL2 exige des entiers JS natifs pour LIMIT/OFFSET (pas des strings)
    const limitInt  = limit  | 0;   // bitwise garantit un entier 32 bits
    const offsetInt = offset | 0;

    const whereClauses = ['user_id = ?'];
    const params = [req.user.id];
    if (unreadOnly) {
      whereClauses.push('is_read = 0');
    }
    const where = `WHERE ${whereClauses.join(' AND ')}`;

    const [rows] = await db.execute(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ${limitInt} OFFSET ${offsetInt}`,
      params
    );
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM notifications ${where}`,
      params
    );
    res.json({
      success: true,
      data: rows,
      total: Number(total),
      page,
      limit,
      has_more: offset + rows.length < Number(total)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const [[{ unread }]] = await db.execute(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ success: true, unread: Number(unread) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const [result] = await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Notification introuvable' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
