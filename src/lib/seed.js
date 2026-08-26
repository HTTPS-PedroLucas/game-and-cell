#!/usr/bin/env node
/**
 * Gerencia os administradores do painel.
 *
 *   npm run seed                             cria um admin perguntando no terminal
 *   npm run seed -- --listar                 mostra quem já tem acesso
 *   npm run seed -- --senha <email>          troca a senha de quem já existe
 *   npm run seed -- --remover <email>        tira o acesso de alguém
 *
 * Sem terminal (deploy, CI, script), passe por variável de ambiente:
 *
 *   ADMIN_EMAIL=voce@loja.com ADMIN_SENHA=... npm run seed
 */
require('dotenv').config();

const readline = require('readline');
const store = require('./store');
const { criarUsuario, listarUsuarios, removerUsuario, redefinirSenha } = require('./auth');

const args = process.argv.slice(2);
const opcao = (nome) => {
  const i = args.indexOf(`--${nome}`);
  return i < 0 ? null : args[i + 1] ?? true;
};

const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ------------------------------------------------------------------ */
/* Entrada pelo terminal                                               */
/* ------------------------------------------------------------------ */
function criarLeitor() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

const pergunta = (rl, texto) => new Promise((resolve) => rl.question(texto, (r) => resolve(r.trim())));

/**
 * Lê a senha mostrando asteriscos no lugar dos caracteres.
 * Senha totalmente invisível faz o usuário digitar às cegas e errar sem perceber —
 * o asterisco dá o retorno visual sem expor a senha na tela.
 */
function perguntaSenha(rl, texto) {
  return new Promise((resolve) => {
    let mascarar = false;
    let digitados = 0;

    const escreverOriginal = rl._writeToOutput.bind(rl);
    rl._writeToOutput = (str) => {
      if (!mascarar) return escreverOriginal(str);
      // readline redesenha a linha inteira a cada tecla; reconstruímos com asteriscos
      const linha = rl.line || '';
      if (linha.length !== digitados) digitados = linha.length;
      rl.output.write(`\r${texto}${'*'.repeat(digitados)}[K`);
    };

    rl.question(texto, (resposta) => {
      rl._writeToOutput = escreverOriginal;
      rl.output.write('\n');
      resolve(resposta);
    });
    mascarar = true;
  });
}

/* ------------------------------------------------------------------ */
/* Ações                                                               */
/* ------------------------------------------------------------------ */
function mostrarLista() {
  const usuarios = listarUsuarios();
  if (!usuarios.length) {
    console.log('\n  Nenhum administrador cadastrado. Rode `npm run seed` para criar o primeiro.\n');
    return;
  }
  console.log(`\n  ${usuarios.length} administrador(es) com acesso ao painel:\n`);
  usuarios.forEach((u) => {
    const data = new Date(u.criadoEm).toLocaleDateString('pt-BR');
    console.log(`    ${u.email.padEnd(32)} ${u.nome.padEnd(20)} criado em ${data}`);
  });
  console.log('');
}

function remover(email) {
  if (typeof email !== 'string' || !email) {
    throw new Error('Informe o e-mail: npm run seed -- --remover alguem@loja.com');
  }
  if (listarUsuarios().length <= 1) {
    throw new Error('Esse é o único administrador. Crie outro antes de remover este, ou você perde o acesso ao painel.');
  }
  const removido = removerUsuario(email);
  if (!removido) throw new Error(`Não achei nenhum administrador com o e-mail ${email}.`);
  console.log(`\n  ${removido.email} não tem mais acesso ao painel.\n`);
}

