#!/usr/bin/env node
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const db = require('../src/lib/db');
const store = require('../src/lib/store');
const defaults = require('../src/lib/defaults');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function run({ seedDefaults = false } = {}) {
  const pool = db.getPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql')).sort();
  for (const name of files) {
    const done = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
    if (done.rowCount) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
    await db.transaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
    });
    console.log(`[db] migração aplicada: ${name}`);
  }

  if (seedDefaults && (await store.isEmpty())) {
    await store.importSnapshot(structuredClone(defaults));
    console.log('[db] conteúdo inicial importado');
  }

  const email = process.env.ADMIN_EMAIL;
  const senha = process.env.ADMIN_SENHA;
  if (email && senha && !(await store.findAdminByEmail(email.trim().toLowerCase()))) {
    const { criarUsuario } = require('../src/lib/auth');
    await criarUsuario(email, senha, process.env.ADMIN_NOME || 'Administrador');
    console.log(`[db] administrador inicial criado: ${email}`);
  }
}

if (require.main === module) {
  run({ seedDefaults: process.argv.includes('--seed-defaults') })
    .catch((err) => {
      console.error(`[db] falha: ${err.message}`);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}

module.exports = { run };
