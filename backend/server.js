require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

const demandesRouter = require('./routes/demandes');
const pdfRouter = require('./routes/pdf');
const ocrRouter = require('./routes/ocr');
const authRouter = require('./routes/auth');
const auditRouter = require('./routes/audit');
const adminRouter = require('./routes/admin');
const citizenRouter = require('./routes/citizen');
const workflowRouter = require('./routes/workflow');
const notificationsRouter = require('./routes/notifications');
const { logError } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

// Middleware
app.use(helmet());
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (ex: curl, Postman en dev)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin non autorisée: ${origin}`));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/citizen', citizenRouter);
app.use('/api/demandes', demandesRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/ocr', ocrRouter);
app.use('/api/audit', auditRouter);
app.use('/api/workflow', workflowRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/licences', require('./routes/licences'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await (await require('./db/connection')).execute('SELECT 1');
    res.json({ status: 'ok', message: 'Serveur Khemisset Permits opérationnel', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', message: 'Base de données inaccessible', db: 'disconnected' });
  }
});

// Error handler global
app.use((err, req, res, next) => {
  logError(err, req);
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd ? 'Erreur serveur' : err.message || 'Erreur serveur';
  const payload = { success: false, message };
  if (!isProd) {
    payload.error = err.stack;
  }
  res.status(err.status || 500).json(payload);
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
