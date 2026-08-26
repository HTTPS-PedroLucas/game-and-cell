/** Rotas públicas: envio de orçamento e inscrição em torneio. */
const express = require('express');
const store = require('../lib/store');
const { whatsapp, money } = require('../lib/helpers');

const router = express.Router();

const limite = new Map();

/** Freio simples por IP — evita que o painel encha de lixo. */
function throttle(req, res, next) {
  const ip = req.ip || 'desconhecido';
  const agora = Date.now();
  const registros = (limite.get(ip) || []).filter((t) => agora - t < 60_000);
  if (registros.length >= 5) {
    return res.status(429).json({ erro: 'Muitos envios seguidos. Espere um minuto e tente de novo.' });
  }
  registros.push(agora);
  limite.set(ip, registros);
  next();
}

function texto(valor, max = 500) {
  return String(valor ?? '').trim().slice(0, max);
}

function registrarLead(tipo, dados) {
  return store.update((db) => {
    const lead = {
      id: store.nextId(db.leads),
      tipo,
      ...dados,
      status: 'novo',
      criadoEm: new Date().toISOString()
    };
    db.leads.unshift(lead);
    if (db.leads.length > 500) db.leads.length = 500;
    return lead;
  });
}

/* Orçamento de assistência técnica — o único formulário longo que o briefing aprova. */
router.post('/orcamento', throttle, (req, res) => {
  const aparelho = texto(req.body.aparelho, 120);
  const problema = texto(req.body.problema, 800);
  const nome = texto(req.body.nome, 80);
  const telefone = texto(req.body.telefone, 30);

  const erros = {};
  if (aparelho.length < 2) erros.aparelho = 'Diga qual é o aparelho.';
  if (problema.length < 5) erros.problema = 'Descreva o problema com um pouco mais de detalhe.';
  if (nome.length < 2) erros.nome = 'Informe seu nome.';
  if (telefone.replace(/\D/g, '').length < 10) erros.telefone = 'Informe um WhatsApp com DDD.';
  if (Object.keys(erros).length) return res.status(400).json({ erros });

  const lead = registrarLead('orcamento', { aparelho, problema, nome, telefone });
  const { config } = store.read();

  const mensagem = `Olá, ${config.nome}! Pedi um orçamento pelo site.
Aparelho: ${aparelho}
Problema: ${problema}
Meu nome: ${nome}`;

  res.status(201).json({
    ok: true,
    id: lead.id,
    mensagem: 'Orçamento registrado. Abrindo o WhatsApp...',
    whatsappUrl: whatsapp(config.whatsapp, mensagem)
  });
});

/* Inscrição em torneio */
router.post('/inscricao', throttle, (req, res) => {
  const db = store.read();
  const torneio = db.torneios.find((t) => t.id === Number(req.body.torneioId));

  if (!torneio || torneio.status !== 'aberto') {
    return res.status(400).json({ erro: 'Esse torneio não está com inscrições abertas.' });
  }

  const nome = texto(req.body.nome, 80);
  const telefone = texto(req.body.telefone, 30);
  const nick = texto(req.body.nick, 40);

  const erros = {};
  if (nome.length < 2) erros.insNome = 'Informe seu nome.';
  if (telefone.replace(/\D/g, '').length < 10) erros.insTelefone = 'Informe um WhatsApp com DDD.';
  if (Object.keys(erros).length) return res.status(400).json({ erros });

  const inscritos = db.leads.filter((l) => l.tipo === 'inscricao' && l.torneioId === torneio.id).length;
  const lead = registrarLead('inscricao', {
    torneioId: torneio.id,
    torneioNome: torneio.nome,
    nome,
    telefone,
    nick
  });

  const mensagem = `Olá, ${db.config.nome}! Me inscrevi no ${torneio.nome} (${torneio.jogo}) pelo site.
Nome: ${nome}${nick ? `\nNick: ${nick}` : ''}
Inscrição: ${torneio.inscricao}`;

  res.status(201).json({
    ok: true,
    id: lead.id,
    vagasRestantes: Math.max(0, torneio.vagas - inscritos - 1),
    mensagem: 'Inscrição registrada! Confirme o pagamento no WhatsApp para garantir a vaga.',
    whatsappUrl: whatsapp(db.config.whatsapp, mensagem)
  });
});

module.exports = router;
