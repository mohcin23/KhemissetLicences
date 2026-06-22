const jwt = require('jsonwebtoken');
const db = require('../db/connection');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
}

module.exports = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await db.execute(
      'SELECT id, email, username, full_name, role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
    }

    const user = rows[0];
    if (user.role !== 'admin' && Number(user.is_active) !== 1) {
      return res.status(403).json({ success: false, message: 'Compte en attente de validation' });
    }

    req.user = {
      ...decoded,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expire' });
  }
};
