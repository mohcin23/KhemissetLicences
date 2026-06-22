require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const auditRouter = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 5008;

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000'];
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin non autorisée: ${origin}`));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/audit', auditRouter);

app.get('/api/health', async (req, res) => {
  try {
    const db = require('./db/connection');
    await db.execute('SELECT 1');
    res.json({ status: 'ok', service: 'audit-service', message: 'Audit service opérationnel', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', service: 'audit-service', message: 'Base de données inaccessible', db: 'disconnected' });
  }
});

app.use((err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd ? 'Erreur serveur' : err.message || 'Erreur serveur';
  const payload = { success: false, message };
  if (!isProd) {
    payload.error = err.stack;
  }
  res.status(err.status || 500).json(payload);
});

app.listen(PORT, () => {
  console.log(`🚀 [Audit Service] démarré sur http://localhost:${PORT}`);
});
