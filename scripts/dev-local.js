#!/usr/bin/env node
/**
 * Modo de desenvolvimento local.
 *
 * Sobe o site inteiro sem depender de Supabase nem Cloudinary: usa um
 * PostgreSQL em memória (pg-mem) com o mesmo schema de produção, e grava
 * as imagens em public/uploads.
 *
 * Diferente do preview descartável, aqui os dados PERSISTEM: ao encerrar,
 * o conteúdo do banco é salvo em data/dev-local.json e recarregado no
 * próximo início. Dá para cadastrar produtos, receber pedidos e continuar
 * de onde parou.
 *
 *   npm run dev:local
 *
 * Para definir o login do painel, ponha no .env:
 *   ADMIN_EMAIL=voce@loja.com
 *   ADMIN_SENHA=suaSenhaLocal
 *
 * Para começar do zero, apague data/dev-local.json.
 */
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { newDb, DataType } = require('pg-mem');

const RAIZ = path.join(__dirname, '..');
const ARQUIVO = path.join(RAIZ, 'data', 'dev-local.json');
const UPLOADS = path.join(RAIZ, 'public', 'uploads');

/* Tabelas de dados, na ordem em que precisam ser restauradas para as
   chaves estrangeiras não reclamarem. schema_migrations fica de fora:
   o próprio arquivo de schema a preenche. */
const TABELAS = [
  'admins',
  'categories',
  'brands',
  'products',
  'services',
  'tournaments',
  'team_members',
  'testimonials',
  'leads',
  'settings'
];

/* O db.js só aceita um pool injetado quando NODE_ENV é "test" — é a mesma
   porta de entrada que a suíte automatizada usa. Isso também faz o
   importSnapshot pular o reajuste das sequências de id, então este script
   cuida disso por conta própria em `ajustarSequencias`. */
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '3000';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'desenvolvimento-local-game-cell-segredo-com-mais-de-32-caracteres';

/* ------------------------------------------------------------------ */
/* Persistência                                                        */
/* ------------------------------------------------------------------ */

/** Lê todas as tabelas. `ORDER BY 1` ordena pela primeira coluna — nem toda
    tabela tem `id` (settings é chaveada por texto). */
async function coletar(pool) {
  const dados = {};
  for (const tabela of TABELAS) {
    const r = await pool.query(`SELECT * FROM ${tabela} ORDER BY 1`);
    dados[tabela] = r.rows;
  }
  return dados;
}

