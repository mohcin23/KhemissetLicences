require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Routes
app.use('/auth', authRouter);

// Health check
app.get('/auth/health', async (req, res) => {
  try {
    await (await require('./db/connection')).execute('SELECT 1');
    res.json({
      status: 'ok',
      service: 'auth-service',
      db: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(503).json({
      status: 'error',
      service: 'auth-service',
      db: 'disconnected'
    });
  }
});

// Error handler global
app.use((err, req, res, next) => {
  console.error(`[Auth Service Error] ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Erreur serveur' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`🔐 Auth Service démarré sur http://localhost:${PORT}`);
});
