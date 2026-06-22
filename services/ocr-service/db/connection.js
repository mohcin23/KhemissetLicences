const { createPool } = require('../../../shared/utils/pg-pool');

const pool = createPool();

pool._pool.connect()
  .then(conn => {
    console.log('✅ OCR Service: PostgreSQL connecté');
    conn.release();
  })
  .catch(err => {
    console.error('❌ OCR Service: Erreur connexion PostgreSQL:', err.message);
  });

module.exports = pool;
