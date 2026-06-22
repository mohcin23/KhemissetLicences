require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const licencesRouter = require('./routes/licences');

const app = express();
const PORT = process.env.PORT || 5010;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use('/licences', licencesRouter);

app.get('/licences/health', (req, res) => {
  res.json({ status: 'ok', service: 'licences-service', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(`[Licences Service Error] ${err.message}`);
  res.status(err.status || 500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Erreur serveur' : err.message });
});

app.listen(PORT, () => {
  console.log(`📜 Licences Service démarré sur http://localhost:${PORT}`);
});
