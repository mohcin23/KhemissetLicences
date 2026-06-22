const { Pool } = require('pg');

/**
 * PostgreSQL pool with mysql2-compatible query interface.
 * Converts ? placeholders to $1, $2, ... automatically.
 * INSERT statements auto-append RETURNING id and return { insertId, affectedRows }.
 */
function createPool(config = {}) {
  const pool = new Pool({
    host: config.host || process.env.DB_HOST || 'localhost',
    port: config.port || parseInt(process.env.DB_PORT) || 5432,
    user: config.user || process.env.DB_USER || 'kh_user',
    password: config.password || process.env.DB_PASSWORD || 'kh_password',
    database: config.database || process.env.DB_NAME || 'kh_data',
    max: config.connectionLimit || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Pool error:', err.message);
  });

  const converted = {
    _pool: pool,

    async execute(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();
      const isInsert = trimmed.startsWith('INSERT');
      const isSelect = trimmed.startsWith('SELECT');
      let finalSql = sql;
      if (isInsert && !trimmed.includes('RETURNING')) {
        finalSql = sql + ' RETURNING id';
      }
      const { namedSql, namedParams } = convertPlaceholders(finalSql, params);
      const result = await pool.query(namedSql, namedParams);
      if (isInsert) {
        const insertId = result.rows.length > 0 ? result.rows[0].id : null;
        return [{ insertId, affectedRows: result.rowCount }, []];
      }
      if (isSelect) {
        return [result.rows, result.rowCount];
      }
      return [{ affectedRows: result.rowCount }, []];
    },

    async query(sql, params = []) {
      const { namedSql, namedParams } = convertPlaceholders(sql, params);
      const result = await pool.query(namedSql, namedParams);
      return result.rows;
    },

    async getConnection() {
      const client = await pool.connect();
      return {
        release() { client.release(); },
        async execute(sql, params = []) {
          const trimmed = sql.trim().toUpperCase();
          const isInsert = trimmed.startsWith('INSERT');
          const isSelect = trimmed.startsWith('SELECT');
          let finalSql = sql;
          if (isInsert && !trimmed.includes('RETURNING')) {
            finalSql = sql + ' RETURNING id';
          }
          const { namedSql, namedParams } = convertPlaceholders(finalSql, params);
          const result = await client.query(namedSql, namedParams);
          if (isInsert) {
            const insertId = result.rows.length > 0 ? result.rows[0].id : null;
            return [{ insertId, affectedRows: result.rowCount }, []];
          }
          if (isSelect) {
            return [result.rows, result.rowCount];
          }
          return [{ affectedRows: result.rowCount }, []];
        },
        async query(sql, params = []) {
          const { namedSql, namedParams } = convertPlaceholders(sql, params);
          const result = await client.query(namedSql, namedParams);
          return result.rows;
        },
        async beginTransaction() { await client.query('BEGIN'); },
        async commit() { await client.query('COMMIT'); },
        async rollback() { await client.query('ROLLBACK'); },
      };
    },

    async end() { await pool.end(); },
  };

  return converted;
}

/**
 * Convert MySQL-style ? placeholders to PostgreSQL $1, $2, ...
 * Handles escaped question marks (??) and preserves string literals.
 */
function convertPlaceholders(sql, params = []) {
  let paramIndex = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;
  let newSql = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (escaped) {
      newSql += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      newSql += ch;
      escaped = true;
      continue;
    }

    if (inString) {
      newSql += ch;
      if (ch === stringChar && sql[i + 1] !== stringChar) inString = false;
      continue;
    }

    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      newSql += ch;
      continue;
    }

    if (ch === '?') {
      paramIndex++;
      newSql += `$${paramIndex}`;
      continue;
    }

    newSql += ch;
  }

  return { namedSql: newSql, namedParams: params };
}

module.exports = { createPool };