async function trocarSenha(rl, email) {
  if (typeof email !== 'string' || !email) {
    throw new Error('Informe o e-mail: npm run seed -- --senha voce@loja.com');
  }
  if (!listarUsuarios().some((u) => u.email === email.trim().toLowerCase())) {
    throw new Error(`Não achei nenhum administrador com o e-mail ${email}. Veja a lista com: npm run seed -- --listar`);
  }

  console.log(`\n  Nova senha para ${email}`);
  console.log('  (aparece como asteriscos enquanto você digita)\n');

  const senha = await perguntaSenha(rl, '  Nova senha .... ');
  if (senha.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');

  const repetir = await perguntaSenha(rl, '  Repita ........ ');
  if (senha !== repetir) throw new Error('As senhas não conferem. Nada foi alterado.');

  const usuario = await redefinirSenha(email, senha);
  console.log(`\n  Senha de ${usuario.email} atualizada. Já dá para entrar em /admin.\n`);
}

async function criar({ email, senha, nome }) {
  if (!EMAIL_VALIDO.test(email)) throw new Error('E-mail inválido.');
  if (senha.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');

  const usuario = await criarUsuario(email, senha, nome || 'Administrador');
  console.log(`\n  Pronto. ${usuario.email} já pode entrar em /admin.\n`);
}

/* ------------------------------------------------------------------ */
/* Fluxo                                                               */
/* ------------------------------------------------------------------ */
(async () => {
  let rl = null;

  try {
    if (opcao('listar')) return mostrarLista();
    if (opcao('remover') !== null) return remover(opcao('remover'));

    if (opcao('senha') !== null) {
      if (!process.stdin.isTTY) {
        throw new Error('Trocar senha precisa de um terminal. Rode este comando direto no seu PowerShell.');
      }
      rl = criarLeitor();
      return await trocarSenha(rl, opcao('senha'));
    }

    console.log('\n  Game & Cell — criar administrador do painel');

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
      console.log('\n  Atenção: JWT_SECRET ausente ou curto no .env.');
      console.log('  O usuário é criado, mas o login só funciona depois de definir o segredo.');
    }

    // Modo sem terminal: credenciais vêm do ambiente.
    const emailEnv = process.env.ADMIN_EMAIL;
    const senhaEnv = process.env.ADMIN_SENHA;

    if (emailEnv && senhaEnv) {
      const db = store.read();
      if (db.usuarios.some((u) => u.email === emailEnv.trim().toLowerCase())) {
        console.log(`\n  ${emailEnv} já tem acesso. Nada a fazer.\n`);
        return;
      }
      return await criar({ email: emailEnv.trim(), senha: senhaEnv, nome: process.env.ADMIN_NOME });
    }

    if (!process.stdin.isTTY) {
      console.log('\n  Este comando pergunta e-mail e senha no terminal, e aqui não há um.');
      console.log('  Rode `npm run seed` direto no seu terminal, ou passe por variável de ambiente:\n');
      console.log('    ADMIN_EMAIL=voce@loja.com ADMIN_SENHA=suaSenhaForte npm run seed\n');
      process.exitCode = 1;
      return;
    }

    rl = criarLeitor();
    const db = store.read();

    if (db.usuarios.length) {
      console.log(`\n  Já existe ${db.usuarios.length} administrador(es):`);
      db.usuarios.forEach((u) => console.log(`    - ${u.email}`));
      const seguir = await pergunta(rl, '\n  Criar mais um assim mesmo? (s/N) ');
      if (!/^s/i.test(seguir)) {
        console.log('  Cancelado.\n');
        return;
      }
    }

    console.log('\n  (a senha aparece como asteriscos enquanto você digita)\n');
    const nome = await pergunta(rl, '  Nome .......... ');
    const email = await pergunta(rl, '  E-mail ........ ');
    const senha = await perguntaSenha(rl, '  Senha ......... ');
    const repetir = await perguntaSenha(rl, '  Repita a senha  ');

    if (senha !== repetir) throw new Error('As senhas não conferem.');

    await criar({ email, senha, nome });
  } catch (err) {
    console.error(`\n  Erro: ${err.message}\n`);
    process.exitCode = 1;
  } finally {
    if (rl) rl.close();
  }
})();
