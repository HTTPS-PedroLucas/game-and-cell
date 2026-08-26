require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const store = require('./lib/store');
const { home } = require('./views/home');
const { vitrine } = require('./views/vitrine');
const { assistencia } = require('./views/assistencia');
const { torneiosPagina } = require('./views/torneios');
const { pagamentoPagina, garantiaPagina, entregaPagina, lojaPagina } = require('./views/institucionais');
const { paginaAdmin } = require('./views/admin');
const { layout } = require('./views/layout');

const publico = require('./routes/publico');
const admin = require('./routes/admin');

const app = express();
const PORTA = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(cookieParser());

/* Registro de requisições do painel — mostra exatamente o que o navegador envia. */
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && req.path !== '/admin') return next();
  const inicio = Date.now();
  res.on('finish', () => {
    const query = Object.keys(req.query).length ? ` ?${Object.keys(req.query).join(',')}` : '';
    const cookie = req.headers.cookie ? 'com cookie' : 'sem cookie';
    console.log(
      `[req ${new Date().toLocaleTimeString('pt-BR')}] ${req.method} ${req.path}${query} ` +
        `-> ${res.statusCode} (${cookie}, ${Date.now() - inicio}ms)`
    );
  });
  next();
});

/* Cabeçalhos de segurança básicos, sem dependência extra. */
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    etag: true
  })
);

const html = (res, markup) => res.type('html').send(markup);

/* ------------------------------------------------------------------ */
/* Páginas públicas                                                    */
/* ------------------------------------------------------------------ */
app.get('/', (_req, res) => html(res, home(store.read())));

app.get('/vitrine', (req, res) =>
  html(
    res,
    vitrine(store.read(), {
      categoria: String(req.query.categoria || ''),
      marca: String(req.query.marca || '')
    })
  )
);

app.get('/assistencia-tecnica', (_req, res) => html(res, assistencia(store.read())));
app.get('/pagamento', (_req, res) => html(res, pagamentoPagina(store.read())));
app.get('/garantia', (_req, res) => html(res, garantiaPagina(store.read())));
app.get('/entrega', (_req, res) => html(res, entregaPagina(store.read())));
app.get('/a-loja', (_req, res) => html(res, lojaPagina(store.read())));
app.get('/torneios', (_req, res) => html(res, torneiosPagina(store.read())));

/* Painel — página única, protegida pela API. noindex por cabeçalho e meta. */
app.get('/admin', (_req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  html(res, paginaAdmin(store.read().config));
});

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */
app.use('/api', publico);
app.use('/api/admin', admin);

/* ------------------------------------------------------------------ */
/* SEO                                                                 */
/* ------------------------------------------------------------------ */
function baseUrl(req) {
  return process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
}

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: ${baseUrl(req)}/sitemap.xml
`);
});

app.get('/sitemap.xml', (req, res) => {
  const db = store.read();
  const base = baseUrl(req);
  const rotas = [
    { url: '/', prioridade: '1.0' },
    { url: '/vitrine', prioridade: '0.9' },
    { url: '/assistencia-tecnica', prioridade: '0.9' },
    { url: '/pagamento', prioridade: '0.7' },
    { url: '/garantia', prioridade: '0.7' },
    { url: '/entrega', prioridade: '0.7' },
    { url: '/torneios', prioridade: '0.8' },
    { url: '/a-loja', prioridade: '0.6' },
    ...db.categorias.map((c) => ({ url: `/vitrine?categoria=${c.slug}`, prioridade: '0.8' }))
  ];

  const hoje = new Date().toISOString().slice(0, 10);
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rotas
  .map(
    (r) =>
      `  <url><loc>${base}${r.url.replace(/&/g, '&amp;')}</loc><lastmod>${hoje}</lastmod><priority>${
        r.prioridade
      }</priority></url>`
  )
  .join('\n')}
</urlset>`);
});

/* ------------------------------------------------------------------ */
/* 404 e erros                                                         */
/* ------------------------------------------------------------------ */
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ erro: 'Rota não encontrada.' });
  }
  const { config } = store.read();
  res.status(404).type('html').send(
    layout({
      titulo: `Página não encontrada | ${config.nome}`,
      descricao: 'A página que você procurou não existe.',
      config,
      horarios: config.horarios,
      conteudo: `<section class="secao"><div class="container">
        <p class="rotulo">Erro 404</p>
        <h1>Essa página a gente não tem</h1>
        <p class="lead">Mas o produto que você procura talvez esteja na vitrine.</p>
        <div class="hero__acoes" style="margin-top:var(--s-6)">
          <a class="btn btn--primario" href="/vitrine">Ver a vitrine</a>
          <a class="btn btn--contorno" href="/">Voltar ao início</a>
        </div>
      </div></section>`
    })
  );
});

app.use((err, req, res, _next) => {
  console.error('[erro]', err.message);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ erro: 'Erro interno. Tente de novo em instantes.' });
  }
  res.status(500).type('html').send('<h1>Erro interno</h1><p><a href="/">Voltar ao início</a></p>');
});

app.listen(PORTA, () => {
  const db = store.read();
  console.log(`\n  ${db.config.nome} — site no ar`);
  console.log(`  Site .......... http://localhost:${PORTA}`);
  console.log(`  Painel ........ http://localhost:${PORTA}/admin`);
  if (!db.usuarios.length) {
    console.log(`\n  Nenhum administrador cadastrado ainda. Rode:  npm run seed\n`);
  } else {
    console.log('');
  }
});
