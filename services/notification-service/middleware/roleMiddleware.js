const VALID_ROLES = ['admin', 'agent', 'citizen'];

const ROLE_LABELS = {
  citizen: 'citoyen',
  agent: 'employe',
  admin: 'responsable'
};

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
