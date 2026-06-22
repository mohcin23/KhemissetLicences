require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const adminRouter = require('./routes/admin');
const citizenRouter = require('./routes/citizen');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Routes
app.use('/admin', adminRouter);
app.use('/citizen', citizenRouter);

// Health check
app.get('/admin/health', async (req, res) => {
  try {
    await (await require('./db/connection')).execute('SELECT 1');
    res.json({
      status: 'ok',
      service: 'user-service',
      db: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(503).json({
      status: 'error',
      service: 'user-service',
      db: 'disconnected'
    });
  }
});

// Error handler global
app.use((err, req, res, next) => {
  console.error(`[User Service Error] ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Erreur serveur' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`👥 User Service démarré sur http://localhost:${PORT}`);
});
