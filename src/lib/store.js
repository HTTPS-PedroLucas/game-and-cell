/** Camada de persistência PostgreSQL. Mantém o formato consumido pelas views. */
const db = require('./db');

const SETTINGS = ['config', 'pagamento', 'garantia', 'entrega', 'assistenciaInfo', 'sobreLoja'];
const COLLECTIONS = new Set(['produtos', 'servicos', 'torneios', 'equipe', 'depoimentos']);
const number = (value) => (value === null || value === undefined ? null : Number(value));
const iso = (value) => (value instanceof Date ? value.toISOString() : value);

const map = {
  produto: (r) => ({
    id: number(r.id), nome: r.name, slug: r.slug, categoria: r.category_slug, marca: r.brand,
    preco: number(r.price), precoAntigo: number(r.old_price), parcelas: r.installments,
    disponibilidade: r.availability, destaque: r.featured, imagem: r.image_url,
    descricao: r.description, ficha: r.specs || []
  }),
  servico: (r) => ({
    id: number(r.id), nome: r.name, descricao: r.description, prazo: r.turnaround,
    garantia: r.warranty, faixa: r.price_range
  }),
  torneio: (r) => ({
    id: number(r.id), nome: r.name, jogo: r.game,
    data: r.event_date instanceof Date ? r.event_date.toISOString().slice(0, 10) : String(r.event_date),
    hora: r.event_time, local: r.location, inscricao: r.entry_fee, premiacao: r.prize,
    vagas: r.capacity, status: r.status, campeao: r.champion, imagem: r.image_url,
    regulamento: r.rules || []
  }),
  equipe: (r) => ({ id: number(r.id), nome: r.name, funcao: r.role, foto: r.photo_url, bio: r.bio }),
  depoimento: (r) => ({
    id: number(r.id), nome: r.name, cidade: r.city, texto: r.body,
    foto: r.photo_url, aprovado: r.approved
  }),
  lead: (r) => ({
    id: number(r.id), tipo: r.type, status: r.status, nome: r.name, telefone: r.phone,
    ...(r.device ? { aparelho: r.device } : {}), ...(r.problem ? { problema: r.problem } : {}),
    ...(r.nickname ? { nick: r.nickname } : {}),
    ...(r.tournament_id ? { torneioId: number(r.tournament_id) } : {}),
    ...(r.tournament_name ? { torneioNome: r.tournament_name } : {}), criadoEm: iso(r.created_at)
  }),
  usuario: (r) => ({
    id: number(r.id), email: r.email, nome: r.name, senhaHash: r.password_hash, criadoEm: iso(r.created_at)
  })
};

async function read({ includeLeads = false } = {}) {
  const client = db.getPool();
  const [settings, categories, brands, products, services, tournaments, team, testimonials, leads] =
    await Promise.all([
      client.query('SELECT key, value FROM settings'),
      client.query('SELECT slug, name, description, featured FROM categories ORDER BY sort_order, id'),
      client.query('SELECT name FROM brands ORDER BY sort_order, id'),
      client.query('SELECT * FROM products ORDER BY id'),
      client.query('SELECT * FROM services ORDER BY id'),
      client.query('SELECT * FROM tournaments ORDER BY event_date DESC, id DESC'),
      client.query('SELECT * FROM team_members ORDER BY id'),
      client.query('SELECT * FROM testimonials ORDER BY id'),
      includeLeads
        ? client.query('SELECT * FROM leads ORDER BY created_at DESC, id DESC')
        : Promise.resolve({ rows: [] })
    ]);
  const settingsMap = Object.fromEntries(settings.rows.map((row) => [row.key, row.value]));
  return {
    ...settingsMap,
    categorias: categories.rows.map((r) => ({
      slug: r.slug, nome: r.name, descricao: r.description, destaque: r.featured
    })),
    marcas: brands.rows.map((r) => r.name), produtos: products.rows.map(map.produto),
    servicos: services.rows.map(map.servico), torneios: tournaments.rows.map(map.torneio),
    equipe: team.rows.map(map.equipe), depoimentos: testimonials.rows.map(map.depoimento),
    leads: leads.rows.map(map.lead), usuarios: []
  };
}

const collectionMeta = {
  produtos: { table: 'products', order: 'id', mapper: map.produto },
  servicos: { table: 'services', order: 'id', mapper: map.servico },
  torneios: { table: 'tournaments', order: 'event_date DESC, id DESC', mapper: map.torneio },
  equipe: { table: 'team_members', order: 'id', mapper: map.equipe },
  depoimentos: { table: 'testimonials', order: 'id', mapper: map.depoimento }
};

async function listCollection(name, client = db.getPool()) {
  const meta = collectionMeta[name];
  if (!meta) throw new Error('Coleção desconhecida.');
  const result = await client.query(`SELECT * FROM ${meta.table} ORDER BY ${meta.order}`);
  return result.rows.map(meta.mapper);
}

