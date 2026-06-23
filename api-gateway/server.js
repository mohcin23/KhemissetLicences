require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet());
app.use(morgan('combined'));

// CORS
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin non autorisée: ${origin}`));
    }
  },
  credentials: true
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes. Réessayez plus tard.' }
});
app.use(globalLimiter);

// Body parsing (before proxy routes so body is available for forwarding)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ─── Service Routes ─────────────────────────────────────────────────────────

// Auth Service
app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/auth' }
}));

// User Service (admin + citizen)
app.use('/api/admin', createProxyMiddleware({
  target: process.env.USER_SERVICE_URL || 'http://localhost:5002',
  changeOrigin: true,
  pathRewrite: { '^/api/admin': '/admin' }
}));

app.use('/api/citizen/demandes', createProxyMiddleware({
  target: process.env.DEMANDES_SERVICE_URL || 'http://localhost:5003',
  changeOrigin: true,
  pathRewrite: { '^/api/citizen/demandes': '/citizen/demandes' }
}));

app.use('/api/citizen', createProxyMiddleware({
  target: process.env.USER_SERVICE_URL || 'http://localhost:5002',
  changeOrigin: true,
  pathRewrite: { '^/api/citizen': '/citizen' }
}));

// Demandes Service
app.use('/api/demandes', createProxyMiddleware({
  target: process.env.DEMANDES_SERVICE_URL || 'http://localhost:5003',
  changeOrigin: true,
  pathRewrite: { '^/api/demandes': '/demandes' }
}));

// PDF Service
app.use('/api/pdf', createProxyMiddleware({
  target: process.env.PDF_SERVICE_URL || 'http://localhost:5004',
  changeOrigin: true,
  pathRewrite: { '^/api/pdf': '/pdf' }
}));

// OCR Service
app.use('/api/ocr', createProxyMiddleware({
  target: process.env.OCR_SERVICE_URL || 'http://localhost:5005',
  changeOrigin: true,
  pathRewrite: { '^/api/ocr': '/ocr' }
}));

// AI Service (SSE streaming — selfHandleResponse to avoid proxy buffering)
app.use('/api/ai/chat/stream', createProxyMiddleware({
  target: process.env.AI_SERVICE_URL || 'http://localhost:5006',
  changeOrigin: true,
  pathRewrite: { '^/api/ai': '/ai' },
  selfHandleResponse: true,
  onProxyRes: (proxyRes, req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    proxyRes.pipe(res);
  }
}));

// AI Service (other routes)
app.use('/api/ai', createProxyMiddleware({
  target: process.env.AI_SERVICE_URL || 'http://localhost:5006',
  changeOrigin: true,
  pathRewrite: { '^/api/ai': '/ai' }
}));

// Notification Service
app.use('/api/notifications', createProxyMiddleware({
  target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5007',
  changeOrigin: true,
  pathRewrite: { '^/api/notifications': '/notifications' }
}));

// Audit Service
app.use('/api/audit', createProxyMiddleware({
  target: process.env.AUDIT_SERVICE_URL || 'http://localhost:5008',
  changeOrigin: true,
  pathRewrite: { '^/api/audit': '/audit' }
}));

// Workflow Service
app.use('/api/workflow', createProxyMiddleware({
  target: process.env.WORKFLOW_SERVICE_URL || 'http://localhost:5009',
  changeOrigin: true,
  pathRewrite: { '^/api/workflow': '/workflow' }
}));

// Licences Service
app.use('/api/licences', createProxyMiddleware({
  target: process.env.LICENCES_SERVICE_URL || 'http://localhost:5010',
  changeOrigin: true,
  pathRewrite: { '^/api/licences': '/licences' }
}));

// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {
      auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
      user: process.env.USER_SERVICE_URL || 'http://localhost:5002',
      demandes: process.env.DEMANDES_SERVICE_URL || 'http://localhost:5003',
      pdf: process.env.PDF_SERVICE_URL || 'http://localhost:5004',
      ocr: process.env.OCR_SERVICE_URL || 'http://localhost:5005',
      ai: process.env.AI_SERVICE_URL || 'http://localhost:5006',
      notifications: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5007',
      audit: process.env.AUDIT_SERVICE_URL || 'http://localhost:5008',
      workflow: process.env.WORKFLOW_SERVICE_URL || 'http://localhost:5009',
      licences: process.env.LICENCES_SERVICE_URL || 'http://localhost:5010'
    }
  });
});

// ─── 404 Handler ────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route non trouvée: ${req.method} ${req.path}`
  });
});

// ─── Error Handler ──────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[Gateway Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Erreur serveur' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway démarré sur http://localhost:${PORT}`);
  console.log(`📡 Auth Service: ${process.env.AUTH_SERVICE_URL || 'http://localhost:5001'}`);
});
