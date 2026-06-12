const logError = (err, req = {}) => {
  const timestamp = new Date().toISOString();
  const route = req.originalUrl || req.url || 'unknown';
  const method = req.method || 'UNKNOWN';
  const userId = req.user?.id != null ? req.user.id : 'anonymous';
  const message = err?.message || 'Erreur inconnue';
  console.error(`[ERREUR] ${timestamp} | ${method} ${route} | user:${userId} | message: ${message}`);
  if (process.env.NODE_ENV !== 'production' && err?.stack) {
    console.error(err.stack);
  }
};

module.exports = { logError };
