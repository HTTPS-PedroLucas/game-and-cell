/** API do painel administrativo. Tudo aqui exige sessão, menos login e logout. */
const express = require('express');
const multer = require('multer');
const store = require('../lib/store');
const { autenticar, exigirLogin, definirCookie, limparCookie, registrar } = require('../lib/auth');
const { uploadBuffer } = require('../lib/cloudinary');
const { slugify } = require('../lib/helpers');

const router = express.Router();

/* ------------------------------------------------------------------ */
/* Upload de imagem                                                    */
/* ------------------------------------------------------------------ */
const TIPOS_OK = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

const upload = multer({
  storage: multer.memoryStorage(),
  // O navegador já reduz e converte para WebP antes de enviar (ver public/js/admin.js),
  // então 3MB aqui é folga de sobra e protege contra envio direto pela API.
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_OK.has(file.mimetype)) {
      return cb(new Error('Formato não aceito. Use JPG, PNG, WebP ou AVIF.'));
    }
    cb(null, true);
  }
});

/* ------------------------------------------------------------------ */
/* Sessão                                                              */
/* ------------------------------------------------------------------ */
const tentativas = new Map();

router.post('/login', async (req, res) => {
  const ip = req.ip || 'desconhecido';
  const agora = Date.now();
  const recentes = (tentativas.get(ip) || []).filter((t) => agora - t < 15 * 60_000);
  if (recentes.length >= 8) {
    registrar('LOGIN 429', `${ip} — bloqueado por excesso de tentativas`);
    return res.status(429).json({ erro: 'Muitas tentativas. Espere 15 minutos.' });
  }

  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ erro: 'Informe e-mail e senha.' });

  const sessao = await autenticar(email, senha);
  if (!sessao) {
    recentes.push(agora);
    tentativas.set(ip, recentes);
    registrar('LOGIN NEGADO', `${email} — tentativa ${recentes.length} de 8`);
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }

  tentativas.delete(ip);
  definirCookie(req, res, sessao.token);
  registrar('LOGIN OK', sessao.usuario.email);
  res.json({ ok: true, usuario: sessao.usuario });
});

router.post('/logout', (req, res) => {
  limparCookie(req, res);
  res.json({ ok: true });
});

router.get('/me', exigirLogin, (req, res) => {
  res.json({ usuario: { nome: req.usuario.nome, email: req.usuario.email } });
});

router.use(exigirLogin);

/* ------------------------------------------------------------------ */
/* Leitura geral                                                       */
/* ------------------------------------------------------------------ */
router.get('/dados', async (_req, res) => {
  const { usuarios, ...resto } = await store.read({ includeLeads: true });
  res.json(resto);
});

/* ------------------------------------------------------------------ */
/* Coleções com CRUD                                                   */
/* ------------------------------------------------------------------ */
const num = (v, padrao = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : padrao;
};
const txt = (v, max = 400) => String(v ?? '').trim().slice(0, max);
const lista = (v, max = 12) =>
  (Array.isArray(v) ? v : String(v ?? '').split('\n'))
    .map((i) => txt(i, 200))
    .filter(Boolean)
    .slice(0, max);

