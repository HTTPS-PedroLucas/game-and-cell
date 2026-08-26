/**
 * Armazenamento em arquivo JSON com escrita atomica.
 * O catalogo da loja e pequeno (centenas de itens), entao um banco
 * relacional so adicionaria dependencia nativa sem ganho real.
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.json');

let cache = null;
let cacheMtime = 0;

function read() {
  if (!fs.existsSync(DB_PATH)) {
    cache = structuredClone(require('./defaults'));
    write(cache);
    return cache;
  }

  // Recarrega se o arquivo mudou fora deste processo — é o caso do `npm run seed`
  // rodando com o servidor no ar. Sem isso o servidor serviria dados velhos.
  const mtime = fs.statSync(DB_PATH).mtimeMs;
  if (cache && mtime === cacheMtime) return cache;

  cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  cacheMtime = mtime;
  return cache;
}

function write(data) {
  cache = data;
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
  cacheMtime = fs.statSync(DB_PATH).mtimeMs;
}

/** Le, deixa o callback mutar, persiste e devolve o retorno do callback. */
function update(fn) {
  const data = read();
  const result = fn(data);
  write(data);
  return result;
}

function nextId(collection) {
  return collection.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

module.exports = { read, write, update, nextId, DB_PATH };