async function findCollectionItem(name, id, client = db.getPool()) {
  const meta = collectionMeta[name];
  if (!meta) throw new Error('Coleção desconhecida.');
  const result = await client.query(`SELECT * FROM ${meta.table} WHERE id = $1`, [id]);
  return result.rows[0] ? meta.mapper(result.rows[0]) : null;
}

function collectionStatement(name, item, updateId) {
  const statements = {
    produtos: {
      columns: ['name', 'slug', 'category_slug', 'brand', 'price', 'old_price', 'installments', 'availability', 'featured', 'image_url', 'description', 'specs'],
      values: [item.nome, item.slug, item.categoria, item.marca, item.preco, item.precoAntigo, item.parcelas, item.disponibilidade, item.destaque, item.imagem, item.descricao, JSON.stringify(item.ficha)]
    },
    servicos: {
      columns: ['name', 'description', 'turnaround', 'warranty', 'price_range'],
      values: [item.nome, item.descricao, item.prazo, item.garantia, item.faixa]
    },
    torneios: {
      columns: ['name', 'game', 'event_date', 'event_time', 'location', 'entry_fee', 'prize', 'capacity', 'status', 'champion', 'image_url', 'rules'],
      values: [item.nome, item.jogo, item.data, item.hora, item.local, item.inscricao, item.premiacao, item.vagas, item.status, item.campeao, item.imagem, JSON.stringify(item.regulamento)]
    },
    equipe: { columns: ['name', 'role', 'photo_url', 'bio'], values: [item.nome, item.funcao, item.foto, item.bio] },
    depoimentos: { columns: ['name', 'city', 'body', 'photo_url', 'approved'], values: [item.nome, item.cidade, item.texto, item.foto, item.aprovado] }
  };
  const meta = collectionMeta[name];
  const def = statements[name];
  if (!meta || !def) throw new Error('Coleção desconhecida.');
  if (updateId !== undefined) {
    const setters = def.columns.map((column, i) => `${column} = $${i + 1}`).join(', ');
    return {
      text: `UPDATE ${meta.table} SET ${setters}, updated_at = now() WHERE id = $${def.values.length + 1} RETURNING *`,
      values: [...def.values, updateId]
    };
  }
  if (item.id !== undefined && item.id !== null) {
    def.columns.unshift('id');
    def.values.unshift(item.id);
  }
  const placeholders = def.values.map((_, i) => `$${i + 1}`).join(', ');
  return {
    text: `INSERT INTO ${meta.table} (${def.columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values: def.values
  };
}

async function createCollectionItem(name, item, client = db.getPool()) {
  const statement = collectionStatement(name, item);
  const result = await client.query(statement.text, statement.values);
  return collectionMeta[name].mapper(result.rows[0]);
}

async function updateCollectionItem(name, id, item, client = db.getPool()) {
  const statement = collectionStatement(name, item, id);
  const result = await client.query(statement.text, statement.values);
  return result.rows[0] ? collectionMeta[name].mapper(result.rows[0]) : null;
}

async function deleteCollectionItem(name, id, client = db.getPool()) {
  const meta = collectionMeta[name];
  if (!meta) throw new Error('Coleção desconhecida.');
  const result = await client.query(`DELETE FROM ${meta.table} WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

async function getSetting(key, client = db.getPool()) {
  if (!SETTINGS.includes(key)) throw new Error('Bloco desconhecido.');
  const result = await client.query('SELECT value FROM settings WHERE key = $1', [key]);
  return result.rows[0]?.value || null;
}

async function saveSetting(key, value, client = db.getPool()) {
  if (!SETTINGS.includes(key)) throw new Error('Bloco desconhecido.');
  const result = await client.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now() RETURNING value`,
    [key, JSON.stringify(value)]
  );
  return result.rows[0].value;
}

async function createLead(item, client = db.getPool()) {
  const result = await client.query(
    `INSERT INTO leads
      (type, status, name, phone, device, problem, nickname, tournament_id, tournament_name, created_at)
     VALUES ($1, 'novo', $2, $3, $4, $5, $6, $7, $8, COALESCE($9::timestamptz, now())) RETURNING *`,
    [item.tipo, item.nome, item.telefone, item.aparelho || null, item.problema || null,
      item.nick || null, item.torneioId || null, item.torneioNome || null, item.criadoEm || null]
  );
  await client.query('DELETE FROM leads WHERE id IN (SELECT id FROM leads ORDER BY created_at DESC, id DESC OFFSET 500)');
  return map.lead(result.rows[0]);
}

async function listLeads({ tipo, status } = {}, client = db.getPool()) {
  const clauses = [];
  const values = [];
  if (tipo) { values.push(tipo); clauses.push(`type = $${values.length}`); }
  if (status) { values.push(status); clauses.push(`status = $${values.length}`); }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const result = await client.query(`SELECT * FROM leads${where} ORDER BY created_at DESC, id DESC`, values);
  return result.rows.map(map.lead);
}

async function updateLeadStatus(id, status, client = db.getPool()) {
  const result = await client.query('UPDATE leads SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
  return result.rows[0] ? map.lead(result.rows[0]) : null;
}

async function deleteLead(id, client = db.getPool()) {
  const result = await client.query('DELETE FROM leads WHERE id = $1', [id]);
  return result.rowCount > 0;
}

async function findAdminByEmail(email, client = db.getPool()) {
  const result = await client.query('SELECT * FROM admins WHERE email = $1', [email]);
  return result.rows[0] ? map.usuario(result.rows[0]) : null;
}
async function findAdminById(id, client = db.getPool()) {
  const result = await client.query('SELECT * FROM admins WHERE id = $1', [id]);
  return result.rows[0] ? map.usuario(result.rows[0]) : null;
}
async function listAdmins(client = db.getPool()) {
  const result = await client.query('SELECT * FROM admins ORDER BY id');
  return result.rows.map(map.usuario);
}
async function createAdmin({ email, nome, senhaHash }, client = db.getPool()) {
  const result = await client.query(
    'INSERT INTO admins (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [email, nome, senhaHash]
  );
  return map.usuario(result.rows[0]);
}
async function updateAdminPassword(email, senhaHash, client = db.getPool()) {
  const result = await client.query(
    'UPDATE admins SET password_hash = $1, updated_at = now() WHERE email = $2 RETURNING *', [senhaHash, email]
  );
  return result.rows[0] ? map.usuario(result.rows[0]) : null;
}
async function deleteAdmin(email, client = db.getPool()) {
  const result = await client.query('DELETE FROM admins WHERE email = $1 RETURNING *', [email]);
  return result.rows[0] ? map.usuario(result.rows[0]) : null;
}

async function isEmpty(client = db.getPool()) {
  const result = await client.query(
    `SELECT (SELECT count(*) FROM settings) + (SELECT count(*) FROM products) +
      (SELECT count(*) FROM services) + (SELECT count(*) FROM tournaments) AS total`
  );
  return Number(result.rows[0].total) === 0;
}

async function importSnapshot(snapshot, { requireEmpty = true } = {}) {
  return db.transaction(async (client) => {
    if (requireEmpty && !(await isEmpty(client))) {
      throw new Error('O PostgreSQL já contém conteúdo. A importação foi cancelada para não sobrescrever dados.');
    }
    for (const [index, category] of (snapshot.categorias || []).entries()) {
      await client.query(
        `INSERT INTO categories (slug, name, description, featured, sort_order) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
           featured = EXCLUDED.featured, sort_order = EXCLUDED.sort_order`,
        [category.slug, category.nome, category.descricao || '', Boolean(category.destaque), index]
      );
    }
    for (const [index, brand] of (snapshot.marcas || []).entries()) {
      await client.query(
        `INSERT INTO brands (name, sort_order) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order`, [brand, index]
      );
    }
    for (const key of SETTINGS) if (snapshot[key] !== undefined) await saveSetting(key, snapshot[key], client);
    for (const name of COLLECTIONS) {
      for (const item of snapshot[name] || []) await createCollectionItem(name, item, client);
    }
    for (const lead of snapshot.leads || []) {
      await client.query(
        `INSERT INTO leads
          (id, type, status, name, phone, device, problem, nickname, tournament_id, tournament_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::timestamptz, now()))`,
        [lead.id, lead.tipo, lead.status || 'novo', lead.nome, lead.telefone, lead.aparelho || null,
          lead.problema || null, lead.nick || null, lead.torneioId || null, lead.torneioNome || null,
          lead.criadoEm || null]
      );
    }
    for (const user of snapshot.usuarios || []) {
      await client.query(
        `INSERT INTO admins (id, email, name, password_hash, created_at)
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now())) ON CONFLICT (email) DO NOTHING`,
        [user.id, user.email, user.nome || 'Administrador', user.senhaHash, user.criadoEm || null]
      );
    }
    if (process.env.NODE_ENV !== 'test') {
      for (const table of ['admins', 'categories', 'brands', 'products', 'services', 'tournaments', 'team_members', 'testimonials', 'leads']) {
        await client.query(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), (SELECT COUNT(*) > 0 FROM ${table}))`
        );
      }
    }
  });
}

module.exports = {
  SETTINGS, read, listCollection, findCollectionItem, createCollectionItem, updateCollectionItem,
  deleteCollectionItem, getSetting, saveSetting, createLead, listLeads, updateLeadStatus, deleteLead,
  findAdminByEmail, findAdminById, listAdmins, createAdmin, updateAdminPassword, deleteAdmin,
  isEmpty, importSnapshot
};
