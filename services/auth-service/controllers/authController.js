const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/connection');
const { sanitizeString, validateMaxLength } = require('../utils/validation');
const { sendVerificationCodeEmail } = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
}
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

function generateVerificationCode() {
  return String(crypto.randomInt(100000, 999999));
}

function generateUsernameFromEmail(email) {
  const prefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return prefix || 'user';
}

exports.login = async (req, res) => {
  try {
    const email = sanitizeString(req.body.email);
    const password = sanitizeString(req.body.password);
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email et password requis' });
    }

    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    if (user.role !== 'admin' && Number(user.is_active) !== 1) {
      return res.status(403).json({ success: false, message: 'Compte en attente de validation' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, full_name: user.full_name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
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
    const email = sanitizeString(req.body.email);
    const password = sanitizeString(req.body.password);
    const full_name = sanitizeString(req.body.full_name);

    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Nom complet, email et password requis' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Adresse email invalide' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }
    if (!validateMaxLength(full_name, 255)) {
      return res.status(400).json({ success: false, message: 'Nom complet trop long' });
    }

    const [existingEmail] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length) {
      return res.status(409).json({ success: false, message: 'Adresse email déjà utilisée' });
    }

    let username = generateUsernameFromEmail(email);
    let suffix = 1;
    while (true) {
      const [existingUsername] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
      if (!existingUsername.length) break;
      username = generateUsernameFromEmail(email) + suffix;
      suffix++;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      `INSERT INTO users (username, password_hash, full_name, email, role, is_active)
       VALUES (?, ?, ?, ?, 'agent', 0)`,
      [username, passwordHash, full_name, email]
    );

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
    const email = sanitizeString(req.body.email);
    const password = sanitizeString(req.body.password);
    const full_name = sanitizeString(req.body.full_name);
    const phone = sanitizeString(req.body.phone);

    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Nom complet, email et password requis' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Adresse email invalide' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const [existingEmail] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length) {
      return res.status(409).json({ success: false, message: 'Adresse email déjà utilisée' });
    }

    let username = generateUsernameFromEmail(email);
    let suffix = 1;
    while (true) {
      const [existingUsername] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
      if (!existingUsername.length) break;
      username = generateUsernameFromEmail(email) + suffix;
      suffix++;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      `INSERT INTO users (username, password_hash, full_name, email, role, is_active, phone)
       VALUES (?, ?, ?, ?, 'citizen', 1, ?)`,
      [username, passwordHash, full_name, email, phone || null]
    );

    const user = {
      id: result.insertId,
      email,
      username,
      full_name,
      role: 'citizen'
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.status(201).json({
      success: true,
      token,
      user,
      message: 'Compte citoyen créé'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.me = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, email, username, full_name, role, is_active, created_at FROM users WHERE id = ?',
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

exports.forgotPassword = async (req, res) => {
  try {
    const email = sanitizeString(req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, message: 'Veuillez saisir votre adresse email' });
    }

    const [rows] = await db.execute('SELECT id, full_name, email FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Aucun compte associé à cette adresse email' });
    }

    const user = rows[0];
    const code = generateVerificationCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await db.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [code, expires, user.id]
    );

    try {
      await sendVerificationCodeEmail({
        to: user.email,
        nom_complet: user.full_name || 'Utilisateur',
        code
      });
    } catch (emailErr) {
      console.error('[authController] Erreur envoi email code:', emailErr.message);
      return res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de l\'email.' });
    }

    res.json({ success: true, message: 'Un code de vérification a été envoyé à votre adresse email' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.verifyCode = async (req, res) => {
  try {
    const email = sanitizeString(req.body.email);
    const code = sanitizeString(req.body.code);

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Veuillez saisir le code de vérification' });
    }

    const [rows] = await db.execute(
      'SELECT id, reset_token, reset_token_expires FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun compte associé à cette adresse email' });
    }

    const user = rows[0];

    if (!user.reset_token || user.reset_token !== code) {
      return res.status(400).json({ success: false, message: 'Code de vérification incorrect' });
    }

    if (new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({ success: false, message: 'Code expiré. Veuillez demander un nouveau code.' });
    }

    res.json({ success: true, message: 'Code vérifié avec succès' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const email = sanitizeString(req.body.email);
    const code = sanitizeString(req.body.code);
    const newPassword = sanitizeString(req.body.newPassword);

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, code et nouveau mot de passe requis' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const [rows] = await db.execute(
      'SELECT id, reset_token, reset_token_expires FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Code invalide' });
    }

    const user = rows[0];

    if (!user.reset_token || user.reset_token !== code) {
      return res.status(400).json({ success: false, message: 'Code invalide' });
    }

    if (new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({ success: false, message: 'Code expiré. Veuillez demander un nouveau code.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.execute(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    res.json({ success: true, message: 'Mot de passe modifié avec succès. Vous pouvez vous connecter.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
