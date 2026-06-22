const db = require('../db/connection');

exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, email, username, full_name, role, is_active, phone, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const updates = [];
    const params = [];

    if (full_name) {
      updates.push('full_name = ?');
      params.push(full_name.trim());
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun champ à modifier' });
    }

    params.push(req.user.id);
    await db.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [rows] = await db.execute(
      'SELECT id, email, username, full_name, role, is_active, phone, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getMyDemandes = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.*,
              u.full_name AS agent_responsable_nom,
              u.username AS agent_responsable_username
       FROM demandes d
       LEFT JOIN users u ON u.id = d.created_by
       WHERE d.citizen_user_id = ?
       ORDER BY d.date_creation DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
