const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db/connection');

const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, '..', 'uploads', 'pieces_jointes');
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ensureDir = (dirPath) => { if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true }); };

exports.uploadPiecesJointes = async (req, res) => {
  try {
    const demandeId = parseInt(req.params.id, 10);
    if (!demandeId) return res.status(400).json({ success: false, message: 'ID invalide' });

    const [rows] = await db.execute('SELECT id FROM demandes WHERE id = ?', [demandeId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Demande introuvable' });

    const { fichiers } = req.body;
    if (!Array.isArray(fichiers) || fichiers.length === 0) return res.status(400).json({ success: false, message: 'Aucun fichier' });

    const year = new Date().getFullYear();
    const dirPath = path.join(UPLOAD_DIR, String(year), String(demandeId));
    ensureDir(dirPath);

    const saved = [];
    for (const fichier of fichiers) {
      if (!fichier.nom || !fichier.base64) continue;
      const ext = path.extname(fichier.nom).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) continue;

      const base64Data = fichier.base64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > MAX_FILE_SIZE_BYTES) continue;

      const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      fs.writeFileSync(path.join(dirPath, safeName), buffer);

      const [result] = await db.execute(
        `INSERT INTO pieces_jointes (demande_id, nom_original, nom_stockage, type_mime, taille_octets, type_piece, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [demandeId, fichier.nom, safeName, fichier.type_mime || 'application/octet-stream', buffer.length, fichier.type_piece || null, req.user?.id || null]
      );
      saved.push({ id: result.insertId, nom: fichier.nom });
    }

    res.status(201).json({ success: true, data: saved });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.listPiecesJointes = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM pieces_jointes WHERE demande_id = ? ORDER BY date_upload DESC', [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.downloadPieceJointe = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM pieces_jointes WHERE id = ? AND demande_id = ?', [req.params.pjId, req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Fichier introuvable' });

    const pj = rows[0];
    const year = new Date(pj.date_upload).getFullYear();
    const filePath = path.join(UPLOAD_DIR, String(year), String(req.params.id), pj.nom_stockage);

    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'Fichier manquant sur disque' });
    res.download(filePath, pj.nom_original);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deletePieceJointe = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM pieces_jointes WHERE id = ? AND demande_id = ?', [req.params.pjId, req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Fichier introuvable' });

    const pj = rows[0];
    const year = new Date(pj.date_upload).getFullYear();
    const filePath = path.join(UPLOAD_DIR, String(year), String(req.params.id), pj.nom_stockage);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await db.execute('DELETE FROM pieces_jointes WHERE id = ?', [req.params.pjId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
