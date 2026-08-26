const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('./store');

const COOKIE = 'gc_sessao';
const EXPIRA = '12h';

function segredo() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 24) {
    throw new Error(
      'JWT_SECRET ausente ou curto demais. Copie .env.example para .env e defina um segredo com 24+ caracteres.'
    );
  }
  return s;
}

async function criarUsuario(email, senha, nome = 'Administrador') {
  const db = store.read();
  const normalizado = String(email).trim().toLowerCase();
  if (db.usuarios.some((u) => u.email === normalizado)) {
    throw new Error('Já existe um usuário com esse e-mail.');
  }
  const usuario = {
    id: store.nextId(db.usuarios),
    email: normalizado,
    nome,
    senhaHash: await bcrypt.hash(String(senha), 12),
    criadoEm: new Date().toISOString()
  };
  store.update((d) => d.usuarios.push(usuario));
  return { id: usuario.id, email: usuario.email, nome: usuario.nome };
}

function listarUsuarios() {
  return store.read().usuarios.map((u) => ({ id: u.id, email: u.email, nome: u.nome, criadoEm: u.criadoEm }));
}

async function redefinirSenha(email, novaSenha) {
  const normalizado = String(email).trim().toLowerCase();
  const hash = await bcrypt.hash(String(novaSenha), 12);
  return store.update((d) => {
    const usuario = d.usuarios.find((u) => u.email === normalizado);
    if (!usuario) return null;
    usuario.senhaHash = hash;
    return { id: usuario.id, email: usuario.email, nome: usuario.nome };
  });
}

function removerUsuario(email) {
  const normalizado = String(email).trim().toLowerCase();
  return store.update((d) => {
    const i = d.usuarios.findIndex((u) => u.email === normalizado);
    return i < 0 ? null : d.usuarios.splice(i, 1)[0];
  });
}

async function autenticar(email, senha) {
  const db = store.read();
  const usuario = db.usuarios.find((u) => u.email === String(email).trim().toLowerCase());
  // Compara mesmo sem usuário para não vazar quais e-mails existem pelo tempo de resposta.
  const hash = usuario ? usuario.senhaHash : '$2a$12$invalidoinvalidoinvalidoinvalidoinvalidoinvalidoinvalid';
  const confere = await bcrypt.compare(String(senha), hash);
  if (!usuario || !confere) return null;

  const token = jwt.sign({ sub: usuario.id, email: usuario.email, nome: usuario.nome }, segredo(), {
    expiresIn: EXPIRA
  });
  return { token, usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome } };
}

/** Registro de autenticação — serve de trilha de auditoria e de diagnóstico. */
function registrar(evento, detalhe) {
  const hora = new Date().toLocaleTimeString('pt-BR');
  console.log(`[auth ${hora}] ${evento}${detalhe ? ' — ' + detalhe : ''}`);
}

/** Bloqueia rotas do painel. Responde 401 em JSON — o front volta para o login. */
function exigirLogin(req, res, next) {
  const token = req.cookies?.[COOKIE];

  if (!token) {
    // Sem cookie: ou nunca logou, ou o navegador recusou/não devolveu o cookie.
    registrar('BLOQUEADO', `${req.method} ${req.originalUrl} — nenhum cookie de sessão foi enviado`);
    return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  }

  try {
    req.usuario = jwt.verify(token, segredo());
    next();
  } catch (err) {
    res.clearCookie(COOKIE);
    registrar('BLOQUEADO', `${req.method} ${req.originalUrl} — cookie presente mas inválido (${err.message})`);
    return res.status(401).json({ erro: 'Sessão inválida. Faça login novamente.' });
  }
}

function definirCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000
  });
}

module.exports = {
  COOKIE,
  criarUsuario,
  listarUsuarios,
  removerUsuario,
  redefinirSenha,
  autenticar,
  exigirLogin,
  registrar,
  definirCookie,
  segredo
};