async function salvar(pool) {
  const dados = await coletar(pool);
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  const tmp = `${ARQUIVO}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(dados, null, 2), 'utf8');
  fs.renameSync(tmp, ARQUIVO); // troca atômica: nunca deixa o arquivo pela metade
  return Object.values(dados).reduce((n, linhas) => n + linhas.length, 0);
}

async function limpar(pool) {
  // Ordem inversa: filhos antes dos pais, para não violar chave estrangeira
  for (const tabela of [...TABELAS].reverse()) await pool.query(`DELETE FROM ${tabela}`);
}

/**
 * Grava as linhas deixando o banco atribuir os ids.
 *
 * Inserir com id explícito deixaria a sequência parada em 1, e o primeiro
 * cadastro novo esbarraria na chave primária. O `pg-mem` não implementa
 * `setval` nem `pg_get_serial_sequence`, então não dá para corrigir depois —
 * a saída é nunca fixar o id.
 *
 * Em todo o schema há uma única referência por id (`leads.tournament_id`);
 * as demais apontam para texto (slug e nome). Por isso basta remapear os
 * torneios enquanto eles são inseridos.
 */
async function inserir(pool, dados) {
  const mapaTorneios = new Map();
  let total = 0;

  for (const tabela of TABELAS) {
    for (const linha of dados[tabela] || []) {
      const registro = { ...linha };
      const idAntigo = registro.id;
      delete registro.id;

      if (tabela === 'leads' && registro.tournament_id != null) {
        registro.tournament_id = mapaTorneios.get(String(registro.tournament_id)) ?? null;
      }

      const colunas = Object.keys(registro);
      const marcadores = colunas.map((_, i) => `$${i + 1}`).join(', ');
      const valores = colunas.map((c) => {
        const v = registro[c];
        // pg-mem devolve objeto para jsonb; na volta precisa ir como texto
        return v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v;
      });

      const devolve = tabela === 'tournaments' ? ' RETURNING id' : '';
      const r = await pool.query(
        `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${marcadores})${devolve}`,
        valores
      );

      if (devolve && idAntigo != null) mapaTorneios.set(String(idAntigo), r.rows[0].id);
      total++;
    }
  }
  return total;
}

const restaurar = (pool) => inserir(pool, JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')));

/**
 * O `importSnapshot` grava os ids do arquivo de conteúdo inicial, o que deixa
 * a sequência para trás. Reescrever tudo pelo caminho acima normaliza o banco
 * logo na primeira execução.
 */
async function normalizar(pool) {
  const dados = await coletar(pool);
  await limpar(pool);
  return inserir(pool, dados);
}

/* ------------------------------------------------------------------ */
/* Início                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  const memoria = newDb({ autoCreateForeignKeyIndices: true });

  // pg-mem não traz essa função; o schema de produção a utiliza
  memoria.public.registerFunction({
    name: 'jsonb_typeof',
    args: [DataType.jsonb],
    returns: DataType.text,
    implementation: (valor) => (Array.isArray(valor) ? 'array' : typeof valor)
  });

  const adapter = memoria.adapters.createPg();
  const pool = new adapter.Pool();
  require('../src/lib/db').setPoolForTests(pool);

  // Uploads vão para o disco em vez do Cloudinary
  fs.mkdirSync(UPLOADS, { recursive: true });
  const cloudinary = require('../src/lib/cloudinary');
  cloudinary.uploadBuffer = async (buffer, { nome = 'imagem' } = {}) => {
    const arquivo = `${nome}-${Date.now().toString(36)}.webp`;
    fs.writeFileSync(path.join(UPLOADS, arquivo), buffer);
    return { url: `/uploads/${arquivo}`, tamanho: buffer.length, publicId: `local/${arquivo}` };
  };

  memoria.public.none(fs.readFileSync(path.join(RAIZ, 'migrations', '001_initial.sql'), 'utf8'));

  const store = require('../src/lib/store');
  const auth = require('../src/lib/auth');

  let origem;
  if (fs.existsSync(ARQUIVO)) {
    const n = await restaurar(pool);
    origem = `${n} registros restaurados de data/dev-local.json`;
  } else {
    await store.importSnapshot(require('../src/lib/defaults'));
    await normalizar(pool);
    origem = 'primeira execução — conteúdo inicial do briefing';
  }

  /* Login do painel. Definido pelo .env quando existir; caso contrário
     usa um par local conhecido, já que o banco nunca sai desta máquina. */
  const email = (process.env.ADMIN_EMAIL || 'admin@local').trim().toLowerCase();
  const senha = process.env.ADMIN_SENHA || 'gamecell-local';

  const existente = await store.findAdminByEmail(email);
  if (existente) {
    if (process.env.ADMIN_SENHA) await auth.redefinirSenha(email, senha);
  } else {
    await auth.criarUsuario(email, senha, process.env.ADMIN_NOME || 'Administrador local');
  }

  /* Salva ao encerrar e a cada 30s, para um fechamento abrupto não custar o trabalho */
  let salvando = false;
  const persistir = async (motivo) => {
    if (salvando) return;
    salvando = true;
    try {
      const n = await salvar(pool);
      if (motivo) console.log(`\n  ${n} registros salvos em data/dev-local.json (${motivo})`);
    } catch (e) {
      console.error('  Falha ao salvar:', e.message);
    } finally {
      salvando = false;
    }
  };

  const periodico = setInterval(() => persistir(null), 30000);
  periodico.unref();

  let encerrando = false;
  for (const sinal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(sinal, async () => {
      if (encerrando) return;
      encerrando = true;
      await persistir('encerrando');
      process.exit(0);
    });
  }

  await require('../src/server').start();

  console.log(`  Modo local — ${origem}`);
  console.log(`  Painel: ${email} / ${process.env.ADMIN_SENHA ? '(senha do .env)' : senha}`);
  console.log('  Os dados são salvos ao encerrar com Ctrl+C e a cada 30 segundos.\n');
}

main().catch((e) => {
  console.error('\n  Falha ao iniciar o modo local:', e.message, '\n');
  process.exit(1);
});
