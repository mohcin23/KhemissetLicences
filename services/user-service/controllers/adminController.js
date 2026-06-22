const db = require('../db/connection');
const bcrypt = require('bcryptjs');
const { logAudit } = require('../utils/auditLogger');

exports.getUsers = async (req, res) => {
  try {
    const { role, is_active, search, page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * (parseInt(limit, 10) || 50);
    const pageLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const clauses = ['u.is_active <> -1'];
    const params = [];

    if (role) {
      clauses.push('u.role = ?');
      params.push(role);
    }
    if (is_active !== undefined && is_active !== '') {
      clauses.push('u.is_active = ?');
      params.push(Number(is_active));
    }
    if (search) {
      clauses.push('(u.full_name LIKE ? OR u.username LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = clauses.join(' AND ');
    const [rows] = await db.execute(
      `SELECT
         u.id,
         u.full_name,
         u.username,
         u.role,
         u.is_active,
         u.created_at,
         u.approved_at,
         approver.full_name AS approved_by_name,
         (
           SELECT COUNT(DISTINCT d.id)
           FROM demandes d
           WHERE d.created_by = u.id OR d.citizen_user_id = u.id
         ) AS total_demandes
       FROM users u
       LEFT JOIN users approver ON approver.id = u.approved_by
       WHERE ${where}
       ORDER BY u.is_active ASC, u.created_at DESC
       LIMIT ${pageLimit} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      total,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: pageLimit
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, username, full_name, role, is_active FROM users WHERE id = ? AND is_active <> -1',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }
    if (Number(rows[0].is_active) === 1) {
      return res.status(400).json({ success: false, message: 'Compte déjà actif' });
    }

    const [result] = await db.execute(
      `UPDATE users
       SET is_active = 1, approved_by = ?, approved_at = NOW()
       WHERE id = ? AND is_active <> -1`,
      [req.user.id, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    await logAudit(req, {
      action: 'AGENT_APPROVE',
      entityType: 'user',
      entityId: req.params.id,
      details: { approved_by: req.user.id, username: rows[0].username, role: rows[0].role }
    });

    res.json({ success: true, message: 'Compte approuvé et activé avec succès' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectUser = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, username, full_name, is_active FROM users WHERE id = ? AND is_active <> -1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }
    if (Number(rows[0].is_active) === 1) {
      return res.status(400).json({ success: false, message: 'Impossible de refuser un compte déjà actif' });
    }

    await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);

    await logAudit(req, {
      action: 'AGENT_REJECT',
      entityType: 'user',
      entityId: req.params.id,
      details: { username: rows[0].username, full_name: rows[0].full_name }
    });

    res.json({ success: true, message: 'Compte refusé et supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Impossible de modifier votre propre compte' });
    }

    const [rows] = await db.execute(
      'SELECT id, username, full_name, role, is_active FROM users WHERE id = ? AND is_active <> -1',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    const next = Number(rows[0].is_active) === 1 ? 0 : 1;
    await db.execute(
      `UPDATE users
       SET is_active = ?,
           approved_by = CASE WHEN ? = 1 THEN ? ELSE approved_by END,
           approved_at = CASE WHEN ? = 1 THEN NOW() ELSE approved_at END
       WHERE id = ?`,
      [next, next, req.user.id, next, req.params.id]
    );

    await logAudit(req, {
      action: 'USER_TOGGLE_ACTIVE',
      entityType: 'user',
      entityId: req.params.id,
      details: { username: rows[0].username, ancien: rows[0].is_active, nouveau: next }
    });

    res.json({ success: true, message: next === 1 ? 'Utilisateur active' : 'Utilisateur desactive', is_active: next });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer votre propre compte' });
    }

    const [rows] = await db.execute(
      'SELECT id, username, full_name, role FROM users WHERE id = ? AND is_active <> -1',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    const [[{ activeDemandes }]] = await db.execute(
      `SELECT COUNT(*) AS activeDemandes
       FROM demandes
       WHERE statut NOT IN ('accepte','refuse','archive')
         AND (created_by = ? OR citizen_user_id = ?)`,
      [req.params.id, req.params.id]
    );
    if (Number(activeDemandes) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Suppression refusee: utilisateur lie a des demandes en attente'
      });
    }

    await db.execute(
      `UPDATE users
       SET is_active = -1, deleted_at = NOW()
       WHERE id = ?`,
      [req.params.id]
    );

    await logAudit(req, {
      action: 'USER_SOFT_DELETE',
      entityType: 'user',
      entityId: req.params.id,
      details: { username: rows[0].username, full_name: rows[0].full_name, role: rows[0].role }
    });

    res.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const { full_name, email, password, role = 'agent' } = req.body;
    const allowedRoles = ['agent'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role invalide pour un employé' });
    }
    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({ success: false, message: 'Nom complet requis' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Adresse email invalide' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mot de passe trop court (min 6 caractères)' });
    }

    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Adresse email déjà utilisée' });
    }

    let username = email.trim().split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '') || 'user';
    let suffix = 1;
    while (true) {
      const [existingUsername] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
      if (!existingUsername.length) break;
      username = email.trim().split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '') + suffix;
      suffix++;
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      `INSERT INTO users (full_name, username, email, password_hash, role, is_active, approved_by, approved_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, NOW())`,
      [full_name.trim(), username, email.trim(), hashed, role, req.user.id]
    );

    await logAudit(req, {
      action: 'EMPLOYEE_CREATE',
      entityType: 'user',
      entityId: result.insertId,
      details: { full_name: full_name.trim(), email: email.trim(), username, role }
    });

    const [created] = await db.execute(
      'SELECT id, full_name, email, username, role, is_active, approved_by, approved_at, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ success: true, message: 'Employé créé avec succès', data: created[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserActivity = async (req, res) => {
  try {
    const [logs] = await db.execute(
      `SELECT id, action, entity_type, entity_id, details, created_at
       FROM audit_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.params.id]
    );
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.changeRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['admin', 'agent', 'citizen'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role invalide' });
    }
    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Impossible de changer votre propre role' });
    }

    const [rows] = await db.execute(
      'SELECT id, username, full_name, role FROM users WHERE id = ? AND is_active <> -1',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    await logAudit(req, {
      action: 'USER_CHANGE_ROLE',
      entityType: 'user',
      entityId: req.params.id,
      details: { username: rows[0].username, ancien_role: rows[0].role, nouveau_role: role }
    });

    res.json({ success: true, message: 'Rôle mis à jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
