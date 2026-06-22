const VALID_ROLES = ['admin', 'agent', 'citizen'];

const checkRole = (roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Non authentifié' });
  if (!VALID_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: `Rôle inconnu : ${req.user.role}` });
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: `Rôle requis : ${roles.join(' ou ')}. Votre rôle : ${req.user.role}` });
  next();
};

module.exports = { checkRole };
