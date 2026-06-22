const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5006;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/ai', aiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-service', port: PORT });
});

app.listen(PORT, () => {
  console.log(`[AI Service] Running on port ${PORT}`);
});