const COLECOES = {
  produtos: {
    sanitizar: (b, db, atual) => ({
      nome: txt(b.nome, 120),
      slug: slugify(b.slug || b.nome),
      categoria: db.categorias.some((c) => c.slug === b.categoria) ? b.categoria : db.categorias[0].slug,
      marca: db.marcas.includes(b.marca) ? b.marca : 'Outras',
      preco: Math.max(0, num(b.preco)),
      precoAntigo: b.precoAntigo ? Math.max(0, num(b.precoAntigo)) : null,
      parcelas: Math.min(24, Math.max(1, num(b.parcelas, 1))),
      disponibilidade: b.disponibilidade === 'encomenda' ? 'encomenda' : 'estoque',
      destaque: Boolean(b.destaque),
      imagem: txt(b.imagem, 300) || (atual ? atual.imagem : ''),
      descricao: txt(b.descricao, 600),
      ficha: lista(b.ficha, 8)
    }),
    validar: (item) => {
      if (item.nome.length < 2) return 'O produto precisa de um nome.';
      if (item.preco <= 0) return 'Informe o preço. "Consulte valores" é o maior ponto de abandono do site.';
      return null;
    }
  },

  servicos: {
    sanitizar: (b) => ({
      nome: txt(b.nome, 80),
      descricao: txt(b.descricao, 600),
      prazo: txt(b.prazo, 60),
      garantia: txt(b.garantia, 60),
      faixa: txt(b.faixa, 60)
    }),
    validar: (item) => {
      if (item.nome.length < 2) return 'O serviço precisa de um nome.';
      if (!item.faixa) return 'Informe a faixa de preço, mesmo que seja "a partir de".';
      if (!item.prazo) return 'Informe o prazo médio do reparo.';
      if (!item.garantia) return 'Informe a garantia do serviço, em dias.';
      return null;
    }
  },

  torneios: {
    sanitizar: (b, _db, atual) => ({
      nome: txt(b.nome, 100),
      jogo: txt(b.jogo, 60),
      data: /^\d{4}-\d{2}-\d{2}$/.test(b.data) ? b.data : '',
      hora: txt(b.hora, 20),
      local: txt(b.local, 160),
      inscricao: txt(b.inscricao, 80),
      premiacao: txt(b.premiacao, 300),
      vagas: Math.max(0, num(b.vagas, 0)),
      status: ['aberto', 'encerrado', 'rascunho'].includes(b.status) ? b.status : 'rascunho',
      campeao: txt(b.campeao, 80),
      imagem: txt(b.imagem, 300) || (atual ? atual.imagem : ''),
      regulamento: lista(b.regulamento, 15)
    }),
    validar: (item) => {
      if (item.nome.length < 2) return 'O torneio precisa de um nome.';
      if (!item.data) return 'Informe a data no formato dia/mês/ano.';
      if (item.status === 'aberto' && !item.inscricao) {
        return 'Torneio com inscrição aberta precisa do valor da inscrição.';
      }
      return null;
    }
  },

  equipe: {
    sanitizar: (b, _db, atual) => ({
      nome: txt(b.nome, 80),
      funcao: txt(b.funcao, 80),
      foto: txt(b.foto, 300) || (atual ? atual.foto : ''),
      bio: txt(b.bio, 400)
    }),
    validar: (item) => (item.nome.length < 2 ? 'Informe o nome da pessoa.' : null)
  },

  depoimentos: {
    sanitizar: (b, _db, atual) => ({
      nome: txt(b.nome, 80),
      cidade: txt(b.cidade, 80),
      texto: txt(b.texto, 500),
      foto: txt(b.foto, 300) || (atual ? atual.foto : ''),
      aprovado: Boolean(b.aprovado)
    }),
    validar: (item) => {
      if (item.nome.length < 2) return 'Informe o nome de quem deu o depoimento.';
      if (item.texto.length < 10) return 'O depoimento está curto demais.';
      return null;
    }
  }
};

router.get('/:colecao', async (req, res, next) => {
  const cfg = COLECOES[req.params.colecao];
  if (!cfg) return next();
  res.json(await store.listCollection(req.params.colecao));
});

router.post('/:colecao', async (req, res, next) => {
  const nome = req.params.colecao;
  const cfg = COLECOES[nome];
  if (!cfg) return next();

  const db = await store.read();
  const item = cfg.sanitizar(req.body || {}, db, null);
  const erro = cfg.validar(item);
  if (erro) return res.status(400).json({ erro });

  const criado = await store.createCollectionItem(nome, item);
  res.status(201).json(criado);
});

router.put('/:colecao/:id', async (req, res, next) => {
  const nome = req.params.colecao;
  const cfg = COLECOES[nome];
  if (!cfg) return next();

  const db = await store.read();
  const id = Number(req.params.id);
  const atual = db[nome].find((i) => i.id === id);
  if (!atual) return res.status(404).json({ erro: 'Item não encontrado.' });

  const item = cfg.sanitizar(req.body || {}, db, atual);
  const erro = cfg.validar(item);
  if (erro) return res.status(400).json({ erro });

  const salvo = await store.updateCollectionItem(nome, id, item);
  res.json(salvo);
});

