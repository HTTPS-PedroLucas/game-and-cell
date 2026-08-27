const { Pool } = require('pg');

let pool;
let injectedPool;

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error(
      'DATABASE_URL não definida. Crie o PostgreSQL no Supabase e copie a connection string para o .env.'
    );
  }
  return value;
}

function sslConfig() {
  if (String(process.env.DATABASE_SSL).toLowerCase() === 'false') return false;
  if (/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) return false;
  return { rejectUnauthorized: false };
}

function getPool() {
  if (injectedPool) return injectedPool;
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
      ssl: sslConfig(),
      max: Number(process.env.DATABASE_POOL_MAX) || 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000
    });
    pool.on('error', (err) => console.error('[postgres] conexão ociosa falhou:', err.message));
  }
  return pool;
}

function query(text, params) {
  return getPool().query(text, params);
}

async function transaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function close() {
  if (pool) await pool.end();
  pool = undefined;
}

function setPoolForTests(value) {
  if (process.env.NODE_ENV !== 'test') throw new Error('Pool injetável disponível somente em testes.');
  injectedPool = value;
}

module.exports = { getPool, query, transaction, close, setPoolForTests };
