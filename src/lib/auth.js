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
  const normalizado = String(email).trim().toLowerCase();
  if (await store.findAdminByEmail(normalizado)) {
    throw new Error('Já existe um usuário com esse e-mail.');
  }
  const usuario = await store.createAdmin({
    email: normalizado,
    nome,
    senhaHash: await bcrypt.hash(String(senha), 12)
  });
  return { id: usuario.id, email: usuario.email, nome: usuario.nome };
}

async function listarUsuarios() {
  return (await store.listAdmins()).map((u) => ({ id: u.id, email: u.email, nome: u.nome, criadoEm: u.criadoEm }));
}

async function redefinirSenha(email, novaSenha) {
  const normalizado = String(email).trim().toLowerCase();
  const hash = await bcrypt.hash(String(novaSenha), 12);
  const usuario = await store.updateAdminPassword(normalizado, hash);
  return usuario ? { id: usuario.id, email: usuario.email, nome: usuario.nome } : null;
}

async function removerUsuario(email) {
  const normalizado = String(email).trim().toLowerCase();
  return store.deleteAdmin(normalizado);
}

async function autenticar(email, senha) {
  const usuario = await store.findAdminByEmail(String(email).trim().toLowerCase());
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
async function exigirLogin(req, res, next) {
  const token = req.cookies?.[COOKIE];

  if (!token) {
    // Sem cookie: ou nunca logou, ou o navegador recusou/não devolveu o cookie.
    registrar('BLOQUEADO', `${req.method} ${req.originalUrl} — nenhum cookie de sessão foi enviado`);
    return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  }

  try {
    req.usuario = jwt.verify(token, segredo());
  } catch (err) {
    limparCookie(req, res);
    registrar('BLOQUEADO', `${req.method} ${req.originalUrl} — cookie presente mas inválido (${err.message})`);
    return res.status(401).json({ erro: 'Sessão inválida. Faça login novamente.' });
  }

  const usuarioAtual = await store.findAdminById(req.usuario.sub);
  if (!usuarioAtual) {
    limparCookie(req, res);
    return res.status(401).json({ erro: 'Este administrador não tem mais acesso.' });
  }
  next();
}

function opcoesCookie(req) {
  const protocoloEncaminhado = String(req.get('x-forwarded-proto') || '')
    .split(',')[0]
    .trim()
    .toLowerCase();

  return {
    httpOnly: true,
    sameSite: 'lax',
    // O protocolo real decide o atributo Secure. Assim HTTPS continua protegido,
    // enquanto localhost e previews HTTP não perdem o cookie logo após o login.
    secure: Boolean(req.secure || protocoloEncaminhado === 'https'),
    path: '/'
  };
}

function definirCookie(req, res, token) {
  const opcoes = opcoesCookie(req);
  res.cookie(COOKIE, token, {
    ...opcoes,
    maxAge: 12 * 60 * 60 * 1000
  });
  return opcoes.secure;
}

function limparCookie(req, res) {
  res.clearCookie(COOKIE, opcoesCookie(req));
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
  limparCookie,
  segredo
};
