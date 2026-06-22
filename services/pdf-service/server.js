require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const pdfRoutes = require('./routes/pdf');

const app = express();
const PORT = process.env.PORT || 5004;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/pdf', pdfRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pdf-service', port: PORT });
});

app.listen(PORT, () => {
  console.log(`PDF service running on port ${PORT}`);
});
