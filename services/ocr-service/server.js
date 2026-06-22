require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const ocrRoutes = require('./routes/ocr');

const app = express();
const PORT = process.env.PORT || 5005;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ocr-service', port: PORT });
});

app.use('/ocr', ocrRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`OCR service running on port ${PORT}`);
});
