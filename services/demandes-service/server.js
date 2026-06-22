require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const demandesRouter = require('./routes/demandes');
const citizenRouter = require('./routes/citizen');

const app = express();
const PORT = process.env.PORT || 5003;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use('/demandes', demandesRouter);
app.use('/citizen/demandes', citizenRouter);

app.get('/demandes/health', async (req, res) => {
  try {
    await (await require('./db/connection')).execute('SELECT 1');
    res.json({ status: 'ok', service: 'demandes-service', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', service: 'demandes-service', db: 'disconnected' });
  }
});

app.use((err, req, res, next) => {
  console.error(`[Demandes Service Error] ${err.message}`);
  res.status(err.status || 500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Erreur serveur' : err.message });
});

app.listen(PORT, () => {
  console.log(`📋 Demandes Service démarré sur http://localhost:${PORT}`);
});
