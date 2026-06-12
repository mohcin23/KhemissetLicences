/**
 * Contrôleur pour les pièces jointes (fichiers attachés aux demandes).
 *
 * Stockage : fichiers sur disque dans /uploads/pieces_jointes/<annee>/<demande_id>/
 * Les données Base64 sont reçues du client, converties en fichier binaire et stockées.
 *
 * Accès :
 *  - Agent / Admin : peuvent voir et uploader pour toute demande
 *  - Citoyen : peut voir et uploader uniquement pour ses propres demandes
 */

const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const db     = require('../db/connection');
const { logAudit } = require('../utils/auditLogger');

// Répertoire de base pour les pièces jointes
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', 'uploads', 'pieces_jointes');

// Extensions et MIME autorisés
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf'
]);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo

/** Crée les répertoires de stockage si nécessaire. */
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/** Vérifie qu'un citoyen est bien propriétaire de la demande. */
const assertCitizenOwns = async (demandeId, userId) => {
  const [rows] = await db.execute(
    'SELECT id FROM demandes WHERE id = ? AND citizen_user_id = ?',
    [demandeId, userId]
  );
  return rows.length > 0;
};

/** Vérifie l'accès à la demande selon le rôle. */
const canAccessDemande = async (req, demandeId) => {
  if (req.user.role === 'admin' || req.user.role === 'agent' || req.user.role === 'lecteur') {
    const [rows] = await db.execute('SELECT id FROM demandes WHERE id = ?', [demandeId]);
    return rows.length > 0;
  }
  if (req.user.role === 'citizen') {
    return assertCitizenOwns(demandeId, req.user.id);
  }
  return false;
};

/**
 * POST /api/demandes/:id/pieces-jointes
 * Body JSON : { fichiers: [{ nom: string, type_mime: string, base64: string, type_piece?: string }] }
 */
