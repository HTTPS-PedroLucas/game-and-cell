#!/usr/bin/env node
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const db = require('../src/lib/db');
const store = require('../src/lib/store');
const { uploadBuffer } = require('../src/lib/cloudinary');
const { run: migrate } = require('./migrate');

const projectRoot = path.join(__dirname, '..');

function localImagePaths(snapshot) {
  const refs = [];
  const add = (holder, key) => {
    const value = holder?.[key];
    if (typeof value === 'string' && value.startsWith('/uploads/')) refs.push({ holder, key, value });
  };
  for (const item of snapshot.produtos || []) add(item, 'imagem');
  for (const item of snapshot.torneios || []) add(item, 'imagem');
  for (const item of snapshot.equipe || []) add(item, 'foto');
  for (const item of snapshot.depoimentos || []) add(item, 'foto');
  for (const [index, value] of (snapshot.sobreLoja?.fotos || []).entries()) {
    if (typeof value === 'string' && value.startsWith('/uploads/')) {
      refs.push({ holder: snapshot.sobreLoja.fotos, key: index, value });
    }
  }
  return refs;
}

async function migrateImages(snapshot) {
  const cache = new Map();
  for (const ref of localImagePaths(snapshot)) {
    if (!cache.has(ref.value)) {
      const source = path.resolve(projectRoot, 'public', ref.value.replace(/^\/+/, ''));
      const uploadsRoot = path.resolve(projectRoot, 'public', 'uploads');
      if (!source.startsWith(`${uploadsRoot}${path.sep}`) || !fs.existsSync(source)) {
        console.warn(`[imagens] arquivo não encontrado, URL mantida: ${ref.value}`);
        cache.set(ref.value, ref.value);
      } else {
        const result = await uploadBuffer(fs.readFileSync(source), { nome: path.parse(source).name });
        console.log(`[imagens] ${ref.value} -> ${result.url}`);
        cache.set(ref.value, result.url);
      }
    }
    ref.holder[ref.key] = cache.get(ref.value);
  }
}

async function main() {
  const input = process.argv[2] || path.join(projectRoot, 'data', 'db.json');
  const file = path.resolve(input);
  if (!fs.existsSync(file)) throw new Error(`Arquivo JSON não encontrado: ${file}`);

  await migrate({ seedDefaults: false });
  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
  await migrateImages(snapshot);
  await store.importSnapshot(snapshot);
  console.log(`[db] dados importados de ${file}`);
}

main()
  .catch((err) => {
    console.error(`[db] importação cancelada: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
