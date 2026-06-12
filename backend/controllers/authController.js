const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');
const { logAudit } = require('../utils/auditLogger');
const { sanitizeString, validateMaxLength } = require('../utils/validation');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
}
const JWT_EXPIRES = '8h';

exports.login = async (req, res) => {
  try {
    const username = sanitizeString(req.body.username);
    const password = sanitizeString(req.body.password);
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username et password requis' });
    }

    const [rows] = await db.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      // Tentative avec utilisateur inexistant — pas d'intérêt métier pour l'admin
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      // Mauvais mot de passe — bruit inutile dans le journal
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    if (user.role !== 'admin' && Number(user.is_active) !== 1) {
      // Compte en attente — l'admin le voit déjà dans la liste des agents
      return res.status(403).json({ success: false, message: 'Compte en attente de validation' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    // Connexion réussie : pas nécessaire dans le journal métier
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.register = async (req, res) => {
  try {
    const username = sanitizeString(req.body.username);
    const password = sanitizeString(req.body.password);
    const full_name = sanitizeString(req.body.full_name);

    if (!username || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Nom complet, username et password requis' });
    }
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ success: false, message: 'Le nom d\'utilisateur doit contenir entre 3 et 50 caractères' });
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return res.status(400).json({ success: false, message: 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et points' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }
    if (!validateMaxLength(full_name, 255)) {
      return res.status(400).json({ success: false, message: 'Nom complet trop long' });
    }

    const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: "Nom d'utilisateur déjà utilisé" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      `INSERT INTO users (username, password_hash, full_name, role, is_active)
       VALUES (?, ?, ?, 'agent', 0)`,
      [username, passwordHash, full_name]
    );

    // Demande d'inscription agent — important pour l'admin (validation en attente)
    await logAudit(req, {
      userId: result.insertId,
      userName: full_name,
      action: 'AGENT_DEMANDE_INSCRIPTION',
      entityType: 'user',
      entityId: result.insertId,
      details: { username, full_name, role: 'agent', statut: 'en_attente_validation' }
    });

    res.status(201).json({
      success: true,
      message: "Compte créé, en attente de validation par l'administrateur"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.registerCitizen = async (req, res) => {
  try {
    const username = sanitizeString(req.body.username);
    const password = sanitizeString(req.body.password);
    const full_name = sanitizeString(req.body.full_name);
    const phone = sanitizeString(req.body.phone);
    const email = sanitizeString(req.body.email);

    if (!username || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Nom complet, username et password requis' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }
    if (!validateMaxLength(full_name, 255)) {
      return res.status(400).json({ success: false, message: 'Nom complet trop long' });
    }

    const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: "Nom d'utilisateur déjà utilisé" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      `INSERT INTO users (username, password_hash, full_name, role, is_active, phone, email)
       VALUES (?, ?, ?, 'citizen', 1, ?, ?)`,
      [username, passwordHash, full_name, phone || null, email || null]
    );

    const user = {
      id: result.insertId,
      username,
      full_name,
      role: 'citizen'
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // Inscription citoyen : pas d'intérêt métier pour le journal admin
    res.status(201).json({
      success: true,
      token,
      user,
      message: 'Compte citoyen cree'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.me = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, username, full_name, role, is_active, created_at FROM users WHERE id = ?',
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
