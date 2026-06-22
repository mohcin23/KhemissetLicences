require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const notificationsRouter = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5007;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use('/notifications', notificationsRouter);

app.get('/notifications/health', async (req, res) => {
  try {
    await (await require('./db/connection')).execute('SELECT 1');
    res.json({
      status: 'ok',
      service: 'notification-service',
      db: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(503).json({
      status: 'error',
      service: 'notification-service',
      db: 'disconnected'
    });
  }
});

app.use((err, req, res, next) => {
  console.error(`[Notification Service Error] ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Erreur serveur' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`🔔 Notification Service démarré sur http://localhost:${PORT}`);
});
