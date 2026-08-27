const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { newDb, DataType } = require('pg-mem');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';

const memory = newDb({ autoCreateForeignKeyIndices: true });
memory.public.registerFunction({ name: 'jsonb_typeof', args: [DataType.jsonb], returns: DataType.text, implementation: (v) => Array.isArray(v) ? 'array' : typeof v });
const adapter = memory.adapters.createPg();
const pool = new adapter.Pool();

const database = require('../src/lib/db');
database.setPoolForTests(pool);
const store = require('../src/lib/store');
const auth = require('../src/lib/auth');
const defaults = require('../src/lib/defaults');
const { app } = require('../src/server');

function withoutIds(snapshot) {
  const copy = structuredClone(snapshot);
  for (const name of ['produtos', 'servicos', 'torneios', 'equipe', 'depoimentos']) {
    for (const item of copy[name] || []) delete item.id;
  }
  return copy;
}

test('fluxos públicos e administrativos preservados na nova infraestrutura', async (t) => {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_initial.sql'), 'utf8');
  memory.public.none(schema);
  await store.importSnapshot(withoutIds(defaults));
  await auth.criarUsuario('admin@gamecell.test', 'SenhaForte123!', 'Admin Teste');

  const agent = request.agent(app);

  await t.test('páginas públicas e vitrine carregam do PostgreSQL', async () => {
    for (const route of ['/', '/vitrine', '/assistencia-tecnica', '/pagamento', '/garantia', '/entrega', '/torneios', '/a-loja']) {
      const response = await request(app).get(route).expect(200);
      assert.match(response.headers['content-type'], /html/);
      assert.match(response.text, /Game &amp; Cell|Game & Cell/);
    }
  });

  await t.test('API do painel bloqueia acesso sem sessão', async () => {
    await request(app).get('/api/admin/dados').expect(401);
  });

  await t.test('login rejeita senha incorreta e cria sessão segura', async () => {
    await agent.post('/api/admin/login').send({ email: 'admin@gamecell.test', senha: 'errada' }).expect(401);
    const login = await agent
      .post('/api/admin/login')
      .send({ email: 'admin@gamecell.test', senha: 'SenhaForte123!' })
      .expect(200);
    assert.equal(login.body.usuario.email, 'admin@gamecell.test');
    const dados = await agent.get('/api/admin/dados').expect(200);
    assert.ok(dados.body.produtos.length > 0);
    assert.equal(dados.body.usuarios, undefined);
  });

  let productId;
  await t.test('cadastro, edição e exclusão de produto funcionam', async () => {
    const created = await agent
      .post('/api/admin/produtos')
      .send({
        nome: 'Produto de teste', categoria: 'celulares', marca: 'Samsung', preco: 999.9,
        parcelas: 10, disponibilidade: 'estoque', destaque: true, ficha: ['128 GB']
      })
      .expect(201);
    productId = created.body.id;
    assert.equal(created.body.preco, 999.9);

    const updated = await agent
      .put(`/api/admin/produtos/${productId}`)
      .send({ ...created.body, nome: 'Produto editado', preco: 899.9 })
      .expect(200);
    assert.equal(updated.body.nome, 'Produto editado');

    const showcase = await request(app).get('/vitrine').expect(200);
    assert.match(showcase.text, /Produto editado/);

    await agent.delete(`/api/admin/produtos/${productId}`).expect(200);
    const products = await agent.get('/api/admin/produtos').expect(200);
    assert.equal(products.body.some((item) => item.id === productId), false);
  });

  await t.test('upload usa o adaptador Cloudinary e devolve URL HTTPS', async () => {
    const uploaded = await agent
      .post('/api/admin/upload')
      .attach('imagem', Buffer.from('imagem-webp-de-teste'), { filename: 'produto.webp', contentType: 'image/webp' })
      .expect(201);
    assert.match(uploaded.body.url, /^https:\/\/res\.cloudinary\.com\//);
    assert.ok(uploaded.body.tamanho > 0);
  });

  await t.test('lead público chega ao painel e pode mudar de status', async () => {
    const lead = await request(app)
      .post('/api/orcamento')
      .send({ aparelho: 'iPhone 13', problema: 'Tela quebrada', nome: 'Cliente Teste', telefone: '(88) 99999-0000' })
      .expect(201);
    await agent.patch(`/api/admin/lista/leads/${lead.body.id}`).send({ status: 'atendido' }).expect(200);
    const leads = await agent.get('/api/admin/lista/leads').expect(200);
    assert.equal(leads.body.find((item) => item.id === lead.body.id).status, 'atendido');
  });

  await t.test('logout invalida o acesso subsequente', async () => {
    await agent.post('/api/admin/logout').expect(200);
    await agent.get('/api/admin/dados').expect(401);
  });
});
