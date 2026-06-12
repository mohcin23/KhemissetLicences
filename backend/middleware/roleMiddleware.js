const VALID_ROLES = ['admin', 'agent', 'lecteur', 'citizen'];

// Rôles métier dans le système :
// - citoyen  => role db 'citizen'
// - employe   => role db 'agent'
// - responsable => role db 'admin'
// - lecteur   => role db 'lecteur'
const ROLE_LABELS = {
  citizen: 'citoyen',
  agent: 'employe',
  admin: 'responsable',
  lecteur: 'lecteur'
};

/**
 * checkRole - middleware factory
 * @param {string[]} roles - list of allowed roles e.g. ['admin'] or ['admin', 'agent', 'lecteur']
 */
const checkRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }

  if (!VALID_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Accès refusé. Rôle inconnu : ${req.user.role}`
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Accès refusé. Rôle requis : ${roles.join(' ou ')}. Votre rôle : ${req.user.role}`
    });
  }

  next();
};

const employeOnly = checkRole(['agent']);
const responsableOnly = checkRole(['admin']);

module.exports = { checkRole, VALID_ROLES, ROLE_LABELS, employeOnly, responsableOnly };