router.delete('/:colecao/:id', async (req, res, next) => {
  const nome = req.params.colecao;
  if (!COLECOES[nome]) return next();

  const id = Number(req.params.id);
  const removido = await store.deleteCollectionItem(nome, id);
  if (!removido) return res.status(404).json({ erro: 'Item não encontrado.' });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Blocos de configuração (objetos, não listas)                        */
/* ------------------------------------------------------------------ */
const BLOCOS = {
  config: (b, atual) => ({
    ...atual,
    nome: txt(b.nome, 60) || atual.nome,
    propostaValor: txt(b.propostaValor, 200) || atual.propostaValor,
    subtitulo: txt(b.subtitulo, 300),
    whatsapp: txt(b.whatsapp, 20).replace(/\D/g, '') || atual.whatsapp,
    whatsappExibicao: txt(b.whatsappExibicao, 30) || atual.whatsappExibicao,
    instagram: txt(b.instagram, 40).replace(/^@/, '') || atual.instagram,
    endereco: txt(b.endereco, 120) || atual.endereco,
    bairro: txt(b.bairro, 60) || atual.bairro,
    cidade: txt(b.cidade, 60) || atual.cidade,
    estado: txt(b.estado, 2).toUpperCase() || atual.estado,
    cep: txt(b.cep, 12),
    mapsQuery: txt(b.mapsQuery, 200) || atual.mapsQuery,
    horarios: (Array.isArray(b.horarios) ? b.horarios : atual.horarios)
      .slice(0, 8)
      .map((h) => ({ dia: txt(h.dia, 40), hora: txt(h.hora, 40) }))
      .filter((h) => h.dia)
  }),

  pagamento: (b, atual) => ({
    ...atual,
    resumo: txt(b.resumo, 300) || atual.resumo,
    maxParcelas: Math.min(24, Math.max(1, num(b.maxParcelas, atual.maxParcelas))),
    parcelasSemJuros: Math.max(0, num(b.parcelasSemJuros, atual.parcelasSemJuros)),
    jurosMes: Math.max(0, num(b.jurosMes, atual.jurosMes)),
    formas: (Array.isArray(b.formas) ? b.formas : atual.formas)
      .slice(0, 8)
      .map((f) => ({ nome: txt(f.nome, 40), detalhe: txt(f.detalhe, 160) }))
      .filter((f) => f.nome),
    carne: { disponivel: Boolean(b.carne?.disponivel), texto: txt(b.carne?.texto, 300) || atual.carne.texto },
    aceitaUsado: {
      disponivel: Boolean(b.aceitaUsado?.disponivel),
      texto: txt(b.aceitaUsado?.texto, 300) || atual.aceitaUsado.texto
    },
    documentos: lista(b.documentos, 8).length ? lista(b.documentos, 8) : atual.documentos
  }),

  garantia: (b, atual) => ({
    ...atual,
    resumo: txt(b.resumo, 300) || atual.resumo,
    politicaTroca: txt(b.politicaTroca, 800) || atual.politicaTroca,
    itens: (Array.isArray(b.itens) ? b.itens : atual.itens)
      .slice(0, 10)
      .map((i) => ({ categoria: txt(i.categoria, 80), prazo: txt(i.prazo, 80), detalhe: txt(i.detalhe, 300) }))
      .filter((i) => i.categoria),
    comoAcionar: lista(b.comoAcionar, 8).length ? lista(b.comoAcionar, 8) : atual.comoAcionar
  }),

  entrega: (b, atual) => ({
    ...atual,
    resumo: txt(b.resumo, 300) || atual.resumo,
    local: {
      prazo: txt(b.local?.prazo, 120) || atual.local.prazo,
      taxa: txt(b.local?.taxa, 120) || atual.local.taxa,
      bairros: lista(b.local?.bairros, 24).length ? lista(b.local?.bairros, 24) : atual.local.bairros
    },
    cidades: lista(b.cidades, 24).length ? lista(b.cidades, 24) : atual.cidades,
    cidadesTexto: txt(b.cidadesTexto, 400) || atual.cidadesTexto,
    retirada: txt(b.retirada, 300) || atual.retirada
  }),

  assistenciaInfo: (b, atual) => ({
    chamada: txt(b.chamada, 100) || atual.chamada,
    texto: txt(b.texto, 600) || atual.texto,
    diferenciais: lista(b.diferenciais, 8).length ? lista(b.diferenciais, 8) : atual.diferenciais
  }),

  sobreLoja: (b, atual) => ({
    titulo: txt(b.titulo, 100) || atual.titulo,
    texto: txt(b.texto, 1200) || atual.texto,
    fotos: (Array.isArray(b.fotos) ? b.fotos : atual.fotos).map((f) => txt(f, 300)).filter(Boolean).slice(0, 12)
  })
};

router.put('/bloco/:nome', async (req, res) => {
  const nome = req.params.nome;
  const transformar = BLOCOS[nome];
  if (!transformar) return res.status(404).json({ erro: 'Bloco desconhecido.' });

  const atual = await store.getSetting(nome);
  if (!atual) return res.status(404).json({ erro: 'Bloco ainda não foi configurado.' });
  const salvo = await store.saveSetting(nome, transformar(req.body || {}, atual));
  res.json(salvo);
});

/* ------------------------------------------------------------------ */
/* Leads                                                               */
/* ------------------------------------------------------------------ */
router.get('/lista/leads', async (req, res) => {
  const { tipo, status } = req.query;
  const leads = await store.listLeads({ tipo, status });
  res.json(leads);
});

router.patch('/lista/leads/:id', async (req, res) => {
  const id = Number(req.params.id);
  const status = ['novo', 'atendido', 'perdido'].includes(req.body.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ erro: 'Status inválido.' });

  const lead = await store.updateLeadStatus(id, status);
  if (!lead) return res.status(404).json({ erro: 'Lead não encontrado.' });
  res.json(lead);
});

router.delete('/lista/leads/:id', async (req, res) => {
  const id = Number(req.params.id);
  const removido = await store.deleteLead(id);
  if (!removido) return res.status(404).json({ erro: 'Lead não encontrado.' });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Upload                                                              */
/* ------------------------------------------------------------------ */
router.post('/upload', (req, res, next) => {
  upload.single('imagem')(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Imagem grande demais mesmo depois da compressão. Tente uma foto menor.'
          : err.message;
      return res.status(400).json({ erro: msg });
    }
    if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem recebida.' });
    try {
      const nome = slugify(req.file.originalname.replace(/\.[^.]+$/, '')) || 'imagem';
      const resultado = await uploadBuffer(req.file.buffer, { nome });
      res.status(201).json(resultado);
    } catch (uploadError) {
      next(uploadError);
    }
  });
});

module.exports = router;