exports.uploadPiecesJointes = async (req, res) => {
  try {
    const demandeId = parseInt(req.params.id, 10);
    if (!demandeId) return res.status(400).json({ success: false, message: 'ID demande invalide' });

    const ok = await canAccessDemande(req, demandeId);
    if (!ok) return res.status(404).json({ success: false, message: 'Demande introuvable ou accès refusé' });

    // Seul le citoyen et l'agent peuvent uploader (pas le lecteur)
    if (req.user.role === 'lecteur') {
      return res.status(403).json({ success: false, message: 'Action interdite pour ce rôle' });
    }

    const { fichiers } = req.body;
    if (!Array.isArray(fichiers) || fichiers.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    }
    if (fichiers.length > 20) {
      return res.status(400).json({ success: false, message: 'Maximum 20 fichiers par envoi' });
    }

    const annee  = new Date().getFullYear();
    const dirPath = path.join(UPLOAD_DIR, String(annee), String(demandeId));
    ensureDir(dirPath);

    const inserted = [];
    const errors   = [];

    for (const f of fichiers) {
      try {
        const nomOriginal = String(f.nom || '').trim();
        const typeMime    = String(f.type_mime || '').trim();
        const base64Data  = String(f.base64 || '').trim();
        const typePiece   = f.type_piece ? String(f.type_piece).trim().substring(0, 100) : null;

        if (!nomOriginal || !typeMime || !base64Data) {
          errors.push({ nom: nomOriginal, erreur: 'Champs manquants (nom, type_mime, base64)' });
          continue;
        }
        if (!ALLOWED_MIME.has(typeMime)) {
          errors.push({ nom: nomOriginal, erreur: `Type MIME non autorisé: ${typeMime}` });
          continue;
        }
        const extOrig = path.extname(nomOriginal).toLowerCase();
        if (!ALLOWED_EXT.has(extOrig)) {
          errors.push({ nom: nomOriginal, erreur: `Extension non autorisée: ${extOrig}` });
          continue;
        }

        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > MAX_FILE_SIZE_BYTES) {
          errors.push({ nom: nomOriginal, erreur: `Fichier trop volumineux (max 10 Mo)` });
          continue;
        }

        const uuid = crypto.randomUUID();
        const nomStockage = `${uuid}${extOrig}`;
        const filePath    = path.join(dirPath, nomStockage);

        fs.writeFileSync(filePath, buffer);

        const [result] = await db.execute(
          `INSERT INTO pieces_jointes
            (demande_id, uploaded_by, role_uploader, nom_original, nom_stockage, type_mime, taille_octets, type_piece)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [demandeId, req.user.id, req.user.role, nomOriginal, nomStockage, typeMime, buffer.length, typePiece]
        );

        inserted.push({
          id: result.insertId,
          nom_original: nomOriginal,
          type_mime: typeMime,
          taille_octets: buffer.length,
          type_piece: typePiece
        });
      } catch (fileErr) {
        errors.push({ nom: f.nom || '?', erreur: fileErr.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `${inserted.length} fichier(s) enregistré(s)`,
      data: { inserted, errors }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/demandes/:id/pieces-jointes
 * Retourne la liste des pièces jointes (sans le contenu binaire).
 */
exports.listPiecesJointes = async (req, res) => {
  try {
    const demandeId = parseInt(req.params.id, 10);
    if (!demandeId) return res.status(400).json({ success: false, message: 'ID demande invalide' });

    const ok = await canAccessDemande(req, demandeId);
    if (!ok) return res.status(404).json({ success: false, message: 'Demande introuvable ou accès refusé' });

    const [rows] = await db.execute(
      `SELECT pj.id, pj.nom_original, pj.type_mime, pj.taille_octets, pj.type_piece,
              pj.role_uploader, pj.date_upload,
              u.full_name AS uploaded_by_name
       FROM pieces_jointes pj
       LEFT JOIN users u ON u.id = pj.uploaded_by
       WHERE pj.demande_id = ?
       ORDER BY pj.date_upload ASC`,
      [demandeId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/demandes/:id/pieces-jointes/:pjId/download
 * Retourne le fichier en téléchargement.
 */
exports.downloadPieceJointe = async (req, res) => {
  try {
    const demandeId = parseInt(req.params.id, 10);
    const pjId      = parseInt(req.params.pjId, 10);
    if (!demandeId || !pjId) return res.status(400).json({ success: false, message: 'Paramètres invalides' });

    const ok = await canAccessDemande(req, demandeId);
    if (!ok) return res.status(404).json({ success: false, message: 'Demande introuvable ou accès refusé' });

    const [rows] = await db.execute(
      'SELECT * FROM pieces_jointes WHERE id = ? AND demande_id = ?',
      [pjId, demandeId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Pièce jointe introuvable' });

    const pj = rows[0];
    const annee   = new Date(pj.date_upload).getFullYear();
    const filePath = path.join(UPLOAD_DIR, String(annee), String(demandeId), pj.nom_stockage);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Fichier introuvable sur le serveur' });
    }

    res.setHeader('Content-Type', pj.type_mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(pj.nom_original)}"`
    );
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/demandes/:id/pieces-jointes/:pjId
 * Supprime une pièce jointe (admin/agent uniquement).
 */
exports.deletePieceJointe = async (req, res) => {
  try {
    const demandeId = parseInt(req.params.id, 10);
    const pjId      = parseInt(req.params.pjId, 10);

    if (req.user.role === 'citizen' || req.user.role === 'lecteur') {
      return res.status(403).json({ success: false, message: 'Action interdite pour ce rôle' });
    }

    const [rows] = await db.execute(
      'SELECT * FROM pieces_jointes WHERE id = ? AND demande_id = ?',
      [pjId, demandeId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Pièce jointe introuvable' });

    const pj = rows[0];
    const annee   = new Date(pj.date_upload).getFullYear();
    const filePath = path.join(UPLOAD_DIR, String(annee), String(demandeId), pj.nom_stockage);

    await db.execute('DELETE FROM pieces_jointes WHERE id = ?', [pjId]);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'Pièce jointe supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
