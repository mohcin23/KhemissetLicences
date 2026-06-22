const { createPool } = require('../../../shared/utils/pg-pool');

const pool = createPool();

pool._pool.connect()
  .then(conn => {
    console.log('✅ [Audit Service] PostgreSQL connecté');
    conn.release();
  })
  .catch(err => {
    console.error('❌ [Audit Service] Erreur connexion PostgreSQL:', err.message);
  });

module.exports = pool;
